<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Novel;
use App\Models\Review;
use App\Models\ReviewLike;
use App\Services\NotificationService;
use App\Services\ProfanityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ReviewController extends Controller
{
    public function index(Request $request)
    {
        $page = max(1, (int) $request->query('page', 1));
        $limit = max(1, (int) $request->query('limit', 20));
        $novelId = $request->query('novel_id', '');
        $userId = $request->query('user_id', '');
        $sort = $request->query('sort', 'latest');

        $user = $request->user();

        $query = Review::query()
            ->from('reviews as r')
            ->join('users as u', 'r.user_id', '=', 'u.id')
            ->join('novels as n', 'r.novel_id', '=', 'n.id');

        if (!empty($novelId)) {
            $query->where('r.novel_id', $novelId);
        }

        if (!empty($userId)) {
            $query->where('r.user_id', $userId);
        }

        $total = $query->count();

        $orderSql = match ($sort) {
            'highest' => 'r.rating DESC, r.created_at DESC',
            'lowest' => 'r.rating ASC, r.created_at DESC',
            'helpful' => 'r.likes_count DESC, r.created_at DESC',
            default => 'r.created_at DESC',
        };

        $userLikeSubquery = $user
            ? '(SELECT COUNT(*) > 0 FROM review_likes rl WHERE rl.review_id = r.id AND rl.user_id = ' . DB::getPdo()->quote($user->id) . ')'
            : '0';

        $reviews = $query->select([
            'r.*',
            'u.username',
            'u.display_name',
            'u.avatar_url',
            'n.title as novel_title',
            'n.slug as novel_slug',
            'n.cover_url as novel_cover_url',
            DB::raw("{$userLikeSubquery} as liked")
        ])
        ->orderByRaw($orderSql)
        ->offset(($page - 1) * $limit)
        ->limit($limit)
        ->get();

        $reviews->transform(function ($r) {
            $r->rating = (int) $r->rating;
            $r->likes_count = (int) $r->likes_count;
            $r->comments_count = (int) $r->comments_count;
            $r->liked = (bool) $r->liked;
            return $r;
        });

        return response()->json([
            'reviews' => $reviews,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'totalPages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    public function byNovel(Request $request, $novelId)
    {
        $novel = Novel::find($novelId);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $request->merge(['novel_id' => $novelId]);
        return $this->index($request);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();

        $userLikeSubquery = $user
            ? '(SELECT COUNT(*) > 0 FROM review_likes rl WHERE rl.review_id = r.id AND rl.user_id = ' . DB::getPdo()->quote($user->id) . ')'
            : '0';

        $review = DB::selectOne("
            SELECT r.*, u.username, u.display_name, u.avatar_url,
                   n.title as novel_title, n.slug as novel_slug, n.cover_url as novel_cover_url,
                   {$userLikeSubquery} as liked
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            JOIN novels n ON r.novel_id = n.id
            WHERE r.id = ?
        ", [$id]);

        if (!$review) {
            return response()->json(['error' => 'Review not found'], 404);
        }

        $review->rating = (int) $review->rating;
        $review->likes_count = (int) $review->likes_count;
        $review->comments_count = (int) $review->comments_count;
        $review->liked = (bool) $review->liked;

        return response()->json(['review' => $review]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'novel_id' => 'required|string',
            'user_id' => 'required|string',
            'rating' => 'required|integer|min:1|max:5',
            'title' => 'required|string',
            'content' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => collect($validator->errors()->all())->map(fn ($msg) => ['msg' => $msg]),
            ], 400);
        }

        $user = $request->user();
        if ($user->id !== $request->user_id && $user->role !== 'admin') {
            return response()->json(['error' => 'Can only create a review for yourself'], 403);
        }

        $novel = Novel::find($request->novel_id);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $existing = Review::where('novel_id', $novel->id)->where('user_id', $user->id)->first();
        if ($existing) {
            return response()->json(['error' => 'You have already reviewed this novel'], 409);
        }

        if (ProfanityService::containsProfanity($request->title) || ProfanityService::containsProfanity($request->content)) {
            return response()->json(['error' => 'Ulasan mengandung kata-kata yang tidak pantas (Profanity).'], 400);
        }

        $cleanTitle = trim(strip_tags($request->title));
        $cleanContent = trim(strip_tags($request->content));

        if (empty($cleanTitle) || empty($cleanContent)) {
            return response()->json(['error' => 'Review title and content are required'], 400);
        }

        $reviewId = (string) Str::uuid();
        $review = Review::create([
            'id' => $reviewId,
            'novel_id' => $novel->id,
            'user_id' => $user->id,
            'rating' => (int) $request->rating,
            'title' => $cleanTitle,
            'content' => $cleanContent,
            'likes_count' => 0,
            'comments_count' => 0,
        ]);

        NotificationService::notifyNovelReview(
            $novel->author_id,
            $user,
            $novel,
            (int) $request->rating
        );

        $freshNovel = DB::selectOne('
            SELECT 
              COALESCE(AVG(r.rating), 0) AS average_rating,
              COUNT(r.id) AS rating_count,
              (SELECT COALESCE(SUM(cv.view_count), 0) FROM chapter_views cv WHERE cv.chapter_id IN (SELECT c.id FROM chapters c WHERE c.novel_id = ?)) AS total_views
            FROM reviews r
            WHERE r.novel_id = ?
        ', [$novel->id, $novel->id]);

        $createdReview = $this->fetchReviewDetails($reviewId, $user->id);

        return response()->json([
            'message' => 'Review created',
            'review' => $createdReview,
            'novelStats' => [
                'average_rating' => round((float) ($freshNovel->average_rating ?? 0), 2),
                'rating_count' => (int) ($freshNovel->rating_count ?? 0),
                'total_views' => (int) ($freshNovel->total_views ?? 0),
            ],
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $review = Review::find($id);
        if (!$review) {
            return response()->json(['error' => 'Review not found'], 404);
        }

        $user = $request->user();
        if ($user->id !== $review->user_id && $user->role !== 'admin') {
            return response()->json(['error' => 'Only the reviewer or admin can update this review'], 403);
        }

        if ($request->has('rating')) {
            $rating = (int) $request->rating;
            if ($rating < 1 || $rating > 5) {
                return response()->json(['error' => 'Rating must be between 1 and 5'], 400);
            }
            $review->rating = $rating;
        }

        if ($request->has('title')) {
            $cleanTitle = trim(strip_tags($request->title));
            if (!empty($cleanTitle)) {
                $review->title = $cleanTitle;
            }
        }

        if ($request->has('content')) {
            $cleanContent = trim(strip_tags($request->content));
            if (!empty($cleanContent)) {
                $review->content = $cleanContent;
            }
        }

        $review->save();

        $updated = $this->fetchReviewDetails($id, $user->id);

        return response()->json([
            'message' => 'Review updated',
            'review' => $updated,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $review = Review::find($id);
        if (!$review) {
            return response()->json(['error' => 'Review not found'], 404);
        }

        $user = $request->user();
        if ($user->id !== $review->user_id && $user->role !== 'admin') {
            return response()->json(['error' => 'Only the reviewer or admin can delete this review'], 403);
        }

        $review->delete();

        return response()->json(['message' => 'Review deleted']);
    }

    public function like(Request $request, $id)
    {
        $review = Review::find($id);
        if (!$review) {
            return response()->json(['error' => 'Review not found'], 404);
        }

        $user = $request->user();

        $existingLike = ReviewLike::where('review_id', $id)
            ->where('user_id', $user->id)
            ->first();

        if ($existingLike) {
            $existingLike->delete();
            return response()->json(['message' => 'Review unliked', 'liked' => false]);
        } else {
            ReviewLike::create([
                'id' => (string) Str::uuid(),
                'review_id' => $id,
                'user_id' => $user->id,
                'created_at' => now(),
            ]);
            return response()->json(['message' => 'Review liked', 'liked' => true]);
        }
    }

    private function fetchReviewDetails(string $id, ?string $userId = null)
    {
        $userLikeSubquery = $userId
            ? '(SELECT COUNT(*) > 0 FROM review_likes rl WHERE rl.review_id = r.id AND rl.user_id = ' . DB::getPdo()->quote($userId) . ')'
            : '0';

        $review = DB::selectOne("
            SELECT r.*, u.username, u.display_name, u.avatar_url,
                   {$userLikeSubquery} as liked
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.id = ?
        ", [$id]);

        if ($review) {
            $review->rating = (int) $review->rating;
            $review->likes_count = (int) $review->likes_count;
            $review->comments_count = (int) $review->comments_count;
            $review->liked = (bool) $review->liked;
        }

        return $review;
    }
}

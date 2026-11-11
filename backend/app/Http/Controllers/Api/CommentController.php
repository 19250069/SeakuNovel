<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Comment;
use App\Models\Review;
use App\Services\NotificationService;
use App\Services\ProfanityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class CommentController extends Controller
{
    public function indexByReview(Request $request, $reviewId)
    {
        $review = Review::find($reviewId);
        if (!$review) {
            return response()->json(['error' => 'Review not found'], 404);
        }

        $page = max(1, (int) $request->query('page', 1));
        $limit = max(1, (int) $request->query('limit', 20));
        $sort = $request->query('sort', 'newest');

        $query = Comment::query()
            ->from('comments as c')
            ->join('users as u', 'c.user_id', '=', 'u.id')
            ->where('c.review_id', $reviewId)
            ->whereNull('c.parent_id');

        $total = $query->count();

        $orderSql = match ($sort) {
            'oldest' => 'c.created_at ASC',
            default => 'c.created_at DESC',
        };

        $comments = $query->select([
            'c.*',
            'u.username',
            'u.display_name',
            'u.avatar_url',
        ])
        ->orderByRaw($orderSql)
        ->offset(($page - 1) * $limit)
        ->limit($limit)
        ->get();

        // Attach replies to each top-level comment
        $commentIds = $comments->pluck('id')->toArray();
        $replies = !empty($commentIds) ? DB::table('comments as c')
            ->join('users as u', 'c.user_id', '=', 'u.id')
            ->whereIn('c.parent_id', $commentIds)
            ->select(['c.*', 'u.username', 'u.display_name', 'u.avatar_url'])
            ->orderBy('c.created_at', 'asc')
            ->get()
            ->groupBy('parent_id') : collect([]);

        $comments->transform(function ($c) use ($replies) {
            $c->replies = $replies->get($c->id, collect([]));
            return $c;
        });

        return response()->json([
            'comments' => $comments,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'totalPages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    public function show($id)
    {
        $comment = DB::selectOne('
            SELECT c.*, u.username, u.display_name, u.avatar_url
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        ', [$id]);

        if (!$comment) {
            return response()->json(['error' => 'Comment not found'], 404);
        }

        $replies = DB::select('
            SELECT c.*, u.username, u.display_name, u.avatar_url
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.parent_id = ?
            ORDER BY c.created_at ASC
        ', [$id]);

        $comment->replies = $replies;

        return response()->json(['comment' => $comment]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'review_id' => 'required|string',
            'content' => 'required|string',
            'parent_id' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => collect($validator->errors()->all())->map(fn ($msg) => ['msg' => $msg]),
            ], 400);
        }

        $review = Review::with('novel')->find($request->review_id);
        if (!$review) {
            return response()->json(['error' => 'Review not found'], 404);
        }

        $parentId = $request->input('parent_id');
        $parent = null;
        if (!empty($parentId)) {
            $parent = Comment::find($parentId);
            if (!$parent) {
                return response()->json(['error' => 'Parent comment not found'], 404);
            }
            if ($parent->review_id !== $review->id) {
                return response()->json(['error' => 'Parent comment must belong to the same review'], 400);
            }
        }

        if (ProfanityService::containsProfanity($request->content)) {
            return response()->json(['error' => 'Komentar mengandung kata-kata yang tidak pantas (Profanity).'], 400);
        }

        $cleanContent = trim(strip_tags($request->content));
        if (empty($cleanContent)) {
            return response()->json(['error' => 'Comment content is required'], 400);
        }

        $user = $request->user();
        $commentId = (string) Str::uuid();

        $comment = Comment::create([
            'id' => $commentId,
            'review_id' => $review->id,
            'user_id' => $user->id,
            'parent_id' => $parentId ?: null,
            'content' => $cleanContent,
        ]);

        if ($parent && $parent->user_id !== $user->id) {
            NotificationService::notifyCommentReply(
                $parent->user_id,
                $user,
                $review->novel,
                $review->id
            );
        }

        $created = DB::selectOne('
            SELECT c.*, u.username, u.display_name, u.avatar_url
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        ', [$commentId]);

        return response()->json([
            'message' => 'Comment created',
            'comment' => $created,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $comment = Comment::find($id);
        if (!$comment) {
            return response()->json(['error' => 'Comment not found'], 404);
        }

        $user = $request->user();
        if ($user->id !== $comment->user_id && $user->role !== 'admin') {
            return response()->json(['error' => 'Only the comment author or admin can edit this comment'], 403);
        }

        $cleanContent = trim(strip_tags($request->input('content', '')));
        if (empty($cleanContent)) {
            return response()->json(['error' => 'Comment content is required'], 400);
        }

        $comment->content = $cleanContent;
        $comment->save();

        $updated = DB::selectOne('
            SELECT c.*, u.username, u.display_name, u.avatar_url
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        ', [$id]);

        return response()->json([
            'message' => 'Comment updated',
            'comment' => $updated,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $comment = Comment::find($id);
        if (!$comment) {
            return response()->json(['error' => 'Comment not found'], 404);
        }

        $user = $request->user();
        if ($user->id !== $comment->user_id && $user->role !== 'admin') {
            return response()->json(['error' => 'Only the comment author or admin can delete this comment'], 403);
        }

        $comment->delete();

        return response()->json(['message' => 'Comment deleted']);
    }
}

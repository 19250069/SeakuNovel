<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bookmark;
use App\Models\Novel;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class BookmarkController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $page = max(1, (int) $request->query('page', 1));
        $limit = max(1, (int) $request->query('limit', 20));
        $search = trim($request->query('search', ''));
        $sort = $request->query('sort', 'latest');

        $query = DB::table('bookmarks as b')
            ->join('novels as n', 'b.novel_id', '=', 'n.id')
            ->join('users as u', 'n.author_id', '=', 'u.id')
            ->where('b.user_id', $user->id);

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('n.title', 'like', "%{$search}%")
                  ->orWhere('n.synopsis', 'like', "%{$search}%")
                  ->orWhere('u.username', 'like', "%{$search}%");
            });
        }

        $total = $query->count();

        $orderSql = match ($sort) {
            'title' => 'n.title ASC',
            'rating' => 'n.average_rating DESC',
            'views' => 'n.total_views DESC',
            default => 'b.created_at DESC',
        };

        $novels = $query->select([
            'n.*',
            'u.username as author_name',
            'u.display_name as author_display_name',
            'b.created_at as bookmarked_at',
            DB::raw('(SELECT GROUP_CONCAT(g.name SEPARATOR ", ") FROM novel_genres ng JOIN genres g ON ng.genre_id = g.id WHERE ng.novel_id = n.id) as genres'),
            DB::raw('(SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND c.deleted_at IS NULL) as total_chapters'),
        ])
        ->orderByRaw($orderSql)
        ->offset(($page - 1) * $limit)
        ->limit($limit)
        ->get();

        $novels->transform(function ($novel) {
            $novel->total_chapters = (int) $novel->total_chapters;
            $novel->average_rating = round((float) $novel->average_rating, 2);
            $novel->total_views = (int) $novel->total_views;
            return $novel;
        });

        return response()->json([
            'novels' => $novels,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'totalPages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    public function count(Request $request)
    {
        $user = $request->user();
        $total = Bookmark::where('user_id', $user->id)->count();
        return response()->json(['total' => $total]);
    }

    public function status(Request $request, $novelId)
    {
        $user = $request->user();
        $novel = Novel::find($novelId);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $bookmarked = Bookmark::where('user_id', $user->id)->where('novel_id', $novelId)->exists();
        return response()->json(['bookmarked' => $bookmarked]);
    }

    public function add(Request $request, $novelId)
    {
        $user = $request->user();
        $targetNovelId = $request->input('novel_id', $novelId);

        $novel = Novel::find($targetNovelId);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $existing = Bookmark::where('user_id', $user->id)->where('novel_id', $targetNovelId)->first();
        if ($existing) {
            return response()->json(['error' => 'Already bookmarked', 'bookmarked' => true], 409);
        }

        Bookmark::create([
            'id' => (string) Str::uuid(),
            'user_id' => $user->id,
            'novel_id' => $targetNovelId,
            'created_at' => now(),
        ]);

        NotificationService::notifyNovelBookmarked($novel->author_id, $user, $novel);

        return response()->json(['message' => 'Bookmarked', 'bookmarked' => true], 201);
    }

    public function remove(Request $request, $novelId)
    {
        $user = $request->user();
        $novel = Novel::find($novelId);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $bookmark = Bookmark::where('user_id', $user->id)->where('novel_id', $novelId)->first();
        if (!$bookmark) {
            return response()->json(['error' => 'Not bookmarked', 'bookmarked' => false], 404);
        }

        $bookmark->delete();

        return response()->json(['message' => 'Bookmark removed', 'bookmarked' => false]);
    }

    public function toggle(Request $request, $novelId)
    {
        $user = $request->user();
        $novel = Novel::find($novelId);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $existing = Bookmark::where('user_id', $user->id)->where('novel_id', $novelId)->first();
        if ($existing) {
            $existing->delete();
            return response()->json(['message' => 'Bookmark removed', 'bookmarked' => false]);
        } else {
            Bookmark::create([
                'id' => (string) Str::uuid(),
                'user_id' => $user->id,
                'novel_id' => $novelId,
                'created_at' => now(),
            ]);

            NotificationService::notifyNovelBookmarked($novel->author_id, $user, $novel);

            return response()->json(['message' => 'Bookmarked', 'bookmarked' => true]);
        }
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuthorController extends Controller
{
    public function dashboard(Request $request)
    {
        $authorId = $request->user()->id;

        // 1. Novel counts
        $novelCounts = DB::selectOne("
            SELECT 
                COUNT(*) AS total_novels,
                SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published_novels,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_novels,
                COALESCE(SUM(total_views), 0) AS total_views,
                COALESCE(SUM(total_words), 0) AS total_words,
                AVG(CASE WHEN average_rating IS NOT NULL THEN average_rating ELSE NULL END) AS avg_rating
            FROM novels
            WHERE author_id = ?
        ", [$authorId]);

        // 2. Chapter count
        $chapterCount = DB::selectOne("
            SELECT COUNT(*) AS total_chapters
            FROM chapters c
            JOIN novels n ON c.novel_id = n.id
            WHERE n.author_id = ? AND c.deleted_at IS NULL
        ", [$authorId]);

        // 3. Followers count
        $followerCount = DB::selectOne("
            SELECT COUNT(*) AS total_followers
            FROM follows
            WHERE target_type = 'author' AND target_id = ?
        ", [$authorId]);

        // 4. Bookmarks count
        $bookmarkCount = DB::selectOne("
            SELECT COUNT(*) AS total_bookmarks
            FROM bookmarks b
            JOIN novels n ON b.novel_id = n.id
            WHERE n.author_id = ?
        ", [$authorId]);

        // 5. Total reviews
        $reviewCount = DB::selectOne("
            SELECT COUNT(*) AS total_reviews
            FROM reviews r
            JOIN novels n ON r.novel_id = n.id
            WHERE n.author_id = ?
        ", [$authorId]);

        // 6. Novel performance details
        $novelsPerformance = DB::select("
            SELECT 
                n.id, n.title, n.slug, n.status, n.total_chapters, n.total_words,
                n.total_views, n.average_rating, n.created_at, n.cover_url,
                (SELECT COUNT(*) FROM bookmarks b WHERE b.novel_id = n.id) AS bookmarks_count,
                (SELECT COUNT(*) FROM reviews r WHERE r.novel_id = n.id) AS reviews_count,
                (SELECT COUNT(*) FROM follows f WHERE f.target_type = 'novel' AND f.target_id = n.id) AS novel_followers
            FROM novels n
            WHERE n.author_id = ?
            ORDER BY n.total_views DESC, n.created_at DESC
        ", [$authorId]);

        // 7. Recent reading activity
        $recentActivity = DB::select("
            SELECT 
                rp.last_read_at, rp.progress_percent,
                n.title AS novel_title,
                c.title AS chapter_title, c.chapter_number,
                u.display_name AS reader_name
            FROM reading_progress rp
            JOIN novels n ON rp.novel_id = n.id
            LEFT JOIN chapters c ON rp.last_chapter_id = c.id
            JOIN users u ON rp.user_id = u.id
            WHERE n.author_id = ? AND rp.last_read_at IS NOT NULL
            ORDER BY rp.last_read_at DESC
            LIMIT 10
        ", [$authorId]);

        return response()->json([
            'stats' => [
                'total_novels' => (int) ($novelCounts->total_novels ?? 0),
                'published_novels' => (int) ($novelCounts->published_novels ?? 0),
                'draft_novels' => (int) ($novelCounts->draft_novels ?? 0),
                'total_chapters' => (int) ($chapterCount->total_chapters ?? 0),
                'total_views' => (int) ($novelCounts->total_views ?? 0),
                'total_words' => (int) ($novelCounts->total_words ?? 0),
                'total_followers' => (int) ($followerCount->total_followers ?? 0),
                'total_bookmarks' => (int) ($bookmarkCount->total_bookmarks ?? 0),
                'total_reviews' => (int) ($reviewCount->total_reviews ?? 0),
                'average_rating' => $novelCounts->avg_rating ? round((float) $novelCounts->avg_rating, 2) : null,
            ],
            'novels' => $novelsPerformance,
            'recentActivity' => $recentActivity,
        ]);
    }
}

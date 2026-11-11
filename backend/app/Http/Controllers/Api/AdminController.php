<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bookmark;
use App\Models\Chapter;
use App\Models\Comment;
use App\Models\Novel;
use App\Models\Report;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    public function stats()
    {
        // 1. User stats
        $userStats = DB::selectOne("
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN role = 'reader' THEN 1 ELSE 0 END) AS readers,
                SUM(CASE WHEN role = 'author' THEN 1 ELSE 0 END) AS authors,
                SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins
            FROM users
        ");

        // 2. Novel stats
        $novelStats = DB::selectOne("
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) AS published,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts
            FROM novels
        ");

        // 3. Chapter stats
        $chapterStats = DB::selectOne("
            SELECT 
                COUNT(*) AS total_chapters,
                COALESCE(SUM(word_count), 0) AS total_words
            FROM chapters
            WHERE deleted_at IS NULL
        ");

        // 4. Report stats
        $reportStats = DB::selectOne("
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_reports,
                SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved_reports,
                SUM(CASE WHEN status = 'dismissed' THEN 1 ELSE 0 END) AS dismissed_reports
            FROM reports
        ");

        // 5. Engagement stats
        $reviewCount = Review::count();
        $commentCount = Comment::count();
        $bookmarkCount = Bookmark::count();

        // 6. Recent activities
        $recentUsers = User::select(['id', 'username', 'display_name', 'email', 'role', 'created_at'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get();

        $recentNovels = DB::select("
            SELECT n.id, n.title, n.status, n.created_at, u.display_name AS author_name
            FROM novels n
            JOIN users u ON n.author_id = u.id
            ORDER BY n.created_at DESC 
            LIMIT 5
        ");

        $recentReports = DB::select("
            SELECT r.*, u.display_name AS reporter_name
            FROM reports r
            JOIN users u ON r.user_id = u.id
            ORDER BY r.created_at DESC 
            LIMIT 5
        ");

        return response()->json([
            'users' => [
                'total' => (int) ($userStats->total ?? 0),
                'readers' => (int) ($userStats->readers ?? 0),
                'authors' => (int) ($userStats->authors ?? 0),
                'admins' => (int) ($userStats->admins ?? 0),
            ],
            'novels' => [
                'total' => (int) ($novelStats->total ?? 0),
                'published' => (int) ($novelStats->published ?? 0),
                'drafts' => (int) ($novelStats->drafts ?? 0),
            ],
            'chapters' => [
                'total' => (int) ($chapterStats->total_chapters ?? 0),
                'totalWords' => (int) ($chapterStats->total_words ?? 0),
            ],
            'reports' => [
                'total' => (int) ($reportStats->total ?? 0),
                'open' => (int) ($reportStats->open_reports ?? 0),
                'resolved' => (int) ($reportStats->resolved_reports ?? 0),
                'dismissed' => (int) ($reportStats->dismissed_reports ?? 0),
            ],
            'engagement' => [
                'reviews' => $reviewCount,
                'comments' => $commentCount,
                'bookmarks' => $bookmarkCount,
            ],
            'recent' => [
                'users' => $recentUsers,
                'novels' => $recentNovels,
                'reports' => $recentReports,
            ],
        ]);
    }

    public function users(Request $request)
    {
        $safeLimit = max(1, (int) $request->query('limit', 20));
        $safePage = max(1, (int) $request->query('page', 1));
        $search = trim($request->query('search', ''));
        $role = $request->query('role', '');

        $query = User::select(['id', 'username', 'email', 'display_name', 'role', 'avatar_url', 'bio', 'created_at', 'updated_at']);

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('username', 'like', "%{$search}%")
                  ->orWhere('display_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if (!empty($role) && in_array($role, ['reader', 'author', 'admin'], true)) {
            $query->where('role', $role);
        }

        $total = $query->count();

        $users = $query->orderBy('created_at', 'desc')
            ->offset(($safePage - 1) * $safeLimit)
            ->limit($safeLimit)
            ->get();

        return response()->json([
            'users' => $users,
            'pagination' => [
                'page' => $safePage,
                'limit' => $safeLimit,
                'total' => $total,
                'totalPages' => (int) ceil($total / $safeLimit),
            ],
        ]);
    }

    public function updateUserRole(Request $request, $id)
    {
        $role = $request->input('role');
        if (!in_array($role, ['reader', 'author', 'admin'], true)) {
            return response()->json(['error' => 'Role tidak valid'], 400);
        }

        $user = $request->user();
        if ($id === $user->id && $role !== 'admin') {
            return response()->json(['error' => 'Anda tidak dapat menurunkan peran akun Anda sendiri'], 400);
        }

        $target = User::find($id);
        if (!$target) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $target->role = $role;
        $target->save();

        return response()->json([
            'message' => 'Peran pengguna berhasil diperbarui',
            'user' => [
                'id' => $target->id,
                'username' => $target->username,
                'display_name' => $target->display_name,
                'email' => $target->email,
                'role' => $target->role,
            ],
        ]);
    }

    public function deleteUser(Request $request, $id)
    {
        $user = $request->user();
        if ($id === $user->id) {
            return response()->json(['error' => 'Anda tidak dapat menghapus akun Anda sendiri'], 400);
        }

        User::where('id', $id)->delete();

        return response()->json(['message' => 'Pengguna berhasil dihapus']);
    }

    public function novels(Request $request)
    {
        $safeLimit = max(1, (int) $request->query('limit', 20));
        $safePage = max(1, (int) $request->query('page', 1));
        $search = trim($request->query('search', ''));
        $status = $request->query('status', '');

        $query = DB::table('novels as n')
            ->join('users as u', 'n.author_id', '=', 'u.id');

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('n.title', 'like', "%{$search}%")
                  ->orWhere('n.synopsis', 'like', "%{$search}%")
                  ->orWhere('u.display_name', 'like', "%{$search}%");
            });
        }

        if (!empty($status) && in_array($status, ['draft', 'published'], true)) {
            $query->where('n.status', $status);
        }

        $total = $query->count();

        $novels = $query->select([
            'n.*',
            'u.display_name as author_name',
            'u.username as author_username',
        ])
        ->orderBy('n.created_at', 'desc')
        ->offset(($safePage - 1) * $safeLimit)
        ->limit($safeLimit)
        ->get();

        return response()->json([
            'novels' => $novels,
            'pagination' => [
                'page' => $safePage,
                'limit' => $safeLimit,
                'total' => $total,
                'totalPages' => (int) ceil($total / $safeLimit),
            ],
        ]);
    }

    public function updateNovelStatus(Request $request, $id)
    {
        $status = $request->input('status');
        if (!in_array($status, ['draft', 'published'], true)) {
            return response()->json(['error' => 'Status novel tidak valid'], 400);
        }

        $novel = Novel::find($id);
        if (!$novel) {
            return response()->json(['error' => 'Novel tidak ditemukan'], 404);
        }

        $novel->status = $status;
        $novel->save();

        return response()->json([
            'message' => 'Status novel berhasil diperbarui',
            'novel' => $novel,
        ]);
    }

    public function deleteNovel($id)
    {
        $novel = Novel::find($id);
        if (!$novel) {
            return response()->json(['error' => 'Novel tidak ditemukan'], 404);
        }

        if ($novel->cover_url && str_starts_with($novel->cover_url, '/uploads/')) {
            $filename = basename($novel->cover_url);
            $filePath = base_path('../uploads/' . $filename);
            if (file_exists($filePath)) {
                @unlink($filePath);
            }
        }

        $novel->delete();

        return response()->json(['message' => 'Novel berhasil dihapus']);
    }

    public function reports(Request $request)
    {
        $page = max(1, (int) $request->query('page', 1));
        $limit = max(1, (int) $request->query('limit', 20));
        $status = $request->query('status');

        $query = DB::table('reports as r')
            ->join('users as u', 'r.user_id', '=', 'u.id');

        if (!empty($status)) {
            $query->where('r.status', $status);
        }

        $total = $query->count();

        $reports = $query->select([
            'r.*',
            'u.username as reporter_username',
            'u.display_name as reporter_name',
        ])
        ->orderBy('r.created_at', 'desc')
        ->offset(($page - 1) * $limit)
        ->limit($limit)
        ->get();

        return response()->json([
            'reports' => $reports,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'totalPages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    public function updateReport(Request $request, $id)
    {
        $status = $request->input('status');
        if (!in_array($status, ['open', 'resolved', 'dismissed'], true)) {
            return response()->json(['error' => 'Status laporan tidak valid'], 400);
        }

        $report = Report::find($id);
        if (!$report) {
            return response()->json(['error' => 'Laporan tidak ditemukan'], 404);
        }

        $report->status = $status;
        $report->save();

        return response()->json([
            'message' => 'Status laporan berhasil diperbarui',
            'report' => $report,
        ]);
    }

    public function deleteReport($id)
    {
        $report = Report::find($id);
        if (!$report) {
            return response()->json(['error' => 'Laporan tidak ditemukan'], 404);
        }

        $report->delete();

        return response()->json(['message' => 'Laporan berhasil dihapus']);
    }
}

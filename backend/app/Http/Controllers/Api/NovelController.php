<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\ChapterView;
use App\Models\Follow;
use App\Models\Genre;
use App\Models\Novel;
use App\Models\Review;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class NovelController extends Controller
{
    public function index(Request $request)
    {
        $page = max(1, (int) $request->query('page', 1));
        $limit = max(1, (int) $request->query('limit', 20));
        $search = trim($request->query('search', ''));
        $genre = $request->query('genre', '');
        $sort = $request->query('sort', 'created_at');
        $status = $request->query('status', '');

        $query = Novel::query()
            ->from('novels as n')
            ->join('users as u', 'n.author_id', '=', 'u.id');

        if (!empty($status)) {
            $query->where('n.status', $status);
        } else {
            $query->where('n.status', 'published');
        }

        if (!empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('n.title', 'like', "%{$search}%")
                  ->orWhere('n.synopsis', 'like', "%{$search}%")
                  ->orWhere('u.username', 'like', "%{$search}%");
            });
        }

        if (!empty($genre)) {
            $query->join('novel_genres as ng', 'n.id', '=', 'ng.novel_id')
                  ->where('ng.genre_id', $genre);
        }

        $total = $query->count();

        $validSortFields = ['created_at', 'title', 'total_views', 'average_rating', 'total_words'];
        $sortField = in_array($sort, $validSortFields, true) ? $sort : 'created_at';
        $sortOrder = in_array($sort, ['total_views', 'average_rating', 'total_words'], true) ? 'desc' : 'desc';

        $novels = $query->select([
            'n.*',
            'u.username as author_name',
            DB::raw('(SELECT GROUP_CONCAT(g.name SEPARATOR ", ") FROM novel_genres ng2 JOIN genres g ON ng2.genre_id = g.id WHERE ng2.novel_id = n.id) as genres'),
            DB::raw('(SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND c.deleted_at IS NULL) as total_chapters'),
            DB::raw('(SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.novel_id = n.id) as average_rating'),
            DB::raw('(SELECT COALESCE(SUM(cv.view_count), 0) FROM chapter_views cv WHERE cv.chapter_id IN (SELECT c2.id FROM chapters c2 WHERE c2.novel_id = n.id)) as total_views')
        ])
        ->orderBy("n.{$sortField}", $sortOrder)
        ->offset(($page - 1) * $limit)
        ->limit($limit)
        ->get();

        // Ensure proper numeric casting
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

    public function genres()
    {
        $genres = DB::select('
            SELECT g.id, g.name, g.slug,
              (SELECT COUNT(*) FROM novel_genres ng 
               JOIN novels n ON ng.novel_id = n.id 
               WHERE ng.genre_id = g.id AND n.status = "published") AS novel_count
            FROM genres g
            ORDER BY g.name ASC
        ');

        return response()->json(['genres' => $genres]);
    }

    public function myNovels(Request $request)
    {
        $user = $request->user();
        $page = max(1, (int) $request->query('page', 1));
        $limit = max(1, (int) $request->query('limit', 20));
        $status = $request->query('status', '');

        $query = Novel::query()
            ->from('novels as n')
            ->join('users as u', 'n.author_id', '=', 'u.id')
            ->where('n.author_id', $user->id);

        if (!empty($status)) {
            $query->where('n.status', $status);
        }

        $total = $query->count();

        $novels = $query->select([
            'n.*',
            'u.username as author_name',
            DB::raw('(SELECT GROUP_CONCAT(g.name SEPARATOR ", ") FROM novel_genres ng2 JOIN genres g ON ng2.genre_id = g.id WHERE ng2.novel_id = n.id) as genres'),
            DB::raw('(SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND c.deleted_at IS NULL) as chapters_count'),
            DB::raw('(SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND c.deleted_at IS NULL) as total_chapters'),
        ])
        ->orderBy('n.updated_at', 'desc')
        ->offset(($page - 1) * $limit)
        ->limit($limit)
        ->get();

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

    public function show(Request $request, $id)
    {
        $user = $request->user();

        $novel = DB::selectOne('
            SELECT n.*, u.username AS author_name, u.display_name AS author_display_name,
              (SELECT GROUP_CONCAT(g.name SEPARATOR ", ") FROM novel_genres ng2 JOIN genres g ON ng2.genre_id = g.id WHERE ng2.novel_id = n.id) AS genres,
              (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.novel_id = n.id) AS average_rating,
              (SELECT COUNT(*) FROM reviews r WHERE r.novel_id = n.id) AS rating_count,
              (SELECT COALESCE(SUM(cv.view_count), 0) FROM chapter_views cv WHERE cv.chapter_id IN (SELECT c.id FROM chapters c WHERE c.novel_id = n.id)) AS total_views,
              (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND c.deleted_at IS NULL) AS total_chapters
            FROM novels n
            JOIN users u ON n.author_id = u.id
            WHERE n.id = ?
        ', [$id]);

        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $isOwner = $user && $novel->author_id === $user->id;
        $isAdmin = $user && $user->role === 'admin';

        if ($novel->status !== 'published' && !$isOwner && !$isAdmin) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $novel->total_chapters = (int) $novel->total_chapters;
        $novel->average_rating = round((float) $novel->average_rating, 2);
        $novel->rating_count = (int) $novel->rating_count;
        $novel->total_views = (int) $novel->total_views;

        return response()->json(['novel' => $novel]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'slug' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => collect($validator->errors()->all())->map(fn ($msg) => ['msg' => $msg]),
            ], 400);
        }

        $user = $request->user();
        if ($user->role === 'reader') {
            $user->role = 'author';
            $user->save();
        }

        $coverUrl = null;
        if ($request->hasFile('cover')) {
            $file = $request->file('cover');
            $ext = $file->getClientOriginalExtension() ?: 'jpg';
            $filename = 'cover-' . round(microtime(true) * 1000) . '-' . mt_rand(100000000, 999999999) . '.' . $ext;
            
            $uploadPath = base_path('../uploads');
            if (!file_exists($uploadPath)) {
                @mkdir($uploadPath, 0755, true);
            }
            $file->move($uploadPath, $filename);
            $coverUrl = '/uploads/' . $filename;
        }

        // Normalize genre_ids: FormData can send 'genre_ids[]' or 'genre_ids'
        $genreIds = $request->input('genre_ids[]') ?? $request->input('genre_ids') ?? [];
        if (!is_array($genreIds)) {
            $genreIds = [$genreIds];
        }
        $genreIds = array_filter(array_map('intval', $genreIds));

        $novelId = (string) Str::uuid();
        $novel = Novel::create([
            'id' => $novelId,
            'title' => trim($request->title),
            'slug' => trim($request->slug),
            'synopsis' => trim($request->synopsis ?? ''),
            'cover_url' => $coverUrl,
            'author_id' => $user->id,
            'source_draft_id' => $request->source_draft_id ?: null,
            'status' => $request->status ?: 'draft',
        ]);

        if (!empty($genreIds)) {
            foreach ($genreIds as $gId) {
                DB::table('novel_genres')->insert([
                    'novel_id' => $novelId,
                    'genre_id' => $gId,
                ]);
            }
        }

        $fresh = $this->fetchNovelDetails($novelId);

        return response()->json([
            'message' => 'Novel created',
            'novel' => $fresh,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $novel = Novel::find($id);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $user = $request->user();
        if ($user->role !== 'admin' && $novel->author_id !== $user->id) {
            return response()->json(['error' => 'Only the author or admin can update this novel'], 403);
        }

        if ($request->has('title') && trim($request->title) !== '') {
            $novel->title = trim($request->title);
        }
        if ($request->has('slug') && trim($request->slug) !== '') {
            $novel->slug = trim($request->slug);
        }
        if ($request->has('synopsis')) {
            $novel->synopsis = trim($request->synopsis);
        }
        if ($request->has('status') && in_array($request->status, ['draft', 'published', 'archived'])) {
            $novel->status = $request->status;
        }
        if ($request->has('is_completed')) {
            $novel->is_completed = (bool) $request->is_completed;
        }

        if ($request->hasFile('cover')) {
            $file = $request->file('cover');
            $ext = $file->getClientOriginalExtension() ?: 'jpg';
            $filename = 'cover-' . round(microtime(true) * 1000) . '-' . mt_rand(100000000, 999999999) . '.' . $ext;

            $uploadPath = base_path('../uploads');
            if (!file_exists($uploadPath)) {
                @mkdir($uploadPath, 0755, true);
            }
            $file->move($uploadPath, $filename);
            $novel->cover_url = '/uploads/' . $filename;
        }

        $novel->save();

        if ($request->has('genre_ids') || $request->has('genre_ids[]')) {
            $genreIds = $request->input('genre_ids[]') ?? $request->input('genre_ids') ?? [];
            if (!is_array($genreIds)) {
                $genreIds = [$genreIds];
            }
            $genreIds = array_filter(array_map('intval', $genreIds));

            DB::table('novel_genres')->where('novel_id', $id)->delete();
            foreach ($genreIds as $gId) {
                DB::table('novel_genres')->insert([
                    'novel_id' => $id,
                    'genre_id' => $gId,
                ]);
            }
        }

        $fresh = $this->fetchNovelDetails($id);

        return response()->json([
            'message' => 'Novel updated',
            'novel' => $fresh,
        ]);
    }

    public function publish(Request $request, $id)
    {
        $novel = Novel::find($id);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $user = $request->user();
        if ($novel->author_id !== $user->id && $user->role !== 'admin') {
            return response()->json(['error' => 'Only the author or admin can publish this novel'], 403);
        }

        if (empty(trim($novel->title ?? ''))) {
            return response()->json(['error' => 'Judul novel tidak boleh kosong'], 400);
        }
        if (empty(trim($novel->synopsis ?? ''))) {
            return response()->json(['error' => 'Sinopsis novel tidak boleh kosong'], 400);
        }

        $publishedChapterCount = Chapter::where('novel_id', $id)
            ->where('is_published', true)
            ->whereNull('deleted_at')
            ->count();

        if ($publishedChapterCount < 1) {
            return response()->json([
                'error' => 'Novel harus memiliki minimal 1 bab yang dipublikasikan sebelum dapat dipublikasikan.'
            ], 400);
        }

        $novel->status = 'published';
        $novel->save();

        NotificationService::notifyNovelPublished(
            $novel->author_id,
            $novel,
            $user->display_name ?: $user->username
        );

        $fresh = $this->fetchNovelDetails($id);

        return response()->json([
            'message' => 'Novel published',
            'novel' => $fresh,
        ]);
    }

    public function unpublish(Request $request, $id)
    {
        $novel = Novel::find($id);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $user = $request->user();
        if ($novel->author_id !== $user->id && $user->role !== 'admin') {
            return response()->json(['error' => 'Only the author or admin can unpublish this novel'], 403);
        }

        $novel->status = 'draft';
        $novel->save();

        $fresh = $this->fetchNovelDetails($id);

        return response()->json([
            'message' => 'Novel unpublished',
            'novel' => $fresh,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $novel = Novel::find($id);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $user = $request->user();
        if ($user->role !== 'admin' && $novel->author_id !== $user->id) {
            return response()->json(['error' => 'Only the author or admin can delete this novel'], 403);
        }

        // Delete cover file if exists locally
        if ($novel->cover_url && str_starts_with($novel->cover_url, '/uploads/')) {
            $filename = basename($novel->cover_url);
            $filePath = base_path('../uploads/' . $filename);
            if (file_exists($filePath)) {
                @unlink($filePath);
            }
        }

        $novel->delete();

        return response()->json(['message' => 'Novel deleted']);
    }

    public function analytics(Request $request, $id)
    {
        $novel = Novel::find($id);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $user = $request->user();
        if ($user->role !== 'admin' && $novel->author_id !== $user->id) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $viewsData = DB::selectOne('
            SELECT COALESCE(SUM(cv.view_count), 0) as total_views 
            FROM chapter_views cv 
            JOIN chapters c ON cv.chapter_id = c.id 
            WHERE c.novel_id = ?
        ', [$id]);

        $followersCount = Follow::where('target_type', 'novel')
            ->where('target_id', $id)
            ->count();

        $chapterPerformance = DB::select('
            SELECT c.id, c.title, c.chapter_number, COALESCE(cv.view_count, 0) as views,
             (SELECT COUNT(*) FROM chapter_comments cc WHERE cc.chapter_id = c.id) as comments
            FROM chapters c
            LEFT JOIN chapter_views cv ON c.id = cv.chapter_id
            WHERE c.novel_id = ? AND c.deleted_at IS NULL
            ORDER BY c.chapter_number ASC
        ', [$id]);

        return response()->json([
            'total_views' => (int) ($viewsData->total_views ?? 0),
            'total_followers' => $followersCount,
            'chapters' => $chapterPerformance,
        ]);
    }

    private function fetchNovelDetails(string $id)
    {
        $novel = DB::selectOne('
            SELECT n.*, u.username AS author_name, u.display_name AS author_display_name,
              (SELECT GROUP_CONCAT(g.name SEPARATOR ", ") FROM novel_genres ng2 JOIN genres g ON ng2.genre_id = g.id WHERE ng2.novel_id = n.id) AS genres,
              (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.novel_id = n.id) AS average_rating,
              (SELECT COUNT(*) FROM reviews r WHERE r.novel_id = n.id) AS rating_count,
              (SELECT COALESCE(SUM(cv.view_count), 0) FROM chapter_views cv WHERE cv.chapter_id IN (SELECT c.id FROM chapters c WHERE c.novel_id = n.id)) AS total_views,
              (SELECT COUNT(*) FROM chapters c WHERE c.novel_id = n.id AND c.deleted_at IS NULL) AS total_chapters
            FROM novels n
            JOIN users u ON n.author_id = u.id
            WHERE n.id = ?
        ', [$id]);

        if ($novel) {
            $novel->total_chapters = (int) $novel->total_chapters;
            $novel->average_rating = round((float) $novel->average_rating, 2);
            $novel->rating_count = (int) $novel->rating_count;
            $novel->total_views = (int) $novel->total_views;
        }

        return $novel;
    }
}

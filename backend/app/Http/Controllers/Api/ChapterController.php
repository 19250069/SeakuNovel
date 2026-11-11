<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\ChapterComment;
use App\Models\ChapterView;
use App\Models\Novel;
use App\Models\ScheduledPublication;
use App\Services\NotificationService;
use App\Services\ProfanityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ChapterController extends Controller
{
    private function canSeeDrafts(?Novel $novel, ?Request $request): bool
    {
        if (!$novel) return false;
        $user = $request ? $request->user() : null;
        if ($user && $user->role === 'admin') return true;
        if ($user && $novel->author_id === $user->id) return true;
        return false;
    }

    public function indexByNovel(Request $request, $novelId)
    {
        $novel = Novel::find($novelId);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $canSeeDrafts = $this->canSeeDrafts($novel, $request);
        if (!$canSeeDrafts && $novel->status !== 'published') {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $page = max(1, (int) $request->query('page', 1));
        $limit = max(1, (int) $request->query('limit', 20));
        $search = trim($request->query('search', ''));

        $query = Chapter::where('novel_id', $novelId)->whereNull('deleted_at');

        if (!$canSeeDrafts) {
            $query->where('is_published', true);
        }

        if (!empty($search)) {
            $query->where('title', 'like', "%{$search}%");
        }

        $total = $query->count();

        $chapters = $query->orderBy('order_index', 'asc')
            ->offset(($page - 1) * $limit)
            ->limit($limit)
            ->get();

        return response()->json([
            'chapters' => $chapters,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'totalPages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    public function trash(Request $request, $novelId)
    {
        $novel = Novel::find($novelId);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $user = $request->user();
        if ($user->role !== 'admin' && $novel->author_id !== $user->id) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $page = max(1, (int) $request->query('page', 1));
        $limit = max(1, (int) $request->query('limit', 20));

        $query = Chapter::onlyTrashed()->where('novel_id', $novelId);
        $total = $query->count();

        $chapters = $query->orderBy('order_index', 'asc')
            ->offset(($page - 1) * $limit)
            ->limit($limit)
            ->get();

        return response()->json([
            'chapters' => $chapters,
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
        $chapter = Chapter::find($id);
        if (!$chapter) {
            return response()->json(['error' => 'Chapter not found'], 404);
        }

        $novel = Novel::find($chapter->novel_id);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $canSeeDrafts = $this->canSeeDrafts($novel, $request);
        if (!$canSeeDrafts) {
            if ($novel->status !== 'published' || !$chapter->is_published) {
                return response()->json(['error' => 'Chapter not found'], 404);
            }
        }

        $chapterData = $chapter->toArray();
        $chapterData['novel_title'] = $novel->title;
        $chapterData['novel_slug'] = $novel->slug;

        return response()->json(['chapter' => $chapterData]);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'novel_id' => 'required|string',
            'title' => 'required|string|max:255',
            'slug' => 'required|string|max:255',
            'chapter_number' => 'nullable|integer|min:1',
            'order_index' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => collect($validator->errors()->all())->map(fn ($msg) => ['msg' => $msg]),
            ], 400);
        }

        $novel = Novel::find($request->novel_id);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $user = $request->user();
        if ($user->role !== 'admin' && $novel->author_id !== $user->id) {
            return response()->json(['error' => 'Only the novel owner or admin can create chapters'], 403);
        }

        $chapterNumber = $request->chapter_number;
        if (!$chapterNumber) {
            $lastChapter = Chapter::where('novel_id', $novel->id)->orderBy('chapter_number', 'desc')->first();
            $chapterNumber = $lastChapter ? $lastChapter->chapter_number + 1 : 1;
        }

        $orderIndex = $request->order_index;
        if (!$orderIndex) {
            $lastOrder = Chapter::where('novel_id', $novel->id)->orderBy('order_index', 'desc')->first();
            $orderIndex = $lastOrder ? $lastOrder->order_index + 1 : 1;
        }

        $content = $request->input('content', '');
        $plainText = strip_tags($content);
        $wordCount = str_word_count($plainText);

        $chapterId = (string) Str::uuid();
        $chapter = Chapter::create([
            'id' => $chapterId,
            'novel_id' => $novel->id,
            'title' => trim($request->title),
            'slug' => trim($request->slug),
            'content' => $content,
            'chapter_number' => $chapterNumber,
            'order_index' => $orderIndex,
            'word_count' => $wordCount,
            'is_published' => (bool) $request->input('is_published', false),
            'author_notes' => $request->input('author_notes'),
            'author_notes_position' => $request->input('author_notes_position', 'bottom'),
        ]);

        return response()->json([
            'message' => 'Chapter created',
            'chapter' => $chapter,
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $chapter = Chapter::find($id);
        if (!$chapter) {
            return response()->json(['error' => 'Chapter not found'], 404);
        }

        $novel = Novel::find($chapter->novel_id);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $user = $request->user();
        if ($user->role !== 'admin' && $novel->author_id !== $user->id) {
            return response()->json(['error' => 'Only the novel owner or admin can update chapters'], 403);
        }

        if ($request->has('title') && trim($request->title) !== '') {
            $chapter->title = trim($request->title);
        }
        if ($request->has('slug') && trim($request->slug) !== '') {
            $chapter->slug = trim($request->slug);
        }
        if ($request->has('content')) {
            $chapter->content = $request->input('content');
            $plainText = strip_tags($chapter->content);
            $chapter->word_count = str_word_count($plainText);
        }
        if ($request->has('chapter_number')) {
            $chapter->chapter_number = (int) $request->chapter_number;
        }
        if ($request->has('order_index')) {
            $chapter->order_index = (int) $request->order_index;
        }
        if ($request->has('is_published')) {
            $chapter->is_published = (bool) $request->is_published;
        }
        if ($request->has('author_notes')) {
            $chapter->author_notes = $request->author_notes;
        }
        if ($request->has('author_notes_position')) {
            $chapter->author_notes_position = $request->author_notes_position;
        }

        $chapter->save();

        return response()->json([
            'message' => 'Chapter updated',
            'chapter' => $chapter,
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $chapter = Chapter::find($id);
        if (!$chapter) {
            return response()->json(['error' => 'Chapter not found'], 404);
        }

        $novel = Novel::find($chapter->novel_id);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $user = $request->user();
        if ($user->role !== 'admin' && $novel->author_id !== $user->id) {
            return response()->json(['error' => 'Only the novel owner or admin can delete chapters'], 403);
        }

        $chapter->delete();

        return response()->json(['message' => 'Chapter deleted']);
    }

    public function restore(Request $request, $id)
    {
        $chapter = Chapter::onlyTrashed()->find($id);
        if (!$chapter) {
            return response()->json(['error' => 'Chapter not found'], 404);
        }

        $novel = Novel::find($chapter->novel_id);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $user = $request->user();
        if ($user->role !== 'admin' && $novel->author_id !== $user->id) {
            return response()->json(['error' => 'Access denied'], 403);
        }

        $chapter->restore();

        return response()->json(['message' => 'Chapter restored successfully']);
    }

    public function reorder(Request $request, $novelId)
    {
        $novel = Novel::find($novelId);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $user = $request->user();
        if ($user->role !== 'admin' && $novel->author_id !== $user->id) {
            return response()->json(['error' => 'Only the novel owner or admin can reorder chapters'], 403);
        }

        $orders = $request->input('orders');
        if (!is_array($orders)) {
            return response()->json(['error' => 'orders must be an array'], 400);
        }

        DB::transaction(function () use ($novelId, $orders) {
            foreach ($orders as $item) {
                if (isset($item['id']) && isset($item['order_index'])) {
                    Chapter::where('id', $item['id'])
                        ->where('novel_id', $novelId)
                        ->update(['order_index' => (int) $item['order_index']]);
                }
            }
        });

        return response()->json(['message' => 'Chapters reordered']);
    }

    public function publish(Request $request, $id)
    {
        $chapter = Chapter::find($id);
        if (!$chapter) {
            return response()->json(['error' => 'Chapter not found'], 404);
        }

        $novel = Novel::find($chapter->novel_id);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $user = $request->user();
        if ($user->role !== 'admin' && $novel->author_id !== $user->id) {
            return response()->json(['error' => 'Only the novel owner or admin can publish chapters'], 403);
        }

        $chapter->is_published = true;
        $chapter->save();

        NotificationService::notifyFollowersOfNewChapter($chapter, $novel);

        return response()->json([
            'message' => 'Chapter published',
            'chapter' => $chapter,
        ]);
    }

    public function unpublish(Request $request, $id)
    {
        $chapter = Chapter::find($id);
        if (!$chapter) {
            return response()->json(['error' => 'Chapter not found'], 404);
        }

        $novel = Novel::find($chapter->novel_id);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $user = $request->user();
        if ($user->role !== 'admin' && $novel->author_id !== $user->id) {
            return response()->json(['error' => 'Only the novel owner or admin can unpublish chapters'], 403);
        }

        $chapter->is_published = false;
        $chapter->save();

        return response()->json([
            'message' => 'Chapter unpublished',
            'chapter' => $chapter,
        ]);
    }

    public function schedule(Request $request, $id)
    {
        $publishAt = $request->input('publish_at');
        if (!$publishAt) {
            return response()->json(['error' => 'publish_at datetime is required'], 400);
        }

        $chapter = Chapter::find($id);
        if (!$chapter) {
            return response()->json(['error' => 'Chapter not found'], 404);
        }

        $novel = Novel::find($chapter->novel_id);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $user = $request->user();
        if ($user->role !== 'admin' && $novel->author_id !== $user->id) {
            return response()->json(['error' => 'Only the novel owner or admin can schedule chapters'], 403);
        }

        $scheduled = ScheduledPublication::create([
            'id' => (string) Str::uuid(),
            'novel_id' => $novel->id,
            'chapter_id' => $chapter->id,
            'publish_at' => $publishAt,
            'status' => 'scheduled',
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Chapter scheduled for publication',
            'scheduled' => $scheduled,
        ]);
    }

    public function recordView(Request $request, $id)
    {
        $chapter = Chapter::find($id);
        if (!$chapter) {
            return response()->json(['error' => 'Chapter not found'], 404);
        }

        $novelId = $chapter->novel_id;

        DB::statement('
            INSERT INTO chapter_views (id, chapter_id, view_count, updated_at) 
            VALUES (UUID(), ?, 1, NOW()) 
            ON DUPLICATE KEY UPDATE view_count = view_count + 1, updated_at = NOW()
        ', [$id]);

        $viewRow = DB::selectOne('
            SELECT COALESCE(SUM(cv.view_count), 0) AS total_views 
            FROM chapter_views cv 
            JOIN chapters c ON cv.chapter_id = c.id 
            WHERE c.novel_id = ?
        ', [$novelId]);

        return response()->json([
            'success' => true,
            'novel_id' => $novelId,
            'total_views' => (int) ($viewRow->total_views ?? 0),
        ]);
    }

    public function getComments($id)
    {
        $comments = DB::select('
            SELECT c.*, u.username, u.display_name, u.avatar_url 
            FROM chapter_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.chapter_id = ?
            ORDER BY c.paragraph_index ASC, c.created_at ASC
        ', [$id]);

        return response()->json($comments);
    }

    public function addComment(Request $request, $id)
    {
        $user = $request->user();
        $paragraphIndex = $request->input('paragraph_index');
        $content = trim($request->input('content', ''));

        if ($paragraphIndex === null || $content === '') {
            return response()->json(['error' => 'Paragraph index and content are required'], 400);
        }

        if (ProfanityService::containsProfanity($content)) {
            return response()->json(['error' => 'Komentar mengandung kata-kata yang tidak pantas (Profanity).'], 400);
        }

        $chapter = Chapter::find($id);
        if (!$chapter) {
            return response()->json(['error' => 'Chapter not found'], 404);
        }

        $commentId = (string) Str::uuid();
        DB::table('chapter_comments')->insert([
            'id' => $commentId,
            'chapter_id' => $id,
            'user_id' => $user->id,
            'paragraph_index' => (int) $paragraphIndex,
            'content' => $content,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $newComment = DB::selectOne('
            SELECT c.*, u.username, u.display_name, u.avatar_url 
            FROM chapter_comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.id = ?
        ', [$commentId]);

        return response()->json($newComment, 201);
    }
}

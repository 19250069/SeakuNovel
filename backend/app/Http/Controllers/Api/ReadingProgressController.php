<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Chapter;
use App\Models\Novel;
use App\Models\ReadingProgress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReadingProgressController extends Controller
{
    public function continueReading(Request $request)
    {
        $user = $request->user();

        $progress = DB::selectOne('
            SELECT rp.*, 
                   n.title as novel_title, n.slug as novel_slug, n.cover_url as novel_cover_url,
                   c.title as chapter_title, c.chapter_number
            FROM reading_progress rp
            JOIN novels n ON rp.novel_id = n.id
            LEFT JOIN chapters c ON rp.last_chapter_id = c.id
            WHERE rp.user_id = ?
            ORDER BY rp.last_read_at DESC
            LIMIT 1
        ', [$user->id]);

        if (!$progress) {
            return response()->json(['progress' => null]);
        }

        $progress->progress_percent = (float) $progress->progress_percent;

        return response()->json(['progress' => $progress]);
    }

    public function history(Request $request)
    {
        $user = $request->user();
        $page = max(1, (int) $request->query('page', 1));
        $limit = max(1, (int) $request->query('limit', 20));

        $total = ReadingProgress::where('user_id', $user->id)->count();

        $history = DB::select('
            SELECT rp.*, 
                   n.title as novel_title, n.slug as novel_slug, n.cover_url as novel_cover_url,
                   c.title as chapter_title, c.chapter_number
            FROM reading_progress rp
            JOIN novels n ON rp.novel_id = n.id
            LEFT JOIN chapters c ON rp.last_chapter_id = c.id
            WHERE rp.user_id = ?
            ORDER BY rp.last_read_at DESC
            LIMIT ? OFFSET ?
        ', [$user->id, $limit, ($page - 1) * $limit]);

        foreach ($history as $h) {
            $h->progress_percent = (float) $h->progress_percent;
        }

        return response()->json([
            'history' => $history,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'totalPages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    public function completed(Request $request)
    {
        $user = $request->user();

        $completed = DB::select('
            SELECT rp.*, 
                   n.title as novel_title, n.slug as novel_slug, n.cover_url as novel_cover_url
            FROM reading_progress rp
            JOIN novels n ON rp.novel_id = n.id
            WHERE rp.user_id = ? AND rp.progress_percent >= 100
            ORDER BY rp.last_read_at DESC
        ', [$user->id]);

        foreach ($completed as $c) {
            $c->progress_percent = (float) $c->progress_percent;
        }

        return response()->json(['completed' => $completed]);
    }

    public function all(Request $request)
    {
        $user = $request->user();

        $list = DB::select('
            SELECT rp.*, 
                   n.title as novel_title, n.slug as novel_slug, n.cover_url as novel_cover_url
            FROM reading_progress rp
            JOIN novels n ON rp.novel_id = n.id
            WHERE rp.user_id = ?
            ORDER BY rp.last_read_at DESC
        ', [$user->id]);

        foreach ($list as $p) {
            $p->progress_percent = (float) $p->progress_percent;
        }

        return response()->json(['progress' => $list]);
    }

    public function show(Request $request, $novelId)
    {
        $user = $request->user();
        $novel = Novel::find($novelId);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $progress = DB::selectOne('
            SELECT rp.*, c.title as chapter_title, c.chapter_number
            FROM reading_progress rp
            LEFT JOIN chapters c ON rp.last_chapter_id = c.id
            WHERE rp.user_id = ? AND rp.novel_id = ?
        ', [$user->id, $novelId]);

        if (!$progress) {
            return response()->json(['progress' => null]);
        }

        $progress->progress_percent = (float) $progress->progress_percent;

        return response()->json(['progress' => $progress]);
    }

    public function upsert(Request $request, $novelId)
    {
        $user = $request->user();
        $novel = Novel::find($novelId);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        $chapterId = $request->input('chapter_id');
        if (!empty($chapterId)) {
            $chapter = Chapter::where('id', $chapterId)->where('novel_id', $novelId)->first();
            if (!$chapter) {
                return response()->json(['error' => 'Chapter not found in this novel'], 404);
            }
        }

        $progressPercent = (float) $request->input('progress_percent', 0);
        if ($progressPercent < 0 || $progressPercent > 100) {
            return response()->json(['error' => 'Progress percent must be between 0 and 100'], 400);
        }

        $existing = ReadingProgress::where('user_id', $user->id)->where('novel_id', $novelId)->first();
        $isCreated = false;

        if ($existing) {
            $existing->last_chapter_id = $chapterId ?: $existing->last_chapter_id;
            $existing->progress_percent = $progressPercent;
            $existing->last_read_at = now();
            $existing->save();
        } else {
            $isCreated = true;
            ReadingProgress::create([
                'id' => (string) Str::uuid(),
                'user_id' => $user->id,
                'novel_id' => $novelId,
                'last_chapter_id' => $chapterId ?: null,
                'progress_percent' => $progressPercent,
                'last_read_at' => now(),
            ]);
        }

        $progress = DB::selectOne('
            SELECT rp.*, c.title as chapter_title, c.chapter_number
            FROM reading_progress rp
            LEFT JOIN chapters c ON rp.last_chapter_id = c.id
            WHERE rp.user_id = ? AND rp.novel_id = ?
        ', [$user->id, $novelId]);

        if ($progress) {
            $progress->progress_percent = (float) $progress->progress_percent;
        }

        return response()->json([
            'message' => $isCreated ? 'Progress created' : 'Progress updated',
            'progress' => $progress,
        ]);
    }

    public function destroy(Request $request, $novelId)
    {
        $user = $request->user();
        $novel = Novel::find($novelId);
        if (!$novel) {
            return response()->json(['error' => 'Novel not found'], 404);
        }

        ReadingProgress::where('user_id', $user->id)->where('novel_id', $novelId)->delete();

        return response()->json(['message' => 'Reading progress deleted']);
    }
}

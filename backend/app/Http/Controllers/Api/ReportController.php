<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Report;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReportController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();
        $targetType = $request->input('target_type');
        $targetId = $request->input('target_id');
        $reason = trim($request->input('reason', ''));
        $details = trim($request->input('details', ''));

        if (empty($targetType) || empty($targetId) || empty($reason)) {
            return response()->json(['error' => 'target_type, target_id and reason are required'], 400);
        }

        $cleanReason = trim(strip_tags($reason));
        $cleanDetails = trim(strip_tags($details));

        $reportId = (string) Str::uuid();
        $report = Report::create([
            'id' => $reportId,
            'user_id' => $user->id,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'reason' => $cleanReason,
            'details' => $cleanDetails,
            'status' => 'open',
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Report submitted',
            'report' => $report,
        ], 201);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        $page = max(1, (int) $request->query('page', 1));
        $limit = max(1, (int) $request->query('limit', 50));
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

    public function byTarget(Request $request, $targetType, $targetId)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        $reports = DB::select('
            SELECT r.*, u.username as reporter_username, u.display_name as reporter_name
            FROM reports r
            JOIN users u ON r.user_id = u.id
            WHERE r.target_type = ? AND r.target_id = ?
            ORDER BY r.created_at DESC
        ', [$targetType, $targetId]);

        return response()->json(['reports' => $reports]);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['error' => 'Admin access required'], 403);
        }

        Report::where('id', $id)->delete();

        return response()->json(['message' => 'Report removed']);
    }
}

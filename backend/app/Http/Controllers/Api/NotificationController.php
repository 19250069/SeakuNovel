<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $page = max(1, (int) $request->query('page', 1));
        $limit = max(1, (int) $request->query('limit', 20));
        $unreadOnly = $request->query('unreadOnly') === 'true';

        $query = Notification::where('user_id', $user->id);

        if ($unreadOnly) {
            $query->where('is_read', false);
        }

        $total = $query->count();
        $unreadCount = Notification::where('user_id', $user->id)->where('is_read', false)->count();

        $notifications = $query->orderBy('created_at', 'desc')
            ->offset(($page - 1) * $limit)
            ->limit($limit)
            ->get();

        return response()->json([
            'notifications' => $notifications,
            'unreadCount' => $unreadCount,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'totalPages' => (int) ceil($total / $limit),
            ],
        ]);
    }

    public function unreadCount(Request $request)
    {
        $user = $request->user();
        $count = Notification::where('user_id', $user->id)->where('is_read', false)->count();
        return response()->json(['count' => $count]);
    }

    public function markRead(Request $request, $id)
    {
        $user = $request->user();
        Notification::where('id', $id)->where('user_id', $user->id)->update(['is_read' => true]);
        return response()->json(['success' => true, 'message' => 'Notifikasi ditandai sudah dibaca']);
    }

    public function markAllRead(Request $request)
    {
        $user = $request->user();
        Notification::where('user_id', $user->id)->update(['is_read' => true]);
        return response()->json(['success' => true, 'message' => 'Semua notifikasi ditandai sudah dibaca']);
    }
}

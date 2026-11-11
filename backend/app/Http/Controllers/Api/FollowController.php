<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Follow;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FollowController extends Controller
{
    public function toggle(Request $request)
    {
        $user = $request->user();
        $targetType = $request->input('target_type');
        $targetId = $request->input('target_id');

        if (empty($targetType) || empty($targetId)) {
            return response()->json(['error' => 'target_type and target_id are required'], 400);
        }

        if (!in_array($targetType, ['novel', 'author'], true)) {
            return response()->json(['error' => "target_type must be 'novel' or 'author'"], 400);
        }

        $existing = Follow::where('user_id', $user->id)
            ->where('target_type', $targetType)
            ->where('target_id', $targetId)
            ->first();

        $followed = false;
        if ($existing) {
            $existing->delete();
            $followed = false;
        } else {
            Follow::create([
                'id' => (string) Str::uuid(),
                'user_id' => $user->id,
                'target_type' => $targetType,
                'target_id' => $targetId,
                'created_at' => now(),
            ]);
            $followed = true;
        }

        $followersCount = Follow::where('target_type', $targetType)
            ->where('target_id', $targetId)
            ->count();

        return response()->json([
            'message' => $followed ? 'Followed successfully' : 'Unfollowed successfully',
            'followed' => $followed,
            'followers_count' => $followersCount,
        ]);
    }

    public function status(Request $request)
    {
        $targetType = $request->query('target_type');
        $targetId = $request->query('target_id');

        if (empty($targetType) || empty($targetId)) {
            return response()->json(['error' => 'target_type and target_id are required'], 400);
        }

        $user = $request->user();
        $followed = false;

        if ($user) {
            $followed = Follow::where('user_id', $user->id)
                ->where('target_type', $targetType)
                ->where('target_id', $targetId)
                ->exists();
        }

        $followersCount = Follow::where('target_type', $targetType)
            ->where('target_id', $targetId)
            ->count();

        return response()->json([
            'followed' => $followed,
            'followers_count' => $followersCount,
        ]);
    }

    public function myFollows(Request $request)
    {
        $user = $request->user();
        $targetType = $request->query('target_type');

        $query = DB::table('follows as f')
            ->where('f.user_id', $user->id);

        if (!empty($targetType)) {
            $query->where('f.target_type', $targetType);
        }

        $follows = $query->get();

        return response()->json(['follows' => $follows]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Follow;
use App\Models\Novel;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProfileController extends Controller
{
    public function me(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'profile' => $user,
            'user' => $user,
        ]);
    }

    public function update(Request $request)
    {
        $user = $request->user();

        if ($request->has('display_name') && trim($request->display_name) !== '') {
            $user->display_name = trim($request->display_name);
        }

        if ($request->has('bio')) {
            $user->bio = trim($request->bio);
        }

        if ($request->hasFile('avatar')) {
            $file = $request->file('avatar');
            $ext = $file->getClientOriginalExtension() ?: 'jpg';
            $filename = 'avatar-' . round(microtime(true) * 1000) . '-' . mt_rand(100000000, 999999999) . '.' . $ext;
            
            // Save directly to the shared uploads folder
            $uploadPath = base_path('../uploads');
            if (!file_exists($uploadPath)) {
                @mkdir($uploadPath, 0755, true);
            }
            $file->move($uploadPath, $filename);
            $user->avatar_url = '/uploads/' . $filename;
        }

        $user->save();

        return response()->json([
            'message' => 'Profil berhasil diperbarui',
            'user' => $user,
            'profile' => $user,
        ]);
    }

    public function updateAvatar(Request $request)
    {
        $user = $request->user();

        if (!$request->hasFile('avatar')) {
            return response()->json(['error' => 'File avatar diperlukan'], 400);
        }

        $file = $request->file('avatar');
        $ext = $file->getClientOriginalExtension() ?: 'jpg';
        $filename = 'avatar-' . round(microtime(true) * 1000) . '-' . mt_rand(100000000, 999999999) . '.' . $ext;

        $uploadPath = base_path('../uploads');
        if (!file_exists($uploadPath)) {
            @mkdir($uploadPath, 0755, true);
        }
        $file->move($uploadPath, $filename);
        $user->avatar_url = '/uploads/' . $filename;
        $user->save();

        return response()->json([
            'message' => 'Avatar berhasil diperbarui',
            'avatar_url' => $user->avatar_url,
            'user' => $user,
        ]);
    }

    public function getUserProfile($id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 404);
        }

        $novels = Novel::where('author_id', $id)
            ->where('status', 'published')
            ->orderBy('created_at', 'desc')
            ->get();

        $followersCount = Follow::where('target_type', 'author')
            ->where('target_id', $id)
            ->count();

        $totalViews = Novel::where('author_id', $id)->sum('total_views');

        return response()->json([
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'display_name' => $user->display_name,
                'avatar_url' => $user->avatar_url,
                'bio' => $user->bio,
                'role' => $user->role,
                'created_at' => $user->created_at,
            ],
            'stats' => [
                'total_novels' => $novels->count(),
                'total_views' => (int) $totalViews,
                'followers_count' => $followersCount,
            ],
            'novels' => $novels,
        ]);
    }
}

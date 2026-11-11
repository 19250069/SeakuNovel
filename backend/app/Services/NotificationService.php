<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\Follow;
use Illuminate\Support\Str;

class NotificationService
{
    public static function create(string $userId, string $type, array $data = []): Notification
    {
        return Notification::create([
            'id' => (string) Str::uuid(),
            'user_id' => $userId,
            'type' => $type,
            'data' => $data,
            'is_read' => false,
            'created_at' => now(),
        ]);
    }

    public static function notifyFollowersOfNewChapter($chapter, $novel): void
    {
        if (!$novel || !$novel->id) return;

        $novelFollowers = Follow::where('target_type', 'novel')->where('target_id', $novel->id)->pluck('user_id')->toArray();
        $authorFollowers = $novel->author_id
            ? Follow::where('target_type', 'author')->where('target_id', $novel->author_id)->pluck('user_id')->toArray()
            : [];

        $recipientSet = array_unique(array_merge($novelFollowers, $authorFollowers));
        if ($novel->author_id) {
            $recipientSet = array_diff($recipientSet, [$novel->author_id]);
        }

        if (empty($recipientSet)) return;

        $notifData = [
            'novelId' => $novel->id,
            'novelTitle' => $novel->title,
            'novelSlug' => $novel->slug,
            'chapterId' => $chapter->id,
            'chapterTitle' => $chapter->title ?: "Bab {$chapter->chapter_number}",
            'chapterNumber' => $chapter->chapter_number,
            'message' => "Bab {$chapter->chapter_number}: \"" . ($chapter->title ?: 'Bab Baru') . "\" telah diterbitkan di novel {$novel->title}",
            'url' => "/reader/{$novel->id}/{$chapter->id}",
        ];

        foreach ($recipientSet as $recipientId) {
            self::create($recipientId, 'new_chapter', $notifData);
        }
    }

    public static function notifyCommentReply($parentUserId, $replierUser, $novel, $reviewId): void
    {
        if (!$parentUserId || $parentUserId === $replierUser->id) return;

        $name = $replierUser->display_name ?: $replierUser->username;
        $novelTitle = $novel ? $novel->title : '';

        $notifData = [
            'novelId' => $novel?->id,
            'novelTitle' => $novelTitle,
            'reviewId' => $reviewId,
            'replierName' => $name,
            'message' => "{$name} membalas komentar Anda di ulasan novel {$novelTitle}.",
            'url' => $novel?->id ? "/novel/{$novel->id}" : '#',
        ];

        self::create($parentUserId, 'comment_reply', $notifData);
    }

    public static function notifyNovelReview($authorId, $reviewerUser, $novel, $rating): void
    {
        if (!$authorId || $authorId === $reviewerUser->id) return;

        $name = $reviewerUser->display_name ?: $reviewerUser->username;

        $notifData = [
            'novelId' => $novel->id,
            'novelTitle' => $novel->title,
            'reviewerName' => $name,
            'rating' => $rating,
            'message' => "{$name} memberikan ulasan ⭐{$rating} pada novel \"{$novel->title}\".",
            'url' => "/novel/{$novel->id}",
        ];

        self::create($authorId, 'novel_review', $notifData);
    }

    public static function notifyNovelBookmarked($authorId, $user, $novel): void
    {
        if (!$authorId || $authorId === $user->id) return;

        $name = $user->display_name ?: $user->username;

        $notifData = [
            'novelId' => $novel->id,
            'novelTitle' => $novel->title,
            'userName' => $name,
            'message' => "{$name} menambahkan novel \"{$novel->title}\" ke pustaka mereka.",
            'url' => "/novel/{$novel->id}",
        ];

        self::create($authorId, 'novel_bookmarked', $notifData);
    }

    public static function notifyNovelPublished($authorId, $novel, $authorName): void
    {
        $followers = Follow::where('target_type', 'author')->where('target_id', $authorId)->pluck('user_id')->toArray();
        if (empty($followers)) return;

        $notifData = [
            'novelId' => $novel->id,
            'novelTitle' => $novel->title,
            'authorName' => $authorName,
            'message' => "{$authorName} baru saja menerbitkan novel baru: \"{$novel->title}\"!",
            'url' => "/novel/{$novel->id}",
        ];

        foreach ($followers as $followerId) {
            if ($followerId === $authorId) continue;
            self::create($followerId, 'novel_published', $notifData);
        }
    }

    public static function notifyPasswordChanged($userId): void
    {
        $notifData = [
            'message' => 'Password akun Anda telah berhasil diubah. Jika ini bukan Anda, segera hubungi tim support!',
            'url' => '/profile',
        ];

        self::create($userId, 'security_alert', $notifData);
    }
}

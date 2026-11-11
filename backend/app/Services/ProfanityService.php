<?php

namespace App\Services;

class ProfanityService
{
    public const BAD_WORDS = [
        'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'pussy', 'bastard', 'motherfucker',
        'anjing', 'babi', 'bangsat', 'kontol', 'memek', 'jembut', 'peler', 'ngentot', 'bgst',
        'jancok', 'goblok', 'tolol'
    ];

    public static function containsProfanity(?string $text): bool
    {
        if (empty($text)) {
            return false;
        }

        $lower = mb_strtolower($text);
        foreach (self::BAD_WORDS as $word) {
            if (str_contains($lower, $word)) {
                return true;
            }
        }

        return false;
    }

    public static function maskProfanity(?string $text): string
    {
        if (empty($text)) {
            return '';
        }

        $masked = $text;
        foreach (self::BAD_WORDS as $word) {
            $masked = preg_replace('/\b' . preg_quote($word, '/') . '\b/i', str_repeat('*', mb_strlen($word)), $masked);
        }

        return $masked;
    }
}

<?php

namespace App\Services;

use App\Models\Session;
use App\Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Support\Str;

class JwtService
{
    public static function getSecret(): string
    {
        return config('services.jwt.secret') ?: env('JWT_SECRET', 'seaku_novel_secret_key_default');
    }

    public static function generateToken(User $user, ?string $userAgent = null, ?string $ip = null): array
    {
        $jti = (string) Str::uuid();
        $secret = self::getSecret();

        $payload = [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'role' => $user->role,
            'jti' => $jti,
            'iat' => time(),
            'exp' => time() + (24 * 60 * 60), // 24 hours
        ];

        $token = JWT::encode($payload, $secret, 'HS256');

        try {
            Session::create([
                'id' => (string) Str::uuid(),
                'user_id' => $user->id,
                'jti' => $jti,
                'user_agent' => substr((string) $userAgent, 0, 512),
                'ip' => substr((string) $ip, 0, 100),
                'expires_at' => now()->addHours(24),
                'created_at' => now(),
            ]);
        } catch (\Throwable $e) {
            \Log::error('Failed to create session record: ' . $e->getMessage());
        }

        return [
            'token' => $token,
            'jti' => $jti,
        ];
    }

    public static function verifyToken(string $token): ?object
    {
        try {
            $secret = self::getSecret();
            $decoded = JWT::decode($token, new Key($secret, 'HS256'));

            if (!empty($decoded->jti)) {
                $session = Session::where('jti', $decoded->jti)
                    ->where('user_id', $decoded->id)
                    ->where('expires_at', '>', now())
                    ->first();

                if (!$session) {
                    return null;
                }
            }

            return $decoded;
        } catch (\Throwable $e) {
            return null;
        }
    }

    public static function revokeToken(?string $token, ?string $userId = null, ?string $jti = null): void
    {
        try {
            if ($jti && $userId) {
                Session::where('jti', $jti)->where('user_id', $userId)->delete();
                return;
            }

            if ($token) {
                $decoded = self::verifyToken($token);
                if ($decoded && !empty($decoded->jti)) {
                    Session::where('jti', $decoded->jti)->where('user_id', $decoded->id)->delete();
                }
            }
        } catch (\Throwable $e) {
            // ignore
        }
    }
}

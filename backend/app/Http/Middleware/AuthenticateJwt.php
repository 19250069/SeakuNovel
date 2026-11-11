<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateJwt
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = null;

        $authHeader = $request->header('Authorization');
        if ($authHeader && str_starts_with($authHeader, 'Bearer ')) {
            $token = substr($authHeader, 7);
        }

        if (!$token && $request->hasCookie('seaku_token')) {
            $token = $request->cookie('seaku_token');
        }

        if (!$token) {
            return response()->json(['error' => 'Access token required'], 401);
        }

        $decoded = JwtService::verifyToken($token);
        if (!$decoded) {
            return response()->json(['error' => 'Invalid or expired token'], 403);
        }

        $user = User::find($decoded->id);
        if (!$user) {
            return response()->json(['error' => 'User not found'], 401);
        }

        $request->setUserResolver(fn () => $user);
        $request->attributes->set('jwt', $decoded);

        return $next($request);
    }
}

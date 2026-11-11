<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\JwtService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'username' => 'required|string|min:3|max:50',
            'email' => 'required|email|max:255',
            'password' => ['required', 'string', 'min:8', 'regex:/[A-Z]/', 'regex:/[0-9]/'],
            'display_name' => 'required|string|max:100',
        ], [
            'username.min' => 'Username must be 3-50 characters',
            'username.max' => 'Username must be 3-50 characters',
            'email.email' => 'Valid email is required',
            'password.min' => 'Password must be at least 8 characters',
            'password.regex' => 'Password must contain at least one uppercase letter and one number',
            'display_name.required' => 'Display name is required',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => collect($validator->errors()->all())->map(fn ($msg) => ['msg' => $msg]),
            ], 400);
        }

        $existing = User::where('email', $request->email)
            ->orWhere('username', $request->username)
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Email or username already exists'], 409);
        }

        $userId = (string) Str::uuid();
        $passwordHash = password_hash($request->password, PASSWORD_BCRYPT, ['cost' => 10]);

        $user = User::create([
            'id' => $userId,
            'username' => trim($request->username),
            'email' => trim($request->email),
            'password_hash' => $passwordHash,
            'display_name' => trim($request->display_name),
            'role' => 'reader',
        ]);

        $tokenData = JwtService::generateToken($user, $request->userAgent(), $request->ip());

        $userData = [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'display_name' => $user->display_name,
            'role' => $user->role,
        ];

        $response = response()->json([
            'message' => 'Registration successful',
            'token' => $tokenData['token'],
            'user' => $userData,
        ], 201);

        if (env('USE_HTTP_COOKIE') === 'true') {
            $response->cookie('seaku_token', $tokenData['token'], 1440, '/', null, env('APP_ENV') === 'production', true, false, 'strict');
        }

        return $response;
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => collect($validator->errors()->all())->map(fn ($msg) => ['msg' => $msg]),
            ], 400);
        }

        $user = User::where('email', $request->email)->first();

        if (!$user || !password_verify($request->password, $user->password_hash)) {
            return response()->json(['error' => 'Invalid email or password'], 401);
        }

        $tokenData = JwtService::generateToken($user, $request->userAgent(), $request->ip());

        $userData = [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'display_name' => $user->display_name,
            'avatar_url' => $user->avatar_url,
            'bio' => $user->bio,
            'role' => $user->role,
        ];

        $response = response()->json([
            'message' => 'Login successful',
            'token' => $tokenData['token'],
            'user' => $userData,
        ]);

        if (env('USE_HTTP_COOKIE') === 'true') {
            $response->cookie('seaku_token', $tokenData['token'], 1440, '/', null, env('APP_ENV') === 'production', true, false, 'strict');
        }

        return $response;
    }

    public function logout(Request $request)
    {
        $jwt = $request->attributes->get('jwt');
        $token = $request->bearerToken() ?: $request->cookie('seaku_token');

        if ($jwt) {
            JwtService::revokeToken(null, $jwt->id, $jwt->jti ?? null);
        } elseif ($token) {
            JwtService::revokeToken($token);
        }

        $response = response()->json(['message' => 'Logged out successfully']);
        return $response->withoutCookie('seaku_token', '/');
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $userData = [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'display_name' => $user->display_name,
            'avatar_url' => $user->avatar_url,
            'bio' => $user->bio,
            'role' => $user->role,
            'created_at' => $user->created_at,
        ];

        return response()->json([
            'user' => $userData,
            'profile' => $userData,
        ]);
    }

    public function changePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => ['required', 'string', 'min:8', 'regex:/[A-Z]/', 'regex:/[0-9]/'],
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()->all()], 400);
        }

        $user = $request->user();

        if (!password_verify($request->current_password, $user->password_hash)) {
            return response()->json(['error' => 'Password saat ini salah'], 400);
        }

        $user->password_hash = password_hash($request->new_password, PASSWORD_BCRYPT, ['cost' => 10]);
        $user->save();

        NotificationService::notifyPasswordChanged($user->id);

        return response()->json(['message' => 'Password berhasil diubah']);
    }

    public function becomeAuthor(Request $request)
    {
        $user = $request->user();

        if ($user->role === 'reader') {
            $user->role = 'author';
            $user->save();
        }

        $tokenData = JwtService::generateToken($user, $request->userAgent(), $request->ip());

        $userData = [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email,
            'display_name' => $user->display_name,
            'avatar_url' => $user->avatar_url,
            'bio' => $user->bio,
            'role' => $user->role,
        ];

        return response()->json([
            'message' => 'Selamat! Akun Anda kini terdaftar sebagai Penulis.',
            'token' => $tokenData['token'],
            'user' => $userData,
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class SystemController extends Controller
{
    public function health()
    {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now()->toISOString(),
        ]);
    }

    public function serveUpload(string $filename)
    {
        // Prevent path traversal
        $sanitized = basename($filename);
        $path = base_path('../uploads/' . $sanitized);

        if (!file_exists($path) || is_dir($path)) {
            return response()->json(['error' => 'File not found'], 404);
        }

        $mime = mime_content_type($path) ?: 'application/octet-stream';

        return response()->file($path, [
            'Content-Type' => $mime,
            'Access-Control-Allow-Origin' => '*',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}

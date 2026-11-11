<?php

use App\Http\Controllers\Api\SystemController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'name' => 'SeakuNovel API',
        'framework' => 'Laravel ' . app()->version(),
        'status' => 'running',
    ]);
});

// Serve uploaded covers and avatars directly
Route::get('/uploads/{filename}', [SystemController::class, 'serveUpload'])->where('filename', '.*');

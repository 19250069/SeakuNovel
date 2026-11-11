<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AuthorController;
use App\Http\Controllers\Api\BookmarkController;
use App\Http\Controllers\Api\ChapterController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\FollowController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\NovelController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ReadingProgressController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SystemController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// System & Health
Route::get('/health', [SystemController::class, 'health']);

// Authentication Routes
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,15');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:20,15');
    
    Route::middleware('auth.jwt')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::get('/profile', [AuthController::class, 'me']);
        Route::put('/change-password', [AuthController::class, 'changePassword']);
        Route::post('/become-author', [AuthController::class, 'becomeAuthor'])->middleware('throttle:3,1440');
    });
});

// Profile Routes (also mounted at /api/profile for frontend parity)
Route::prefix('profile')->middleware('auth.jwt')->group(function () {
    Route::get('/me', [ProfileController::class, 'me']);
    Route::put('/', [ProfileController::class, 'update']);
    Route::post('/avatar', [ProfileController::class, 'updateAvatar']);
});
Route::get('/users/{id}/profile', [ProfileController::class, 'getUserProfile']);

// Novels Routes
Route::prefix('novels')->group(function () {
    Route::get('/', [NovelController::class, 'index']);
    Route::get('/genres', [NovelController::class, 'genres']);
    Route::get('/me', [NovelController::class, 'myNovels'])->middleware('auth.jwt');
    Route::get('/{id}/analytics', [NovelController::class, 'analytics'])->middleware('auth.jwt');
    Route::get('/{novelId}/chapters', [ChapterController::class, 'indexByNovel'])->middleware('auth.optional');
    Route::get('/{id}', [NovelController::class, 'show'])->middleware('auth.optional');

    Route::middleware('auth.jwt')->group(function () {
        Route::post('/', [NovelController::class, 'store']);
        Route::put('/{id}/publish', [NovelController::class, 'publish']);
        Route::put('/{id}/unpublish', [NovelController::class, 'unpublish']);
        Route::put('/{id}', [NovelController::class, 'update']);
        Route::delete('/{id}', [NovelController::class, 'destroy']);
    });
});

// Chapters Routes
Route::prefix('chapters')->group(function () {
    Route::get('/novel/{novelId}', [ChapterController::class, 'indexByNovel'])->middleware('auth.optional');
    Route::get('/trash/{novelId}', [ChapterController::class, 'trash'])->middleware('auth.jwt');
    Route::put('/reorder/{novelId}', [ChapterController::class, 'reorder'])->middleware('auth.jwt');

    // Public view tracking & inline comments
    Route::post('/{id}/view', [ChapterController::class, 'recordView'])->middleware('throttle:30,1');
    Route::get('/{id}/comments', [ChapterController::class, 'getComments']);
    Route::post('/{id}/comments', [ChapterController::class, 'addComment'])->middleware('auth.jwt');

    // Single chapter read
    Route::get('/{id}', [ChapterController::class, 'show'])->middleware('auth.optional');

    // Chapter mutations
    Route::middleware('auth.jwt')->group(function () {
        Route::post('/create', [ChapterController::class, 'store']);
        Route::put('/{id}', [ChapterController::class, 'update']);
        Route::delete('/{id}', [ChapterController::class, 'destroy']);
        Route::post('/{id}/restore', [ChapterController::class, 'restore']);
        Route::post('/{id}/publish', [ChapterController::class, 'publish']);
        Route::post('/{id}/unpublish', [ChapterController::class, 'unpublish']);
        Route::post('/{id}/schedule', [ChapterController::class, 'schedule']);
    });
});

// Reviews Routes
Route::prefix('reviews')->group(function () {
    Route::get('/', [ReviewController::class, 'index'])->middleware('auth.optional');
    Route::get('/novel/{novelId}', [ReviewController::class, 'byNovel'])->middleware('auth.optional');
    Route::get('/{id}', [ReviewController::class, 'show'])->middleware('auth.optional');

    Route::middleware('auth.jwt')->group(function () {
        Route::post('/', [ReviewController::class, 'store']);
        Route::put('/{id}', [ReviewController::class, 'update']);
        Route::delete('/{id}', [ReviewController::class, 'destroy']);
        Route::post('/{id}/like', [ReviewController::class, 'like']);
    });
});

// Comments (on reviews) Routes
Route::prefix('comments')->group(function () {
    Route::get('/review/{reviewId}', [CommentController::class, 'indexByReview'])->middleware('auth.optional');
    Route::get('/{id}', [CommentController::class, 'show'])->middleware('auth.optional');

    Route::middleware('auth.jwt')->group(function () {
        Route::post('/', [CommentController::class, 'store']);
        Route::put('/{id}', [CommentController::class, 'update']);
        Route::delete('/{id}', [CommentController::class, 'destroy']);
    });
});

// Bookmarks Routes
Route::prefix('bookmarks')->middleware('auth.jwt')->group(function () {
    Route::get('/', [BookmarkController::class, 'index']);
    Route::get('/count', [BookmarkController::class, 'count']);
    Route::get('/{novelId}/status', [BookmarkController::class, 'status']);
    Route::post('/{novelId}/toggle', [BookmarkController::class, 'toggle']);
    Route::post('/{novelId}', [BookmarkController::class, 'add']);
    Route::delete('/{novelId}', [BookmarkController::class, 'remove']);
});

// Reading Progress Routes
Route::prefix('reading-progress')->middleware('auth.jwt')->group(function () {
    Route::get('/continue', [ReadingProgressController::class, 'continueReading']);
    Route::get('/history', [ReadingProgressController::class, 'history']);
    Route::get('/completed', [ReadingProgressController::class, 'completed']);
    Route::get('/', [ReadingProgressController::class, 'all']);
    Route::get('/{novelId}', [ReadingProgressController::class, 'show']);
    Route::post('/{novelId}', [ReadingProgressController::class, 'upsert']);
    Route::delete('/{novelId}', [ReadingProgressController::class, 'destroy']);
});

// Reports Routes
Route::prefix('reports')->middleware('auth.jwt')->group(function () {
    Route::post('/', [ReportController::class, 'store']);
    Route::get('/', [ReportController::class, 'index']);
    Route::get('/{targetType}/{targetId}', [ReportController::class, 'byTarget']);
    Route::delete('/{id}', [ReportController::class, 'destroy']);
});

// Follows Routes
Route::prefix('follows')->group(function () {
    Route::post('/toggle', [FollowController::class, 'toggle'])->middleware('auth.jwt');
    Route::post('/', [FollowController::class, 'toggle'])->middleware('auth.jwt');
    Route::get('/status', [FollowController::class, 'status'])->middleware('auth.optional');
    Route::get('/check', [FollowController::class, 'status'])->middleware('auth.optional');
    Route::get('/my', [FollowController::class, 'myFollows'])->middleware('auth.jwt');
});

// Author Dashboard Routes
Route::prefix('author')->middleware(['auth.jwt', 'role:author,admin'])->group(function () {
    Route::get('/dashboard', [AuthorController::class, 'dashboard']);
    Route::get('/analytics', [AuthorController::class, 'dashboard']);
});

// Notifications Routes
Route::prefix('notifications')->middleware('auth.jwt')->group(function () {
    Route::get('/', [NotificationController::class, 'index']);
    Route::get('/unread-count', [NotificationController::class, 'unreadCount']);
    Route::put('/read-all', [NotificationController::class, 'markAllRead']);
    Route::put('/{id}/read', [NotificationController::class, 'markRead']);
});

// Admin Moderation Routes
Route::prefix('admin')->middleware(['auth.jwt', 'role:admin'])->group(function () {
    Route::get('/stats', [AdminController::class, 'stats']);
    
    Route::get('/users', [AdminController::class, 'users']);
    Route::put('/users/{id}/role', [AdminController::class, 'updateUserRole']);
    Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);

    Route::get('/novels', [AdminController::class, 'novels']);
    Route::put('/novels/{id}/status', [AdminController::class, 'updateNovelStatus']);
    Route::delete('/novels/{id}', [AdminController::class, 'deleteNovel']);

    Route::get('/reports', [AdminController::class, 'reports']);
    Route::put('/reports/{id}', [AdminController::class, 'updateReport']);
    Route::delete('/reports/{id}', [AdminController::class, 'deleteReport']);
});

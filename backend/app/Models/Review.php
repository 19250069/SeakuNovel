<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasUuids;

    protected $table = 'reviews';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'novel_id',
        'user_id',
        'rating',
        'title',
        'content',
        'likes_count',
        'comments_count',
    ];

    protected $casts = [
        'rating' => 'integer',
        'likes_count' => 'integer',
        'comments_count' => 'integer',
    ];

    public function novel()
    {
        return $this->belongsTo(Novel::class, 'novel_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function likes()
    {
        return $this->hasMany(ReviewLike::class, 'review_id');
    }

    public function comments()
    {
        return $this->hasMany(Comment::class, 'review_id');
    }
}

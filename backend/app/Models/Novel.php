<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Novel extends Model
{
    use HasUuids;

    protected $table = 'novels';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'title',
        'slug',
        'synopsis',
        'content',
        'cover_url',
        'author_id',
        'source_draft_id',
        'status',
        'total_chapters',
        'total_words',
        'average_rating',
        'total_views',
        'is_completed',
    ];

    protected $casts = [
        'total_chapters' => 'integer',
        'total_words' => 'integer',
        'average_rating' => 'float',
        'total_views' => 'integer',
        'is_completed' => 'boolean',
    ];

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function chapters()
    {
        return $this->hasMany(Chapter::class, 'novel_id')->orderBy('order_index', 'asc');
    }

    public function genres()
    {
        return $this->belongsToMany(Genre::class, 'novel_genres', 'novel_id', 'genre_id');
    }

    public function reviews()
    {
        return $this->hasMany(Review::class, 'novel_id');
    }

    public function bookmarks()
    {
        return $this->hasMany(Bookmark::class, 'novel_id');
    }

    public function follows()
    {
        return $this->hasMany(Follow::class, 'target_id')->where('target_type', 'novel');
    }
}

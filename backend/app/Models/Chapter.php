<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Chapter extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'chapters';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'novel_id',
        'title',
        'slug',
        'content',
        'chapter_number',
        'word_count',
        'is_published',
        'order_index',
        'author_notes',
        'author_notes_position',
    ];

    protected $casts = [
        'chapter_number' => 'integer',
        'word_count' => 'integer',
        'is_published' => 'boolean',
        'order_index' => 'integer',
    ];

    public function novel()
    {
        return $this->belongsTo(Novel::class, 'novel_id');
    }

    public function view()
    {
        return $this->hasOne(ChapterView::class, 'chapter_id');
    }

    public function comments()
    {
        return $this->hasMany(ChapterComment::class, 'chapter_id')->orderBy('paragraph_index', 'asc');
    }
}

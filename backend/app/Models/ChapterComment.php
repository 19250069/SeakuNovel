<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ChapterComment extends Model
{
    use HasUuids;

    protected $table = 'chapter_comments';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'chapter_id',
        'user_id',
        'paragraph_index',
        'content',
    ];

    protected $casts = [
        'paragraph_index' => 'integer',
    ];

    public function chapter()
    {
        return $this->belongsTo(Chapter::class, 'chapter_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

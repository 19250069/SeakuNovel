<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ReadingProgress extends Model
{
    use HasUuids;

    protected $table = 'reading_progress';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'user_id',
        'novel_id',
        'last_chapter_id',
        'progress_percent',
        'last_read_at',
    ];

    protected $casts = [
        'progress_percent' => 'float',
        'last_read_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function novel()
    {
        return $this->belongsTo(Novel::class, 'novel_id');
    }

    public function lastChapter()
    {
        return $this->belongsTo(Chapter::class, 'last_chapter_id');
    }
}

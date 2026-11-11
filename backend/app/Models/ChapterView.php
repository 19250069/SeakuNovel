<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ChapterView extends Model
{
    use HasUuids;

    protected $table = 'chapter_views';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false; // schema only has updated_at

    protected $fillable = [
        'id',
        'chapter_id',
        'view_count',
        'updated_at',
    ];

    protected $casts = [
        'view_count' => 'integer',
        'updated_at' => 'datetime',
    ];

    public function chapter()
    {
        return $this->belongsTo(Chapter::class, 'chapter_id');
    }
}

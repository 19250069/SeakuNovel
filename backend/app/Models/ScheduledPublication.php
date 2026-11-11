<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ScheduledPublication extends Model
{
    use HasUuids;

    protected $table = 'scheduled_publications';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false; // schema has created_at only

    protected $fillable = [
        'id',
        'novel_id',
        'chapter_id',
        'publish_at',
        'status',
        'created_at',
    ];

    protected $casts = [
        'publish_at' => 'datetime',
    ];

    public function novel()
    {
        return $this->belongsTo(Novel::class, 'novel_id');
    }

    public function chapter()
    {
        return $this->belongsTo(Chapter::class, 'chapter_id');
    }
}

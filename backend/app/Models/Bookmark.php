<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Bookmark extends Model
{
    use HasUuids;

    protected $table = 'bookmarks';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false; // schema has created_at only

    protected $fillable = [
        'id',
        'user_id',
        'novel_id',
        'created_at',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function novel()
    {
        return $this->belongsTo(Novel::class, 'novel_id');
    }
}

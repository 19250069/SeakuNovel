<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Notification extends Model
{
    use HasUuids;

    protected $table = 'notifications';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false; // schema has created_at only

    protected $fillable = [
        'id',
        'user_id',
        'type',
        'data',
        'is_read',
        'created_at',
    ];

    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

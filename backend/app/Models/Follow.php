<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Follow extends Model
{
    use HasUuids;

    protected $table = 'follows';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false; // schema has created_at only

    protected $fillable = [
        'id',
        'user_id',
        'target_type',
        'target_id',
        'created_at',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

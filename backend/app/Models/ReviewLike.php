<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class ReviewLike extends Model
{
    use HasUuids;

    protected $table = 'review_likes';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false; // schema has created_at only

    protected $fillable = [
        'id',
        'review_id',
        'user_id',
        'created_at',
    ];

    public function review()
    {
        return $this->belongsTo(Review::class, 'review_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

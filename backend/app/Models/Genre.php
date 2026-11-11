<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Genre extends Model
{
    protected $table = 'genres';
    public $timestamps = false; // only created_at in schema

    protected $fillable = [
        'name',
        'slug',
        'created_at',
    ];

    public function novels()
    {
        return $this->belongsToMany(Novel::class, 'novel_genres', 'genre_id', 'novel_id');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Website extends Model
{
    protected $fillable = [
        'team_id',
        'url',
        'api_key',
        'status',
    ];

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}

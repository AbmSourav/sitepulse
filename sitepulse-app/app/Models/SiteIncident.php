<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiteIncident extends Model
{
    protected $fillable = [
        'website_id',
        'started_at',
        'resolved_at',
        'reason',
        'http_status',
    ];

    protected function casts(): array
    {
        return [
            'started_at'  => 'datetime',
            'resolved_at' => 'datetime',
        ];
    }

    public function website(): BelongsTo
    {
        return $this->belongsTo(Website::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditReport extends Model
{
    protected $fillable = [
        'website_id',
        'audited_at',
        'health',
        'server',
        'security',
        'plugins',
        'themes',
    ];

    protected function casts(): array
    {
        return [
            'audited_at' => 'immutable_datetime',
            'health'     => 'array',
            'server'     => 'array',
            'security'   => 'array',
            'plugins'    => 'array',
            'themes'     => 'array',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();
        static::updating(fn () => false);
    }

    public function website(): BelongsTo
    {
        return $this->belongsTo(Website::class);
    }

    public function scopeLatestForWebsite($query, int $websiteId): mixed
    {
        return $query->where('website_id', $websiteId)->orderByDesc('audited_at')->limit(1);
    }

    public function scopeWithinDays($query, int $days): mixed
    {
        return $query->where('audited_at', '>=', now()->subDays($days));
    }

    public function scopeWithVulnerabilities($query): mixed
    {
        return $query->whereRaw("JSON_EXTRACT(security, '$.vulnerable_plugins_count') > 0");
    }
}

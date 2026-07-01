<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditReport extends Model
{
    /** @use HasFactory<\Database\Factories\AuditReportFactory> */
    use HasFactory;

    protected $fillable = [
        'website_id',
        'audited_at',
        'health',
        'server',
        'security',
        'plugins',
        'themes',
        'ai_summary',
    ];

    protected function casts(): array
    {
        return [
            'audited_at'  => 'immutable_datetime',
            'health'      => 'array',
            'server'      => 'array',
            'security'    => 'array',
            'plugins'     => 'array',
            'themes'      => 'array',
            'ai_summary'  => 'array',
        ];
    }

    protected static function boot(): void
    {
        parent::boot();

        // Reports are immutable EXCEPT for the one-time AI summary write. Allow
        // the update only when `ai_summary` is the single dirty column; block any
        // other change so audit data can never be mutated.
        static::updating(function (AuditReport $report): bool {
            return array_keys($report->getDirty()) === ['ai_summary'];
        });
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

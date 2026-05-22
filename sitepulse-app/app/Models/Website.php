<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Website extends Model
{
    protected $fillable = [
        'user_id',
        'team_id',
        'url',
        'api_key',
        'status',
        'connected_at',
        'last_checked_at',
        'next_check_at',
        'consecutive_failures',
        'uptime_status',
        'last_audited_at',
        'next_audit_at',
    ];

    protected function casts(): array
    {
        return [
            'connected_at'    => 'datetime',
            'last_checked_at' => 'datetime',
            'next_check_at'   => 'datetime',
            'last_audited_at' => 'datetime',
            'next_audit_at'   => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function auditReports(): HasMany
    {
        return $this->hasMany(AuditReport::class)->orderByDesc('audited_at');
    }

    public function latestAudit(): HasOne
    {
        return $this->hasOne(AuditReport::class)->latestOfMany('audited_at');
    }

    public function incidents(): HasMany
    {
        return $this->hasMany(SiteIncident::class)->orderByDesc('started_at');
    }

    public function latestIncident(): HasOne
    {
        return $this->hasOne(SiteIncident::class)->latestOfMany('started_at');
    }
}

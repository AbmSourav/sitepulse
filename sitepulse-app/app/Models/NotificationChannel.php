<?php

namespace App\Models;

use App\Enums\NotificationChannelType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['team_id', 'type', 'name', 'config', 'is_active'])]
class NotificationChannel extends Model
{
    protected function casts(): array
    {
        return [
            'type'      => NotificationChannelType::class,
            'config'    => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }
}

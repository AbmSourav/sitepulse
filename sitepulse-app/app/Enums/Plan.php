<?php

namespace App\Enums;

enum Plan: string
{
    case Free = 'free';
    case Pro = 'pro';
    case Enterprise = 'enterprise';

    public function limits(): array
    {
        return match ($this) {
            self::Free => [
                'maxSites'             => 3,
                'minInterval'          => 5,
                'maxTeams'             => 1,
                'notificationChannels' => ['email'],
            ],
            self::Pro => [
                'maxSites'             => -1,
                'minInterval'          => 3,
                'maxTeams'             => 1,
                'notificationChannels' => ['email', 'slack', 'discord', 'webhook'],
            ],
            self::Enterprise => [
                'maxSites'             => -1,
                'minInterval'          => 1,
                'maxTeams'             => -1,
                'notificationChannels' => ['email', 'slack', 'discord', 'webhook'],
            ],
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Free       => 'Free',
            self::Pro        => 'Pro',
            self::Enterprise => 'Enterprise',
        };
    }
}

<?php

namespace App\Enums;

enum NotificationChannelType: string
{
    case Slack   = 'slack';
    case Email   = 'email';
    case Discord = 'discord';
    case Webhook = 'webhook';

    public static function allowedForPlan(string $plan): array
    {
        return match ($plan) {
            'free'  => [self::Slack],
            default => self::cases(),
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Slack   => 'Slack',
            self::Email   => 'Email',
            self::Discord => 'Discord',
            self::Webhook => 'Webhook',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Slack   => 'Get alerted in a Slack channel when a site goes down or recovers.',
            self::Email   => 'Receive email alerts when a site goes down or recovers.',
            self::Discord => 'Get alerted in a Discord channel when a site goes down or recovers.',
            self::Webhook => 'POST a JSON payload to any URL when a site goes down or recovers.',
        };
    }

    /**
     * Returns the config field names required for this channel type.
     */
    public function configFields(): array
    {
        return match ($this) {
            self::Slack, self::Discord => ['webhook_url'],
            self::Webhook              => ['url', 'secret'],
            self::Email                => ['email'],
        };
    }
}

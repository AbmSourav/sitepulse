<?php

namespace App\Ai\Tools;

use App\Ai\Concerns\ResolvesTeamWebsite;
use App\Models\User;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

/**
 * Uptime / downtime / incident / domain-expiry stats for one team site.
 *
 * Mirrors the calculations in Api\ReportController@stats so the assistant and
 * the WP dashboard report the same numbers. Team-scoped; returns only
 * operational figures.
 */
class GetSiteStats implements Tool
{
    use ResolvesTeamWebsite;

    public function __construct(private User $user) {}

    public function description(): Stringable|string
    {
        return 'Get uptime and health stats for one of the user\'s monitored '
            .'websites: 7-day uptime percentage, total downtime, incident counts '
            .'over 7 and 30 days, domain expiry, and when it was last checked. '
            .'Use this for questions about a site\'s uptime, reliability, or '
            .'domain expiry.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'site' => $schema->string()
                ->description('The website domain or URL, e.g. "abc.com".'),
        ];
    }

    public function handle(Request $request): Stringable|string
    {
        $site = (string) $request['site'];

        $website = $this->resolveTeamWebsite($site);
        if (! $website) {
            return "No monitored site matching \"{$site}\" was found in your account.";
        }

        $now = now();
        $since = $now->copy()->subDays(7);

        $incidents7d = $website->incidents()
            ->where('started_at', '>=', $since)
            ->get(['started_at', 'resolved_at']);

        $incidents30d = $website->incidents()
            ->where('started_at', '>=', $now->copy()->subDays(30))
            ->count();

        $totalSeconds = $since->diffInSeconds($now);
        $downtimeSeconds = $incidents7d->sum(fn ($i) => $i->started_at->diffInSeconds($i->resolved_at ?? $now));
        $uptimePct = $totalSeconds > 0
            ? round((max(0, $totalSeconds - $downtimeSeconds) / $totalSeconds) * 100, 2)
            : 100.0;

        $domainExpiresAt = $website->meta_data['domain_expires_at'] ?? null;
        $domainExpiringSoon = $domainExpiresAt
            && $now->diffInDays($domainExpiresAt, false) <= 30
            && $now->diffInDays($domainExpiresAt, false) >= 0;

        return json_encode([
            'site'                 => $website->url,
            'uptime_status'        => $website->uptime_status,
            'uptime_7d'            => $uptimePct,
            'downtime_minutes_7d'  => (int) round($downtimeSeconds / 60),
            'incidents_7d'         => $incidents7d->count(),
            'incidents_30d'        => $incidents30d,
            'domain_expires_at'    => $domainExpiresAt,
            'domain_expiring_soon' => $domainExpiringSoon,
            'last_checked_at'      => $website->last_checked_at?->toIso8601String(),
        ]);
    }
}

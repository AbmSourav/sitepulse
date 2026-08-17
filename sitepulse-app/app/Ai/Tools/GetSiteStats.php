<?php

namespace App\Ai\Tools;

use App\Ai\Concerns\ResolvesTeamWebsite;
use App\Models\User;
use App\Models\Website;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

/**
 * Uptime / downtime / incident / domain-expiry stats for one team site,
 * computed over a caller-chosen window.
 *
 * The window (days) is supplied by the AI from the user's question — "last 30
 * days", "this week", "past 45 days" — so uptime %, downtime minutes and the
 * incident count all refer to the SAME window and stay consistent. Uses the same
 * downtime maths as Api\ReportController@stats. Team-scoped; operational figures
 * only.
 */
class GetSiteStats implements Tool
{
    use ResolvesTeamWebsite;

    /** Longest look-back window the tool will compute stats for. */
    private const MAX_DAYS = 45;

    public function __construct(private User $user) {}

    public function description(): Stringable|string
    {
        return 'Get uptime and health stats for one of the user\'s monitored '
            .'websites over a time window you choose: uptime percentage, total '
            .'downtime in minutes, incident count, domain expiry, and when it was '
            .'last checked. Set "days" from the user\'s question (e.g. 7 for "this '
            .'week", 30 for "last 30 days"); it defaults to 7 and the maximum is '
            .'45. Use this for questions about a site\'s uptime, downtime, '
            .'reliability, or domain expiry.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'site' => $schema->string()
                ->description('The website domain or URL, e.g. "abc.com".'),
            'days' => $schema->integer()
                ->description('The look-back window in days (1-45). Defaults to 7. '
                    .'Pick it from the user\'s question, e.g. 30 for "last 30 '
                    .'days". Values above 45 are capped at 45.'),
        ];
    }

    public function handle(Request $request): Stringable|string
    {
        $site = (string) $request['site'];
        $days = (int) ($request['days'] ?? 7);
        $days = max(1, min(self::MAX_DAYS, $days));

        $website = $this->resolveTeamWebsiteOrMessage($site);
        if (! $website instanceof Website) {
            return $website;
        }

        $now = now();
        $windowStart = $now->copy()->subDays($days);

        $incidents = $website->incidents()
            ->where(fn ($q) => $q
                // Any incident overlapping the window: started within it, OR
                // started earlier but was still open (or resolved) inside it.
                ->where('started_at', '>=', $windowStart)
                ->orWhere(fn ($q) => $q
                    ->where('started_at', '<', $windowStart)
                    ->where(fn ($q) => $q
                        ->whereNull('resolved_at')
                        ->orWhere('resolved_at', '>=', $windowStart)
                    )
                )
            )
            ->get(['started_at', 'resolved_at']);

        // Downtime = sum of each incident's overlap with the window. Clamp the
        // start to the window edge so an outage that began before the window
        // only counts its in-window portion.
        $downtimeSeconds = $incidents->sum(function ($i) use ($windowStart, $now) {
            $start = $i->started_at->greaterThan($windowStart) ? $i->started_at : $windowStart;

            return $start->diffInSeconds($i->resolved_at ?? $now);
        });

        // Only incidents that actually started within the window count toward the
        // "how many times did it go down" number.
        $incidentCount = $incidents->filter(
            fn ($i) => $i->started_at->greaterThanOrEqualTo($windowStart)
        )->count();

        $totalSeconds = $windowStart->diffInSeconds($now);
        $uptimePct = $totalSeconds > 0
            ? round((max(0, $totalSeconds - $downtimeSeconds) / $totalSeconds) * 100, 2)
            : 100.0;

        $domainExpiresAt = $website->meta_data['domain_expires_at'] ?? null;
        $domainExpiringSoon = $domainExpiresAt
            && $now->diffInDays($domainExpiresAt, false) <= 30
            && $now->diffInDays($domainExpiresAt, false) >= 0;

        return json_encode([
            'site'                 => $website->url,
            'window_days'          => $days,
            'uptime_status'        => $website->uptime_status,
            'uptime_percent'       => $uptimePct,
            'downtime_minutes'     => (int) round($downtimeSeconds / 60),
            'incident_count'       => $incidentCount,
            'domain_expires_at'    => $domainExpiresAt,
            'domain_expiring_soon' => $domainExpiringSoon,
            'last_checked_at'      => $website->last_checked_at?->toIso8601String(),
        ]);
    }
}

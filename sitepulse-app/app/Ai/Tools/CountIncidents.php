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
 * Count and list outage incidents for one team site over a recent window.
 *
 * Answers "how many times did abc.com go down in the last N days?". Returns
 * only the incident facts (reason, http status, timestamps) — no credentials,
 * no other team's data.
 */
class CountIncidents implements Tool
{
    use ResolvesTeamWebsite;

    public function __construct(private User $user) {}

    public function description(): Stringable|string
    {
        return 'Count and list outage incidents for one of the user\'s monitored '
            .'websites over a recent time window. Use when the user asks how many '
            .'times a site went down, or for its recent incidents.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [
            'site' => $schema->string()
                ->description('The website domain or URL, e.g. "abc.com".'),
            'days' => $schema->integer()
                ->description('How many days back to look (1-90). Defaults to 7.'),
        ];
    }

    public function handle(Request $request): Stringable|string
    {
        $site = (string) $request['site'];
        $days = (int) ($request['days'] ?? 7);
        $days = max(1, min(90, $days));

        $website = $this->resolveTeamWebsiteOrMessage($site);
        if (! $website instanceof Website) {
            return $website;
        }

        $incidents = $website->incidents()
            ->where('started_at', '>=', now()->subDays($days))
            // Explicit column whitelist — incident facts only.
            ->get(['reason', 'http_status', 'started_at', 'resolved_at']);

        return json_encode([
            'site'           => $website->url,
            'window_days'    => $days,
            'incident_count' => $incidents->count(),
            'incidents'      => $incidents->map(fn ($i) => [
                'reason'      => $i->reason,
                'http_status' => $i->http_status,
                'started_at'  => $i->started_at?->toIso8601String(),
                'resolved_at' => $i->resolved_at?->toIso8601String(),
                'ongoing'     => $i->resolved_at === null,
            ])->all(),
        ]);
    }
}

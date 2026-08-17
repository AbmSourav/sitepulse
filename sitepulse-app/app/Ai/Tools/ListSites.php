<?php

namespace App\Ai\Tools;

use App\Models\User;
use App\Models\Website;
use Illuminate\Contracts\JsonSchema\JsonSchema;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Tools\Request;
use Stringable;

/**
 * Enumerate the sites monitored by the user's team.
 *
 * Returns only operational, non-sensitive fields (URL + current health).
 * Never returns api_key, meta_data secrets, or any other team's sites.
 */
class ListSites implements Tool
{
    public function __construct(private User $user) {}

    public function description(): Stringable|string
    {
        return 'List the websites the user\'s team is currently monitoring, with '
            .'each site\'s URL, connection status and current uptime status. Use '
            .'this when the user asks what sites they have, or to find the exact '
            .'URL of a site before answering a more specific question.';
    }

    public function schema(JsonSchema $schema): array
    {
        return [];
    }

    public function handle(Request $request): Stringable|string
    {
        $sites = Website::query()
            ->where('team_id', $this->user->team_id)
            ->orderBy('url')
            // Explicit column whitelist — never select api_key / meta_data.
            ->get(['url', 'status', 'uptime_status', 'last_checked_at']);

        return json_encode([
            'site_count' => $sites->count(),
            'sites'      => $sites->map(fn (Website $site) => [
                'url'             => $site->url,
                'status'          => $site->status,
                'uptime_status'   => $site->uptime_status,
                'last_checked_at' => $site->last_checked_at?->toIso8601String(),
            ])->all(),
        ]);
    }
}

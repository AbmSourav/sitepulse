<?php

namespace App\Ai\Concerns;

use App\Models\Website;

/**
 * Shared, team-scoped website lookup for AI tools.
 *
 * Every tool must resolve a site ONLY within the authenticated user's team, so
 * the assistant can never read another team's data — even if the user names a
 * site that belongs to someone else. A miss returns null (the tool then answers
 * "not found in your account"), never a cross-team row.
 */
trait ResolvesTeamWebsite
{
    /**
     * Resolve a website by domain or URL, scoped to the user's team.
     *
     * Accepts either a bare domain ("abc.com") or a full URL
     * ("https://abc.com/path") and matches on the host substring.
     */
    protected function resolveTeamWebsite(string $site): ?Website
    {
        $needle = str_contains($site, '://')
            ? parse_url($site, PHP_URL_HOST)
            : trim($site);

        if (empty($needle)) {
            return null;
        }

        return Website::query()
            ->where('team_id', $this->user->team_id)
            ->where('url', 'like', '%'.$needle.'%')
            ->first();
    }
}

<?php

namespace App\Ai\Concerns;

use App\Models\Website;
use Illuminate\Support\Collection;

/**
 * Shared, team-scoped website lookup for AI tools.
 *
 * Every tool must resolve a site ONLY within the authenticated user's team, so
 * the assistant can never read another team's data — even if the user names a
 * site that belongs to someone else. A miss returns null (the tool then answers
 * "not found in your account"), never a cross-team row.
 *
 * Matching is by EXACT host, not a URL substring. A substring match conflates a
 * domain with its subdomains — "abmsourav.com" would also match
 * "blog.abmsourav.com" — so we compare parsed hosts instead.
 */
trait ResolvesTeamWebsite
{
    /**
     * Resolve a single website by domain or URL, scoped to the user's team.
     *
     * Returns null when nothing matches OR when the term is ambiguous (matches
     * more than one site) — callers should use candidateWebsites() to tell those
     * two cases apart and ask the user to disambiguate.
     */
    protected function resolveTeamWebsite(string $site): ?Website
    {
        $matches = $this->candidateWebsites($site);

        // Exactly one host match is an unambiguous hit. Zero or many → null.
        return $matches->count() === 1 ? $matches->first() : null;
    }

    /**
     * Resolve a single website, or return a tool-ready message explaining why we
     * couldn't. On a unique hit returns the Website; otherwise returns a string:
     * "not found" when nothing matched, or a disambiguation prompt listing the
     * exact hosts when the term was ambiguous.
     *
     * Usage in a tool's handle():
     *   $result = $this->resolveTeamWebsiteOrMessage($site);
     *   if (! $result instanceof Website) { return $result; }
     */
    protected function resolveTeamWebsiteOrMessage(string $site): Website|string
    {
        $matches = $this->candidateWebsites($site);

        if ($matches->count() === 1) {
            return $matches->first();
        }

        if ($matches->isEmpty()) {
            return "No monitored site matching \"{$site}\" was found in your account.";
        }

        $urls = $matches->pluck('url')->implode(', ');

        return "\"{$site}\" matches more than one of your sites ({$urls}). "
            .'Ask the user which exact site they mean before answering.';
    }

    /**
     * All team websites whose host matches the requested domain/URL.
     *
     * Host comparison is exact and case-insensitive, with a leading "www."
     * ignored on both sides. A bare domain ("abmsourav.com") matches only that
     * host, never "blog.abmsourav.com".
     *
     * @return Collection<int, Website>
     */
    protected function candidateWebsites(string $site): Collection
    {
        $needle = $this->normalizeHost($site);

        if ($needle === '') {
            return collect();
        }

        // Narrow at the DB with LIKE (cheap, index-friendly), then filter to an
        // exact host match in PHP — LIKE alone can't distinguish a domain from
        // its subdomains.
        return Website::query()
            ->where('team_id', $this->user->team_id)
            ->where('url', 'like', '%'.$needle.'%')
            ->get()
            ->filter(fn (Website $w) => $this->hostOf($w->url) === $needle)
            ->values();
    }

    /**
     * Extract and normalize the host from a stored website URL.
     */
    private function hostOf(string $url): string
    {
        $host = str_contains($url, '://')
            ? (string) parse_url($url, PHP_URL_HOST)
            : $url;

        return $this->normalizeHost($host);
    }

    /**
     * Normalize a host or user-supplied site term: strip scheme/path, lowercase,
     * and drop a leading "www.".
     */
    private function normalizeHost(string $value): string
    {
        $value = trim($value);

        if ($value === '') {
            return '';
        }

        // If a full URL (or a bare "host/path") was given, keep only the host.
        if (str_contains($value, '://')) {
            $value = (string) parse_url($value, PHP_URL_HOST);
        } elseif (str_contains($value, '/')) {
            $value = explode('/', $value)[0];
        }

        $value = strtolower($value);

        return str_starts_with($value, 'www.')
            ? substr($value, 4)
            : $value;
    }
}

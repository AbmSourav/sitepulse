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
 * Most recent audit report for one team site.
 *
 * Returns the audit health/server/security/plugin/theme snapshot — WordPress
 * health metrics, no user PII or credentials. Team-scoped.
 */
class GetLatestAudit implements Tool
{
    use ResolvesTeamWebsite;

    public function __construct(private User $user) {}

    public function description(): Stringable|string
    {
        return 'Get the most recent audit report for one of the user\'s monitored '
            .'websites: overall health, server/PHP info, SSL/security status, and '
            .'plugin/theme counts (outdated, vulnerable). Use for questions about '
            .'a site\'s health, security posture, PHP version, SSL, or plugins.';
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

        $website = $this->resolveTeamWebsiteOrMessage($site);
        if (! $website instanceof Website) {
            return $website;
        }

        $audit = $website->latestAudit()->first();
        if (! $audit) {
            return "No audit report has been recorded yet for {$website->url}.";
        }

        return json_encode([
            'site'       => $website->url,
            'audited_at' => $audit->audited_at?->toIso8601String(),
            'health'     => $audit->health,
            'server'     => $audit->server,
            'security'   => $audit->security,
            'plugins'    => $audit->plugins,
            'themes'     => $audit->themes,
        ]);
    }
}

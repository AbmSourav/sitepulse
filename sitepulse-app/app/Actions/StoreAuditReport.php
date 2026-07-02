<?php

namespace App\Actions;

use App\Models\AuditReport;
use App\Models\Website;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class StoreAuditReport
{
    /**
     * @throws ValidationException
     */
    public function handle(Website $website, array $data): AuditReport
    {
        $data = $this->validate($data);

        $sanitizeStrings = fn (array $item): array => array_map(
            fn ($value) => is_string($value) ? strip_tags($value) : $value,
            $item
        );

        $plugins = array_map($sanitizeStrings, $data['plugins'] ?? []);
        $themes = array_map($sanitizeStrings, $data['themes'] ?? []);

        $pluginsOutdated = collect($plugins)->filter(fn ($p) => $p['require_update'] ?? false)->count();
        $themesOutdated = collect($themes)->filter(fn ($t) => $t['require_update'] ?? false)->count();

        $report = AuditReport::create([
            'website_id' => $website->id,
            'audited_at' => $data['audited_at'],
            'health'     => [
                ...($data['site_health'] ?? []),
                'cron_status' => $data['cron_status'] ?? null,
                'admin_email' => $data['admin_email'] ?? null,
                'locale'      => $data['locale'] ?? null,
            ],
            'server' => [
                ...($data['server'] ?? []),
            ],
            'security' => [
                'ssl_valid'      => $data['ssl_valid'] ?? null,
                'ssl_expires_at' => $data['ssl_expires_at'] ?? null,
            ],
            'plugins' => [
                'total'    => count($plugins),
                'outdated' => $pluginsOutdated,
                'items'    => $plugins,
            ],
            'themes' => [
                'total'    => count($themes),
                'outdated' => $themesOutdated,
                'items'    => $themes,
            ],
        ]);

        Cache::store('api-cache')->forget("audit-reports:website:{$website->id}:page:1");

        $website->last_audited_at = now();
        $website->next_audit_at   = app()->isProduction() ? now()->addWeek() : now()->addMinutes(3);
        $website->save();

        return $report;
    }

    /**
     * @throws ValidationException
     */
    private function validate(array $data): array
    {
        return Validator::make($data, [
            'audited_at'  => 'required|date',
            'debug_mode'  => 'boolean',
            'cron_status' => 'string|in:enabled,disabled,unknown',
            'admin_email' => 'email',
            'locale'      => 'nullable|string|max:20',

            'server'                  => 'array',
            'server.wp_version.*'     => 'string',
            'server.php_version.*'    => 'string',
            'server.sql_server.*'     => 'string',
            'server.php_extensions.*' => 'string',
            'server.db_size_bytes'    => 'integer|min:0',
            'server.php_errors'       => 'array',

            'site_health'                      => 'array',
            'site_health.https_status.*'       => 'string',
            'site_health.scheduled_events.*'   => 'string',
            'site_health.background_updates.*' => 'string',
            'site_health.loopback_requests.*'  => 'string',
            'site_health.rest_availability.*'  => 'string',
            'site_health.debug_mode.*'         => 'string',
            'site_health.file_uploads.*'       => 'string',
            'site_health.php_extensions.*'     => 'string',

            'ssl_valid'      => 'boolean',
            'ssl_expires_at' => 'nullable|date_format:Y-m-d',

            'plugins'                     => 'array',
            'plugins.*.name'              => 'string',
            'plugins.*.installed_version' => 'string',
            'plugins.*.latest_version'    => 'string',
            'plugins.*.is_active'         => 'boolean',
            'plugins.*.require_update'    => 'boolean',

            'themes'                     => 'array',
            'themes.*.name'              => 'string',
            'themes.*.installed_version' => 'string',
            'themes.*.latest_version'    => 'string',
            'themes.*.is_active'         => 'boolean',
            'themes.*.require_update'    => 'boolean',
        ])->validate();
    }
}

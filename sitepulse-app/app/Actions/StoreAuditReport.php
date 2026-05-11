<?php

namespace App\Actions;

use App\Models\AuditReport;
use App\Models\Website;
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

        $plugins     = array_map($sanitizeStrings, $data['plugins'] ?? []);
        $themes      = array_map($sanitizeStrings, $data['themes'] ?? []);
        $activeTheme = $sanitizeStrings($data['active_theme'] ?? []);
        $phpErrors   = array_map($sanitizeStrings, $data['php_errors'] ?? []);

        $pluginsOutdated   = collect($plugins)->filter(fn ($p) => $p['require_update'] ?? false)->count();
        $pluginsVulnerable = collect($plugins)->filter(fn ($p) => $p['has_vulnerability'] ?? false)->count();
        $themesOutdated    = collect($themes)->filter(fn ($t) => $t['require_update'] ?? false)->count();

        $report = AuditReport::create([
            'website_id' => $website->id,
            'audited_at' => $data['audited_at'],
            'health' => [
                'status'        => $data['health_status'] ?? 'unknown',
                'wp_version'    => $data['wp_version'] ?? null,
                'php_version'   => $data['php_version'] ?? null,
                'mysql_version' => $data['mysql_version'] ?? null,
                'debug_mode'    => $data['debug_mode'] ?? null,
                'cron_status'   => $data['cron_status'] ?? null,
                'admin_email'   => $data['admin_email'] ?? null,
                'locale'        => $data['locale'] ?? null,
            ],
            'server' => [
                'db_size_bytes'   => $data['db_size_bytes'] ?? null,
                'php_error_count' => $data['php_error_count'] ?? null,
                'php_errors'      => $phpErrors ?: null,
            ],
            'security' => [
                'ssl_valid'                => $data['ssl_valid'] ?? null,
                'ssl_expires_at'           => $data['ssl_expires_at'] ?? null,
                'vulnerable_plugins_count' => $pluginsVulnerable,
            ],
            'plugins' => [
                'total'      => count($plugins),
                'outdated'   => $pluginsOutdated,
                'vulnerable' => $pluginsVulnerable,
                'items'      => $plugins,
            ],
            'themes' => [
                'total'    => count($themes),
                'outdated' => $themesOutdated,
                'active'   => $activeTheme,
                'items'    => $themes,
            ],
        ]);

        $website->last_audited_at = now();
        $website->next_audit_at   = now()->addWeek();
        $website->save();

        return $report;
    }

    /**
     * @throws ValidationException
     */
    private function validate(array $data): array
    {
        return Validator::make($data, [
            'audited_at'    => 'required|date',
            'debug_mode'    => 'boolean',
            'cron_status'   => 'string|in:enabled,disabled,unknown',
            'admin_email'   => 'email',
            'locale'        => 'nullable|string|max:20',

            'db_size_bytes'   => 'integer|min:0',

            'ssl_valid'      => 'boolean',
            'ssl_expires_at' => 'nullable|date_format:Y-m-d',

            'plugins'                       => 'array',
            'plugins.*.name'                => 'string',
            'plugins.*.installed_version'   => 'string',
            'plugins.*.latest_version'      => 'string',
            'plugins.*.is_active'           => 'boolean',
            'plugins.*.require_update'      => 'boolean',

            'themes'                        => 'array',
            'themes.*.name'                 => 'string',
            'themes.*.installed_version'    => 'string',
            'themes.*.latest_version'       => 'string',
            'themes.*.is_active'            => 'boolean',
            'themes.*.require_update'       => 'boolean',
        ])->validate();
    }
}

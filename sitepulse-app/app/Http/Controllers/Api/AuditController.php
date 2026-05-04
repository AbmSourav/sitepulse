<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditReport;
use App\Models\Website;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AuditController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        /** @var Website $website */
        $website = $request->attributes->get('website');

        $validator = Validator::make($request->all(), [
            'audited_at'    => 'required|date',
            'health_status' => 'string|in:up,down',
            'wp_version'    => 'string|max:20',
            'php_version'   => 'string|max:20',
            'mysql_version' => 'string|max:30',
            'debug_mode'    => 'boolean',
            'cron_status'   => 'string|in:enabled,disabled,unknown',
            'admin_email'   => 'email',
            'locale'        => 'nullable|string|max:20',

            'db_size_bytes'   => 'integer|min:0',
            'php_error_count' => 'integer|min:0',
            'php_errors'      => 'nullable|array',
            'php_errors.*.type'    => 'string',
            'php_errors.*.message' => 'string',
            'php_errors.*.file'    => 'string',
            'php_errors.*.line'    => 'integer',

            'ssl_valid'      => 'boolean',
            'ssl_expires_at' => 'nullable|date_format:Y-m-d',

            'plugins'                     => 'array',
            'plugins.*.name'              => 'string',
            'plugins.*.version'           => 'string',
            'plugins.*.latest_version'    => 'string',
            'plugins.*.is_active'         => 'boolean',
            'plugins.*.has_vulnerability' => 'boolean',

            'active_theme'                => 'array',
            'active_theme.name'           => 'string',
            'active_theme.version'        => 'string',
            'active_theme.latest_version' => 'string',

            'themes'                  => 'array',
            'themes.*.name'           => 'string',
            'themes.*.version'        => 'string',
            'themes.*.latest_version' => 'string',
            'themes.*.is_active'      => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error'  => 'Validation failed.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        $sanitizeStrings = fn (array $item): array => array_map(
            fn ($value) => is_string($value) ? strip_tags($value) : $value,
            $item
        );

        $data['plugins']      = array_map($sanitizeStrings, $data['plugins'] ?? []);
        $data['themes']       = array_map($sanitizeStrings, $data['themes'] ?? []);
        $data['active_theme'] = $sanitizeStrings($data['active_theme'] ?? []);
        $data['php_errors']   = array_map($sanitizeStrings, $data['php_errors'] ?? []);

        $pluginsOutdated   = collect($data['plugins'])->filter(fn ($p) => $p['version'] !== $p['latest_version'])->count();
        $pluginsVulnerable = collect($data['plugins'])->filter(fn ($p) => $p['has_vulnerability'])->count();
        $themesOutdated    = collect($data['themes'])->filter(fn ($t) => $t['version'] !== $t['latest_version'])->count();

        $report = AuditReport::create([
            'website_id' => $website->id,
            'audited_at' => $data['audited_at'],
            'health' => [
                'status'       => $data['health_status'] ?? 'unknown',
                'wp_version'   => $data['wp_version'] ?? null,
                'php_version'  => $data['php_version'] ?? null,
                'mysql_version' => $data['mysql_version'] ?? null,
                'debug_mode'   => $data['debug_mode'] ?? null,
                'cron_status'  => $data['cron_status'] ?? null,
                'admin_email'  => $data['admin_email'] ?? null,
                'locale'       => $data['locale'] ?? null,
            ],
            'server' => [
                'db_size_bytes'   => $data['db_size_bytes'] ?? null,
                'php_error_count' => $data['php_error_count'] ?? null,
                'php_errors'      => $data['php_errors'] ?? null,
            ],
            'security' => [
                'ssl_valid'                => $data['ssl_valid'] ?? null,
                'ssl_expires_at'           => $data['ssl_expires_at'] ?? null,
                'vulnerable_plugins_count' => $pluginsVulnerable,
            ],
            'plugins' => [
                'total'      => count($data['plugins'] ?? []),
                'outdated'   => $pluginsOutdated,
                'vulnerable' => $pluginsVulnerable,
                'items'      => $data['plugins'] ?? [],
            ],
            'themes' => [
                'total'    => count($data['themes'] ?? []),
                'outdated' => $themesOutdated,
                'active'   => $data['active_theme'] ?? [],
                'items'    => $data['themes'] ?? [],
            ],
        ]);

        return response()->json([
            'message'   => 'Audit stored',
            'report_id' => $report->id,
        ], 201);
    }
}

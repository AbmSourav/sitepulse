<?php

namespace Sitepulse\SitepulseMonitor\Services;

use Sitepulse\SitepulseMonitor\Lib\AppData;
use Sitepulse\SitepulseMonitor\Lib\Http;
use Sitepulse\SitepulseMonitor\Services\AuditReport as AuditReportService;

class RestApi
{
    public function register()
    {
        add_action('rest_api_init', [$this, 'restApi']);
    }

    public function restApi()
    {
        $this->registerPrivateRestApi('/disconnect', 'POST', [$this, 'disconnectWebsite']);
        $this->registerPrivateRestApi('/reconnect', 'POST', [$this, 'reconnectWebsite']);

        register_rest_route('sitepulse-monitor/v1', '/heartbeat', [
            'methods'             => 'GET',
            'callback'            => [$this, 'heartbeat'],
            'permission_callback' => [$this, 'verifyApiKey'],
        ]);

        register_rest_route('sitepulse-monitor/v1', '/audit', [
            'methods'             => 'POST',
            'callback'            => [$this, 'audit'],
            'permission_callback' => [$this, 'verifyBodyApiKey'],
        ]);
    }

    public function registerPrivateRestApi(string $route, string $method, callable $callback)
    {
        register_rest_route('sitepulse-monitor/v1', $route, [
            'methods'             => $method,
            'callback'            => $callback,
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ]);
    }

    public function verifyApiKey(\WP_REST_Request $request): bool
    {
        $sentKey   = $request->get_header('x-spm-api-key');
        $storedKey = AppData::get('api_key');

        if (! $sentKey || ! $storedKey) {
            return false;
        }

        return hash_equals((string) $storedKey, (string) $sentKey);
    }

    public function heartbeat(): \WP_REST_Response
    {
        return new \WP_REST_Response([
            'ok'         => true,
            'plugin'     => SPM_VERSION,
            'time'       => current_time('Y-m-d H:i:s'),
        ], 200);
    }

    public function verifyBodyApiKey(\WP_REST_Request $request): bool
    {
        $sentKey   = $request->get_param('api_key');
        $storedKey = AppData::get('api_key');

        if (! $sentKey || ! $storedKey) {
            return false;
        }

        return hash_equals((string) $storedKey, (string) $sentKey);
    }

    public function audit(\WP_REST_Request $_request): \WP_REST_Response
    {
        $report = (new AuditReportService())->generateReport();

        return new \WP_REST_Response($report, 200);
    }

    public function disconnectWebsite()
    {
        $res = Http::post('/websites/disconnect', [
            'body' => [
                'api_key' => AppData::get('api_key'),
            ],
        ]);

        if ($res->statusCode() === 200) {
            AppData::set('disconnected', 'status');
        }

        wp_send_json([
            'message' => 'Site disconnected successfully',
        ]);
    }

    public function reconnectWebsite()
    {
        $res = Http::post('/websites/reconnect', [
            'body' => [
                'api_key' => AppData::get('api_key'),
            ],
        ]);

        if ($res->statusCode() === 200) {
            AppData::set('connected', 'status');
        }

        wp_send_json([
            'message' => 'Site reconnected successfully',
        ]);
    }
}

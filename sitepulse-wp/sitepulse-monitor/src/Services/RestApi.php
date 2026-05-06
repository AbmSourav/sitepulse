<?php

namespace Sitepulse\SitepulseMonitor\Services;

use Sitepulse\SitepulseMonitor\Lib\AppData;
use Sitepulse\SitepulseMonitor\Lib\Http;

class RestApi
{
    public function register()
    {
        add_action('rest_api_init', [$this, 'restApi']);
    }

    public function restApi()
    {
        $this->registerRestApi('/disconnect', 'POST', [$this, 'disconnectWebsite']);
        $this->registerRestApi('/reconnect', 'POST', [$this, 'reconnectWebsite']);
    }

    public function registerRestApi(string $route, string $method, callable $callback)
    {
        register_rest_route('sitepulse-monitor/v1', $route, [
            'methods'             => $method,
            'callback'            => $callback,
            'permission_callback' => function () {
                return current_user_can('manage_options');
            },
        ]);
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

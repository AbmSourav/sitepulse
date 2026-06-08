<?php

namespace Sitepulse\SitepulseMonitor\Services;

use Sitepulse\SitepulseMonitor\Lib\AppData;
use Sitepulse\SitepulseMonitor\Lib\BaseService;
use Sitepulse\SitepulseMonitor\Lib\Http;

if (! defined('ABSPATH')) exit;

class AjaxApi implements BaseService
{
    public function register(): void
    {
        add_action('wp_ajax_spm_get_incidents',    [$this, 'getIncidents']);
        add_action('wp_ajax_spm_get_audit_reports', [$this, 'getAuditReports']);
        add_action('wp_ajax_spm_get_stats',         [$this, 'getStats']);
    }

    public function getIncidents(): void
    {
        check_ajax_referer('spm_admin_nonce', 'nonce');

        $page     = absint($_POST['page'] ?? 1);
        $api_key  = AppData::get('api_key');

        if (! $api_key) {
            wp_send_json_error(['message' => 'Not connected.'], 403);
        }

        $response = Http::post('/incidents', [
            'body' => ['api_key' => $api_key],
        ], $page > 1 ? ['page' => $page] : []);

        if ($response->failed()) {
            wp_send_json_error(['message' => 'Failed to fetch incidents.'], 502);
        }

        wp_send_json_success($response->body());
    }

    public function getAuditReports(): void
    {
        check_ajax_referer('spm_admin_nonce', 'nonce');

        $page    = absint($_POST['page'] ?? 1);
        $api_key = AppData::get('api_key');

        if (! $api_key) {
            wp_send_json_error(['message' => 'Not connected.'], 403);
        }

        $response = Http::post('/audit-reports', [
            'body' => ['api_key' => $api_key],
        ], $page > 1 ? ['page' => $page] : []);

        if ($response->failed()) {
            wp_send_json_error(['message' => 'Failed to fetch audit reports.'], 502);
        }

        wp_send_json_success($response->body());
    }

    public function getStats(): void
    {
        check_ajax_referer('spm_admin_nonce', 'nonce');

        $api_key = AppData::get('api_key');

        if (! $api_key) {
            wp_send_json_error(['message' => 'Not connected.'], 403);
        }

        $response = Http::post('/website/stats', [
            'body' => ['api_key' => $api_key],
        ]);

        if ($response->failed()) {
            wp_send_json_error(['message' => 'Failed to fetch stats.'], 502);
        }

        wp_send_json_success($response->body());
    }
}

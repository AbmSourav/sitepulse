<?php

namespace Sitepulse\SitepulseMonitor\Services;

use Sitepulse\SitepulseMonitor\Lib\AppData;
use Sitepulse\SitepulseMonitor\Lib\BaseService;

class AdminMenu implements BaseService
{
    public function register()
    {
        add_action('admin_menu', [$this, 'addMenu']);
        add_action('admin_init', [$this, 'connectWebsite']);
    }

    public function addMenu()
    {
        add_menu_page(
            'SitePulse Monitor',
            'SitePulse Monitor',
            'manage_options',
            'sitepulse-monitor',
            [$this, 'renderAdminPage'],
            'dashicons-chart-area',
            30
        );

        add_submenu_page(
            'sitepulse-monitor',
            'Incidents',
            'Incidents',
            'manage_options',
            'sitepulse-incidents',
            [$this, 'renderAdminPage'],
        );

        add_submenu_page(
            'sitepulse-monitor',
            'Audit Reports',
            'Audit Reports',
            'manage_options',
            'sitepulse-audit-reports',
            [$this, 'renderAdminPage'],
        );
    }

    public function renderAdminPage()
    {
        require_once SPM_DIR . 'resources/view.php';
    }

    public function connectWebsite()
    {
        $apiKey = $_GET['spmApiKey'] ?? '';
        if (AppData::get('api_key') || ! isset($_GET['spmApiKey'])) {
            return;
        }

        $data = [
            'api_key' => sanitize_text_field($apiKey),
            'status'  => 'connected',
        ];
        AppData::set($data);

        $cleanUrl = remove_query_arg('spmApiKey');
        wp_safe_redirect($cleanUrl);
        exit;
    }
}

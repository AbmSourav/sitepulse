<?php

namespace Sitepulse\SitepulseMonitor\Services;

use Sitepulse\SitepulseMonitor\Lib\BaseService;

class AdminMenu implements BaseService
{
    public function register()
    {
        add_action('admin_menu', [$this, 'addMenu']);
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
    }

    public function renderAdminPage()
    {
        require_once SPM_DIR . 'resources/view.php';
    }
}

<?php

namespace Sitepulse\SitepulseMonitor\Services;

use Sitepulse\SitepulseMonitor\Lib\AppData;
use Sitepulse\SitepulseMonitor\Lib\BaseService;

if (! defined('ABSPATH')) exit;

class AssetsManager implements BaseService
{
    public function register()
    {
        add_action('admin_enqueue_scripts', [$this, 'enqueueAdminAssets']);
    }

    public function enqueueAdminAssets($route)
    {
        // Only load for plugin's admin page
        $allowed_pages = [
            'toplevel_page_sitepulse-monitor',
            'sitepulse-monitor_page_sitepulse-incidents',
            'sitepulse-monitor_page_sitepulse-audit-reports',
        ];

        if (!in_array($route, $allowed_pages)) {
            return;
        }

        remove_all_actions('admin_notices');
        remove_all_actions('all_admin_notices');

        $asset_file = SPM_DIR . 'resources/build/app.asset.php';
        if (!file_exists($asset_file)) {
            return;
        }
        $asset_data = require $asset_file;

        wp_enqueue_script(
            'spm-admin',
            SPM_URL . 'resources/build/app.js',
            $asset_data['dependencies'],
            $asset_data['version'],
            true
        );

        wp_enqueue_style(
            'spm-admin',
            SPM_URL . 'resources/build/style-app.css',
            [],
            SPM_VERSION
        );

        $notice = isset($_GET['spmNotice']) ? sanitize_text_field($_GET['spmNotice']) : null;
        $noticeType = isset($_GET['spmNoticeType']) ? sanitize_text_field($_GET['spmNoticeType']) : null;
        unset($_GET['spmNotice']);
        unset($_GET['spmNoticeType']);

        wp_localize_script(
            'spm-admin',
            'spmAdmin',
            [
                'ajaxUrl'   => admin_url('admin-ajax.php'),
                'nonce'     => wp_create_nonce('spm_admin_nonce'),
                'appUrl'    => SPM_APP_URL,
                'hasApiKey' => AppData::get('api_key') ? true : false,
                'connected' => AppData::get('status') === 'connected' ? true : false,
                'notice'    => $notice,
                'noticeType' => $noticeType
            ]
        );
    }
}

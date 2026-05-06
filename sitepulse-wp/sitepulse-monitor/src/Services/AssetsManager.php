<?php

namespace Sitepulse\SitepulseMonitor\Services;

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
        ];

        if (!in_array($route, $allowed_pages)) {
            return;
        }

        $asset_file = SPM_DIR . 'resources/build/app.asset.php';
        if (!file_exists($asset_file)) {
            return;
        }
        $asset_data = require $asset_file;

        wp_enqueue_script(
            'spm-admin',
            SPM_URL . 'resources/build/app.js',
            $asset_data['dependencies'],
            SPM_VERSION,
            true
        );

        wp_enqueue_style(
            'spm-admin',
            SPM_URL . 'resources/build/style-app.css',
            [],
            SPM_VERSION
        );

        wp_localize_script(
            'spm-admin',
            'spmAdmin',
            [
                'ajaxUrl'   => admin_url('admin-ajax.php'),
                'nonce'     => wp_create_nonce('spm_admin_nonce'),
                'appUrl'    => SPM_APP_URL,
                'connected' => get_option('spm_api_key', false) ? true : false,
            ]
        );
    }
}

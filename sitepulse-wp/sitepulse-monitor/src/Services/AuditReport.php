<?php

namespace Sitepulse\SitepulseMonitor\Services;

use Sitepulse\SitepulseMonitor\Lib\BaseService;
use Sitepulse\SitepulseMonitor\Lib\Http;

class AuditReport implements BaseService
{
    public function register()
    {
        add_action('admin_init', function () {
            // echo "<pre>";
            // print_r($this->getFatalErrors());
            // echo "</pre>";
        });
    }

    public function send()
    {
        $apiKey = get_option('spm_api_key');
        if (! $apiKey) {
            return;
        }

        $report = $this->generateReport();

        Http::post('/sites/audit', [
            'body' => array_merge(['api_key' => $apiKey], $report),
        ]);
    }

    public function generateReport(): array
    {
        return [
            'audited_at'    => current_time('Y-m-d H:i:s'),
            'debug_mode'    => defined('WP_DEBUG') && WP_DEBUG,
            'cron_status'   => $this->getCronStatus(),
            'admin_email'   => get_option('admin_email'),
            'locale'        => get_locale(),

            'db_size_bytes'   => $this->getDbSizeBytes(),
            'php_errors'      => $this->getFatalErrors(),

            'ssl_valid'    => is_ssl(),
            'site_health'  => $this->getSiteHealth(),

            'plugins'      => $this->getPlugins(),
            'themes'       => $this->getThemes(),
        ];
    }

    private function getSiteHealth(): array
    {
        if (! function_exists('get_core_updates')) {
            require_once ABSPATH . 'wp-admin/includes/update.php';
        }
        if (! function_exists('wp_check_php_version')) {
            require_once ABSPATH . 'wp-admin/includes/misc.php';
        }
        require_once ABSPATH . 'wp-admin/includes/class-wp-site-health.php';

        $health = \WP_Site_Health::get_instance();

        $tests = [
            'wordpress_version'  => $health->get_test_wordpress_version(),
            'php_version'        => $health->get_test_php_version(),
            'sql_server'         => $health->get_test_sql_server(),
            'https_status'       => $health->get_test_https_status(),
            'ssl_support'        => $health->get_test_ssl_support(),
            'scheduled_events'   => $health->get_test_scheduled_events(),
            'background_updates' => $health->get_test_background_updates(),
            'loopback_requests'  => $health->get_test_loopback_requests(),
            'rest_availability'  => $health->get_test_rest_availability(),
            'debug_mode'         => $health->get_test_is_in_debug_mode(),
            'file_uploads'       => $health->get_test_file_uploads(),
            'php_extensions'     => $health->get_test_php_extensions(),
        ];

        global $wpdb;

        $result = [];
        foreach ($tests as $key => $test) {
            $result[$key] = [
                'label'  => $test['label'],
                'status' => $test['status'],
            ];

            if ($key === 'wordpress_version') {
                $result[$key]['version'] = wp_get_wp_version();
            } elseif ($key === 'php_version') {
                $result[$key]['version'] = \PHP_VERSION;
            } elseif ($key === 'sql_server') {
                $result[$key]['version'] = $wpdb->db_version();
            }
        }

        return $result;
    }

    private function getFatalErrors(): array
    {
        $errors = [];

        if (function_exists('wp_paused_plugins')) {
            foreach (wp_paused_plugins()->get_all() as $plugin => $error) {
                $errors[] = [
                    'source'  => 'plugin',
                    'name'    => $plugin,
                    'type'    => $error['type'] ?? null,
                    'message' => $error['message'] ?? null,
                    'file'    => $error['file'] ?? null,
                    'line'    => $error['line'] ?? null,
                ];
            }
        }

        if (function_exists('wp_paused_themes')) {
            foreach (wp_paused_themes()->get_all() as $theme => $error) {
                $errors[] = [
                    'source'  => 'theme',
                    'name'    => $theme,
                    'type'    => $error['type'] ?? null,
                    'message' => $error['message'] ?? null,
                    'file'    => $error['file'] ?? null,
                    'line'    => $error['line'] ?? null,
                ];
            }
        }

        return $errors;
    }

    private function getCronStatus(): string
    {
        if (defined('DISABLE_WP_CRON') && constant('DISABLE_WP_CRON')) {
            return 'disabled';
        }
        return 'enabled';
    }

    private function getDbSizeBytes(): int
    {
        global $wpdb;

        $rows = $wpdb->get_results(
            $wpdb->prepare(
                'SELECT SUM(data_length + index_length) AS size
                 FROM information_schema.TABLES
                 WHERE table_schema = %s',
                DB_NAME
            )
        );

        return (int) ($rows[0]->size ?? 0);
    }

    private function getPlugins(): array
    {
        if (! function_exists('get_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }
        if (! function_exists('get_plugin_updates')) {
            require_once ABSPATH . 'wp-admin/includes/update.php';
        }

        $allPlugins    = get_plugins();
        $activePlugins = get_option('active_plugins', []);
        $updates = get_plugin_updates() ?: [];

        $result = [];
        foreach ($allPlugins as $file => $data) {
            $newVersion = $updates[$file]->update->new_version ?? '';
            $latestVersion = isset($updates[$file]) ? $newVersion : $data['Version'];

            $result[] = [
                'name'              => $data['Name'],
                'installed_version' => $data['Version'],
                'latest_version'    => $latestVersion,
                'is_active'         => in_array($file, $activePlugins, true),
                'require_update'    => $latestVersion > $data['Version']
            ];
        }

        return $result;
    }

    private function getThemes(): array
    {
        if (! function_exists('get_theme_updates')) {
            require_once ABSPATH . 'wp-admin/includes/update.php';
        }

        $allThemes  = wp_get_themes();
        $updates    = get_theme_updates() ?: [];
        $stylesheet = get_stylesheet();

        $result = [];
        foreach ($allThemes as $slug => $theme) {
            $newVersion = $updates[$slug]->update['new_version'] ?? '';
            $latestVersion = isset($updates[$slug]) ? $newVersion : $theme->get('Version');

            $result[] = [
                'name'              => $theme->get('Name'),
                'installed_version' => $theme->get('Version'),
                'latest_version'    => $latestVersion,
                'is_active'         => $slug === $stylesheet,
                'require_update'    => $latestVersion > $theme->get('Version')
            ];
        }

        return $result;
    }
}

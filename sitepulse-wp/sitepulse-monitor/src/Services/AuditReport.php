<?php

namespace Sitepulse\SitepulseMonitor\Services;

use Sitepulse\SitepulseMonitor\Lib\BaseService;
use Sitepulse\SitepulseMonitor\Lib\Http;

class AuditReport implements BaseService
{
    public function register()
    {
        add_action('admin_init', [$this, 'connectWebsite']);
    }

    public function connectWebsite()
    {
        $apiKey = $_GET['spmApiKey'] ?? '';
        if (get_option('spm_api_key') || ! isset($_GET['spmApiKey'])) {
            return;
        }

        update_option('spm_api_key', sanitize_text_field($apiKey));

        $cleanUrl = remove_query_arg('spmApiKey');
        wp_safe_redirect($cleanUrl);
        exit;
    }

    private function sendReport()
    {
            $response = Http::post('/sites/audit', [
                'api_key' => 'WBqLiSvYMfYRWxb10UNtXsTODvZBJomO',
                'site_url' => 'https://example.com',
                'metrics' => [
                    'plugins' => [
                        ['name' => 'Plugin 1', 'version' => '1.0', 'vulnerable' => false],
                        ['name' => 'Plugin 2', 'version' => '2.3', 'vulnerable' => true],
                    ],
                    'db_size' => 50, // in MB
                    'php_errors' => 5,
                    'ssl_status' => 'valid',
                ],
            ]);

            if ($response->successful()) {
                // Report sent successfully
            } else {
                // Handle error
            }
    }

    private function generateReport()
    {

    }
}

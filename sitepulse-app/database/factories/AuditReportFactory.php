<?php

namespace Database\Factories;

use App\Models\AuditReport;
use App\Models\Website;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AuditReport>
 */
class AuditReportFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'website_id' => Website::factory(),
            'audited_at' => now(),
            'health'     => ['status' => 'good', 'debug_mode' => false],
            'server'     => ['php_version' => ['version' => '8.3'], 'db_size_bytes' => 10_485_760],
            'security'   => ['ssl_valid' => true],
            'plugins'    => ['total' => 3, 'outdated' => 0, 'items' => []],
            'themes'     => ['total' => 1, 'outdated' => 0, 'items' => []],
            'ai_summary' => null,
        ];
    }
}

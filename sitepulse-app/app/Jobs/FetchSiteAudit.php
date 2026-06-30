<?php

namespace App\Jobs;

use App\Actions\StoreAuditReport;
use App\Models\Website;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class FetchSiteAudit implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 25;

    public function __construct(public Website $website) {}

    public function handle(StoreAuditReport $action): void
    {
        $baseUrl = $this->website->meta_data['siteBaseUrl'];
        $endpoint = $baseUrl.'index.php?rest_route=/sitepulse-monitor/v1/audit';

        $response = $this->httpClient()->post($endpoint, [
            'api_key' => $this->website->api_key,
        ]);

        if (! $response->successful()) {
            Log::warning('FetchSiteAudit: non-2xx response', [
                'website_id' => $this->website->id,
                'status'     => $response->status(),
            ]);

            $this->website->next_audit_at = now()->addHours(6);
            $this->website->save();

            $data = $response->json();
            $action->handle($this->website, [
                'audited_at' => now()->format('Y-m-d H:i:s'),
                'server'     => [
                    'php_errors' => [
                        'status'  => $data['data']['status'] ?? 0,
                        'message' => $data['data']['error']['message'] ?? '',
                        'file'    => $data['data']['error']['file'] ?? '',
                    ],
                ],
            ]);

            return;
        }

        $data = $response->json();

        if (empty($data) || ! isset($data['audited_at'])) {
            Log::warning('FetchSiteAudit: invalid payload', ['website_id' => $this->website->id]);

            $this->website->next_audit_at = now()->addHours(6);
            $this->website->save();

            return;
        }

        // store data in audit_reports
        $action->handle($this->website, $data);
    }

    private function httpClient(): PendingRequest
    {
        $client = Http::timeout(25);

        if (config('services.proxy.enabled')) {
            $client = $client->withOptions([
                'proxy' => sprintf(
                    'http://%s:%s@%s:%d',
                    config('services.proxy.username'),
                    config('services.proxy.password'),
                    parse_url(config('services.proxy.url'), PHP_URL_HOST),
                    (int) config('services.proxy.port'),
                ),
            ]);
        }

        return $client;
    }

    public function tries(): int
    {
        return app()->isProduction() ? 3 : 1;
    }

    public function failed(Throwable $e): void
    {
        Log::error('FetchSiteAudit: job failed', [
            'website_id' => $this->website->id,
            'error'      => $e->getMessage(),
        ]);

        $this->website->next_audit_at = now()->addHours(6);
        $this->website->save();
    }
}

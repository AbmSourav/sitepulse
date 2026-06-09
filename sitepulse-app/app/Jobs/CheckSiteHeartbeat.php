<?php

namespace App\Jobs;

use App\Enums\UptimeStatus;
use App\Models\SiteIncident;
use App\Models\Website;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Throwable;

class CheckSiteHeartbeat implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 15;

    public function __construct(public Website $website) {}

    public function handle(): void
    {
        $parts = parse_url($this->website->url);
        $origin = $parts['scheme'].'://'.$parts['host'].(isset($parts['port']) ? ':'.$parts['port'] : '');

        $response = null;
        $reason = null;
        $httpStatus = null;
        $isUp = false;

        try {
            if ($this->website->api_key) {
                $baseUrl = $this->website->meta_data['siteBaseUrl'];
                $endpoint = $baseUrl . 'index.php?rest_route=/sitepulse-monitor/v1/heartbeat';

                // WordPress plugin mode
                $response = $this->httpClient()
                    ->withHeaders(['X-SPM-API-Key' => $this->website->api_key])
                    ->get($endpoint);

                $httpStatus = $response->status();
                $body = $response->body();

                if ($this->bodyHasPhpError($body)) {
                    $reason = 'php_error';
                } elseif ($response->successful() && $response->json('ok') === true) {
                    $isUp = true;
                } elseif ($response->serverError()) {
                    $reason = 'http_5xx';
                } elseif ($response->successful()) {
                    $reason = 'invalid_response';
                } else {
                    $reason = 'http_'.$httpStatus;
                }
            } else {
                // Plain monitoring mode — any 2xx = up
                $response = $this->httpClient()->get($origin.'/');
                $httpStatus = $response->status();

                if ($response->successful()) {
                    $isUp = true;
                } else {
                    $reason = 'http_'.$httpStatus;
                }
            }
        } catch (ConnectionException $e) {
            $reason = 'connection_refused';
        } catch (Throwable $e) {
            $reason = 'request_failed';
        }

        $this->website->last_checked_at = now();

        $intervalTime = $this->website->user->planLimits()['minInterval'];
        if ($isUp) {
            $this->handleSuccess();
        } else {
            $this->handleFailure($reason, $httpStatus, $intervalTime);
        }

        $this->website->next_check_at = now()->addMinutes($intervalTime);
        $this->website->save();
    }

    private function httpClient(): PendingRequest
    {
        $client = Http::timeout(10);

        if (config('services.proxy.enabled')) {
            $client = $client->withOptions([
                'proxy' => sprintf(
                    'https://%s:%s@%s:%d',
                    config('services.proxy.username'),
                    config('services.proxy.password'),
                    parse_url(config('services.proxy.url'), PHP_URL_HOST),
                    (int) config('services.proxy.port'),
                ),
            ]);
        }

        return $client;
    }

    private function bodyHasPhpError(string $body): bool
    {
        if (empty($body)) {
            return false;
        }

        $patterns = [
            '/Fatal error\s*:/i',
            '/Parse error\s*:/i',
            '/Uncaught\s+\w+(?:\\\\\w+)*(?:Exception|Error)/i',
            '/There has been a critical error on this website/i',
            '/The site is experiencing technical difficulties/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $body)) {
                return true;
            }
        }

        return false;
    }

    private function handleSuccess(): void
    {
        if ($this->website->uptime_status === UptimeStatus::Down->value) {
            $incident = SiteIncident::where('website_id', $this->website->id)
                ->whereNull('resolved_at')
                ->first();

            if ($incident) {
                $incident->update(['resolved_at' => now()]);

                $this->clearCache();

                if ($this->website->consecutive_failures > 1) {
                    SendIncidentNotification::dispatch($incident->fresh(), 'up');
                }
            }
        }

        if ($this->website->api_key) {
            $this->clearCache();
        }

        $this->website->consecutive_failures = 0;
        $this->website->uptime_status = UptimeStatus::Up->value;
    }

    private function handleFailure(?string $reason, ?int $httpStatus, int &$intervalTime): void
    {
        $this->website->consecutive_failures++;

        // after first downtime ditected, second request should be made after 3 minutes
        if ($this->website->consecutive_failures === 1) {
            $intervalTime = 2;

            $this->website->uptime_status = UptimeStatus::Down->value;

            $existingIncident = SiteIncident::where('website_id', $this->website->id)
                ->whereNull('resolved_at')
                ->exists();

            if (! $existingIncident) {
                SiteIncident::create([
                    'website_id'  => $this->website->id,
                    'started_at'  => now(),
                    'reason'      => $reason,
                    'http_status' => $httpStatus,
                ]);

                $this->clearCache();
            }
        } elseif ($this->website->consecutive_failures === 2) {
            $incident = SiteIncident::where('website_id', $this->website->id)
                ->whereNull('resolved_at')
                ->first();

            if ($incident) {
                SendIncidentNotification::dispatch($incident, 'down');
            }
        }

        if (
            $this->website->consecutive_failures >= 2
        ) {
            // after 2nd reqest the site is confirm down so give some time to recover,
            // make next request after 10 minutes
            $intervalTime = 9;
        }

        if (
            $this->website->consecutive_failures >= 6
        ) {
            // after more than 40 minutes of downtime the site may need more time to recover,
            // so next request after 20 minutes
            $intervalTime = 19;
        }
    }

    private function clearCache(): void
    {
        Cache::store('api-cache')->forget("incidents:website:{$this->website->id}:page:1");
        Cache::store('api-cache')->forget("website:{$this->website->id}:stats");
    }
}

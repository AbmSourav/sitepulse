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

    public int $tries = 2;

    public int $timeout = 20;

    // Wait 2s before retrying
    public int $backoff = 2;

    public function __construct(public Website $website) {}

    public function handle(): void
    {
        $parts = parse_url($this->website->url);
        $origin = $parts['scheme'].'://'.$parts['host'].(isset($parts['port']) ? ':'.$parts['port'] : '');

        $error = null;
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
            // A timeout (cURL 28) is inconclusive, not proof the site is down,
            // so we don't flap a healthy site into an incident on a timeout alone.
            if ($this->isTimeout($e)) {
                $this->handleTimeOut($e);
            }

            $reason = 'connection_refused';
            $error = $e;
        } catch (Throwable $e) {
            $reason = 'request_failed';
            $error = $e;
        }

        // A site that was up last check and now fails is only a candidate for downtime.
        // Retry (via $tries) to rule out a transient blip before we
        // touch the DB — re-checking on the next attempt instead of trusting one failed request.
        // We persist nothing here so the state stays "up" and the
        // retry re-evaluates the same transition.
        $isTransitionFromUp = $this->website->uptime_status === UptimeStatus::Up->value && ! $isUp;

        if (
            $isTransitionFromUp &&
            in_array($reason, ['connection_refused', 'request_failed']) &&
            $this->attempts() === 1
        ) {
            throw new \RuntimeException($this->failureMessage($reason, $httpStatus, $error));
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

        // On the final attempt of a confirmed down transition, throw so the job
        // lands in failed_jobs and is visible in Horizon. State is already saved
        // above, so the recorded failure does not lose any bookkeeping.
        if ($isTransitionFromUp) {
            throw new \RuntimeException($this->failureMessage($reason, $httpStatus, $error));
        }
    }

    /**
     * A ConnectionException caused by a timeout (as opposed to a refused/failed
     * connection). Guzzle surfaces timeouts as cURL error 28.
     */
    private function isTimeout(Throwable $e): bool
    {
        return str_contains(strtolower($e->getMessage()), 'timed out')
            || str_contains($e->getMessage(), 'cURL error 28');
    }

    private function failureMessage(?string $reason, ?int $httpStatus, ?Throwable $error): string
    {
        return "Heartbeat failed for website {$this->website->id} ({$this->website->url}) "
            ."\nReason: {$reason} \nHTTP status: {$httpStatus} "
            ."\nError: ".($error?->getMessage() ?? 'N/A');
    }

    private function httpClient(): PendingRequest
    {
        $client = Http::timeout(15);

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

            // incident resolved.
            if ($incident) {
                $incident->update(['resolved_at' => now()]);

                $this->clearCache();

                if ($this->website->consecutive_failures > 1) {
                    SendIncidentNotification::dispatch($incident->fresh(), 'up');
                }
            }
        }

        if ($this->website->api_key) {
            $this->clearCache(false);
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

    private function handleTimeOut(Throwable $error): void
    {
        $intervalTime = $this->website->user->planLimits()['minInterval'];
        if ($this->website->uptime_status === UptimeStatus::Down->value) {
            $intervalTime = 2;
        }

        $this->website->last_checked_at = now();
        $this->website->next_check_at = now()->addMinutes($intervalTime);
        $this->website->save();

        throw new \RuntimeException($this->failureMessage('time_out', null, $error));
    }

    private function clearCache($listCache = true): void
    {
        if ($listCache) {
            Cache::store('api-cache')->forget("incidents:website:{$this->website->id}:page:1");
        }
        Cache::store('api-cache')->forget("website:{$this->website->id}:stats");
    }
}

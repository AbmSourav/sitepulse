<?php

namespace App\Jobs;

use App\Enums\UptimeStatus;
use App\Models\SiteIncident;
use App\Models\Website;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Throwable;

class CheckSiteHeartbeat implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 15;

    public function __construct(public Website $website)
    {
    }

    public function handle(): void
    {
        $parts  = parse_url($this->website->url);
        $origin = $parts['scheme'] . '://' . $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : '');
        $endpoint = $origin . '/index.php?rest_route=/sitepulse-monitor/v1/heartbeat';

        $response   = null;
        $reason     = null;
        $httpStatus = null;
        $isUp       = false;

        try {
            $response = Http::timeout(10)
                ->withHeaders(['X-SPM-API-Key' => $this->website->api_key])
                ->get($endpoint);

            $httpStatus = $response->status();
            $body       = $response->body();

            if ($this->bodyHasPhpError($body)) {
                $reason = 'php_error';
            } elseif ($response->successful() && $response->json('ok') === true) {
                $isUp = true;
            } elseif ($response->serverError()) {
                $reason = 'http_5xx';
            } elseif ($response->successful()) {
                $reason = 'invalid_response';
            } else {
                $reason = 'http_' . $httpStatus;
            }
        } catch (ConnectionException $e) {
            $reason = 'connection_refused';
        } catch (Throwable $e) {
            $reason = 'request_failed';
        }

        $this->website->last_checked_at = now();

        $intervalTime = 4;
        if ($isUp) {
            $this->handleSuccess();
        } else {
            $this->handleFailure($reason, $httpStatus, $intervalTime);
        }

        $this->website->next_check_at = now()->addMinutes($intervalTime);
        $this->website->save();
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
        $this->website->consecutive_failures = 0;

        if ($this->website->uptime_status === UptimeStatus::Down->value) {
            SiteIncident::where('website_id', $this->website->id)
                ->whereNull('resolved_at')
                ->update(['resolved_at' => now()]);
        }

        $this->website->uptime_status = UptimeStatus::Up->value;
    }

    private function handleFailure(?string $reason, ?int $httpStatus, int &$intervalTime): void
    {
        $this->website->consecutive_failures++;

        // after first downtime ditected, second request should be made after 3 minutes
        if ($this->website->consecutive_failures === 1) {
            $intervalTime = 2;
        }

        if (
            $this->website->consecutive_failures >= 2
            && $this->website->uptime_status !== UptimeStatus::Down->value
        ) {
            // after 2nd reqest the site is confirm down so give some time to recover make next request after 10 minutes
            $intervalTime = 9;
            $this->website->uptime_status = UptimeStatus::Down->value;

            SiteIncident::create([
                'website_id'  => $this->website->id,
                'started_at'  => now(),
                'reason'      => $reason,
                'http_status' => $httpStatus,
            ]);
        }
    }
}

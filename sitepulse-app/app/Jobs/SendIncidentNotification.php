<?php

namespace App\Jobs;

use App\Enums\NotificationChannelType;
use App\Models\NotificationChannel;
use App\Models\SiteIncident;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

class SendIncidentNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public function __construct(
        public readonly SiteIncident $incident,
        public readonly string $event,  // 'down' | 'up'
    ) {}

    public function handle(): void
    {
        $website = $this->incident->website;
        if (! $website) {
            return;
        }

        $channels = NotificationChannel::where('team_id', $website->team_id)
            ->where('is_active', true)
            ->get();

        foreach ($channels as $channel) {
            try {
                match ($channel->type) {
                    NotificationChannelType::Slack   => $this->sendSlack($channel->config, $website->url),
                    NotificationChannelType::Discord => $this->sendDiscord($channel->config, $website->url),
                    NotificationChannelType::Webhook => $this->sendWebhook($channel->config, $website->url),
                    NotificationChannelType::Email   => null, // stubbed until mail template is ready
                };
            } catch (Throwable $e) {
                Log::warning("SendIncidentNotification: channel {$channel->id} ({$channel->type->value}) failed — {$e->getMessage()}");
            }
        }
    }

    private function message(string $siteUrl): string
    {
        $parsedUrl = parse_url($siteUrl);
        $domain = $parsedUrl['host'] . (!empty($parsedUrl['port']) ? ':' . $parsedUrl['port'] : '');
        $baseUrl = $parsedUrl['scheme'] . '://' . $domain;

        if ($this->event === 'down') {
            $reason = $this->incident->reason ? " Reason: {$this->incident->reason}" : '';
            return "🔴 *{$domain} website is DOWN*\n{$reason} \n<{$baseUrl}|{$domain}>";
        }

        $duration = '';
        if ($this->incident->resolved_at) {
            $totalMinutes = (int) $this->incident->started_at->diffInMinutes($this->incident->resolved_at);
            if ($totalMinutes < 60) {
                $duration = "after {$totalMinutes}m";
            } elseif ($totalMinutes < 1440) {
                $hours   = (int) ($totalMinutes / 60);
                $minutes = $totalMinutes % 60;
                $duration = $minutes > 0 ? "after {$hours}h {$minutes}m" : "after {$hours}h";
            } else {
                $days  = (int) ($totalMinutes / 1440);
                $hours = (int) (($totalMinutes % 1440) / 60);
                $duration = $hours > 0 ? "after {$days} day {$hours}h" : "after {$days} day";
            }
        }

        return "✅ {$domain} is recovered an UP {$duration}";
    }

    private function sendSlack(array $config, string $siteUrl): void
    {
        $url = $config['webhook_url'] ?? null;
        if (! $url) {
            return;
        }

        Http::timeout(10)->post($url, ['text' => $this->message($siteUrl)]);
    }

    private function sendDiscord(array $config, string $siteUrl): void
    {
        $url = $config['webhook_url'] ?? null;
        if (! $url) {
            return;
        }

        Http::timeout(10)->post($url, ['content' => $this->message($siteUrl)]);
    }

    private function sendWebhook(array $config, string $siteUrl): void
    {
        $url = $config['url'] ?? null;
        if (! $url) {
            return;
        }

        $domain = parse_url($siteUrl, PHP_URL_HOST) ?? $siteUrl;

        $payload = [
            'event'      => $this->event,
            'site'       => $domain,
            'reason'     => $this->incident->reason,
            'started_at' => $this->incident->started_at->toIso8601String(),
            'resolved_at' => $this->incident->resolved_at?->toIso8601String(),
        ];

        $request = Http::timeout(10)->withBody(json_encode($payload), 'application/json');

        if (! empty($config['secret'])) {
            $request = $request->withHeader('X-SPM-Signature', hash_hmac('sha256', json_encode($payload), $config['secret']));
        }

        $request->post($url);
    }
}

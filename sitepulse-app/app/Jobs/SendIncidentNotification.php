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
use Illuminate\Support\Facades\Mail;
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

        $emailAddress = null;

        foreach ($channels as $channel) {
            try {
                match ($channel->type) {
                    NotificationChannelType::Slack   => $this->sendSlack($channel->config, $website->url),
                    NotificationChannelType::Discord => $this->sendDiscord($channel->config, $website->url),
                    NotificationChannelType::Webhook => $this->sendWebhook($channel->config, $website->url),
                    NotificationChannelType::Email   => $emailAddress = $channel->config['email'] ?? null,
                };
            } catch (Throwable $e) {
                Log::warning("SendIncidentNotification: channel {$channel->id} ({$channel->type->value}) failed — {$e->getMessage()}");
            }
        }

        $this->sendEmail($emailAddress ?? $website->user?->email);
    }

    private function message(string $siteUrl): string
    {
        $parsedUrl = parse_url($siteUrl);
        $domain = $parsedUrl['host'].(! empty($parsedUrl['port']) ? ':'.$parsedUrl['port'] : '');
        $baseUrl = $parsedUrl['scheme'].'://'.$domain;

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
                $hours = (int) ($totalMinutes / 60);
                $minutes = $totalMinutes % 60;
                $duration = $minutes > 0 ? "after {$hours}h {$minutes}m" : "after {$hours}h";
            } else {
                $days = (int) ($totalMinutes / 1440);
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
            'event'       => $this->event,
            'site'        => $domain,
            'reason'      => $this->incident->reason,
            'started_at'  => $this->incident->started_at->toIso8601String(),
            'resolved_at' => $this->incident->resolved_at?->toIso8601String(),
        ];

        $request = Http::timeout(10)->withBody(json_encode($payload), 'application/json');

        if (! empty($config['secret'])) {
            $request = $request->withHeader('X-SPM-Signature', hash_hmac('sha256', json_encode($payload), $config['secret']));
        }

        $request->post($url);
    }

    private function sendEmail(?string $email): void
    {
        if (! $email) {
            return;
        }

        $website = $this->incident->website;
        $siteUrl = $website?->url ?? '';
        $parsed = parse_url($siteUrl);
        $domain = ($parsed['host'] ?? $siteUrl).(! empty($parsed['port']) ? ':'.$parsed['port'] : '');

        $subject = $this->event === 'down' ? "🔴 {$domain} is DOWN" : "✅ {$domain} is back Online";

        try {
            Mail::send('emails.incident-notification', $this->emailViewData($domain, $siteUrl), function ($message) use ($email, $subject) {
                $message->to($email)->subject($subject);
            });
        } catch (Throwable $e) {
            Log::warning("SendIncidentNotification: email to {$email} failed — {$e->getMessage()}");
        }
    }

    private function emailViewData(string $domain, string $siteUrl): array
    {
        $minutes = $this->incident->resolved_at
            ? (int) $this->incident->started_at->diffInMinutes($this->incident->resolved_at)
            : 0;

        if ($minutes < 60) {
            $duration = "{$minutes}m";
        } elseif ($minutes < 1440) {
            $h = (int) ($minutes / 60);
            $m = $minutes % 60;
            $duration = $m > 0 ? "{$h}h {$m}m" : "{$h}h";
        } else {
            $d = (int) ($minutes / 1440);
            $h = (int) (($minutes % 1440) / 60);
            $duration = $h > 0 ? "{$d}d {$h}h" : "{$d}d";
        }

        $reasonLabel = match ($this->incident->reason) {
            'connection_refused' => 'Connection refused',
            'php_error'          => 'PHP fatal error detected',
            'invalid_response'   => 'Invalid response from server',
            'request_failed'     => 'Request failed',
            default              => $this->incident->reason
                ? 'HTTP '.ltrim($this->incident->reason, 'http_')
                : 'Unknown',
        };

        $subject = $this->event === 'down' ? "🔴 {$domain} is DOWN" : "✅ {$domain} is back Online";

        return [
            'subject'      => $subject,
            'event'        => $this->event,
            'domain'       => $domain,
            'siteUrl'      => $siteUrl,
            'sitepulseUrl' => config('app.url'),
            'reason'       => $this->incident->reason,
            'reasonLabel'  => $reasonLabel,
            'httpStatus'   => $this->incident->http_status,
            'startedAt'    => $this->incident->started_at->format('M j, Y H:i T'),
            'resolvedAt'   => $this->incident->resolved_at?->format('M j, Y H:i T') ?? '',
            'duration'     => $duration,
        ];
    }
}

<?php

namespace App\Jobs;

use App\Models\Website;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Iodev\Whois\Factory;

class CheckDomainExpiry implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public int $timeout = 30;

    public function __construct(public Website $website) {}

    public function handle(): void
    {
        $host = strtolower(parse_url($this->website->url, PHP_URL_HOST) ?? '');
        $parts = explode('.', $host);

        // Skip subdomains — only check base domains (2 labels, e.g. example.com)
        if (count($parts) !== 2) {
            $this->website->meta_data = array_merge(
                $this->website->meta_data ?? [],
                ['domain_expiry_checked_at' => now()->addYears(2)->toDateTimeString()]
            );
            $this->website->save();

            return;
        }

        $expiry = null;

        try {
            $info = Factory::get()->createWhois()->loadDomainInfo($host);
            $expiry = $info?->expirationDate
                ? Carbon::createFromTimestamp($info->expirationDate)->toDateString()
                : null;
        } catch (\Throwable) {
            // WHOIS failure is non-fatal; expiry stays null
        }

        $this->website->meta_data = array_merge(
            $this->website->meta_data ?? [],
            [
                'domain_expires_at'        => $expiry,
                'domain_expiry_checked_at' => now()->toDateTimeString(),
            ]
        );

        $this->website->save();
    }
}

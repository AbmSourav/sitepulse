<?php

namespace App\Console\Commands;

use App\Jobs\CheckDomainExpiry;
use App\Models\Website;
use Illuminate\Console\Command;

class CheckDueExpiries extends Command
{
    protected $signature   = 'domains:check-due';
    protected $description = 'Dispatch WHOIS expiry checks for sites not checked in the last 7 days';

    public function handle(): int
    {
        $cutoff = now()->subDays(7)->toDateTimeString();
        // $cutoff = now()->subMinutes(1)->toDateTimeString(); // For testing, check every 10 minutes
        $count  = 0;

        Website::where('status', 'connected')
            ->where(function ($q) use ($cutoff) {
                $q->whereNull('meta_data->domain_expiry_checked_at')
                  ->orWhereRaw("JSON_UNQUOTE(meta_data->>'$.domain_expiry_checked_at') <= ?", [$cutoff]);
            })
            ->chunkById(100, function ($sites) use (&$count) {
                foreach ($sites as $site) {
                    $host = strtolower(parse_url($site->url, PHP_URL_HOST) ?? '');
                    if (substr_count($host, '.') !== 1) {
                        continue;
                    }
                    CheckDomainExpiry::dispatch($site);
                    $count++;
                }
            });

        $this->info("Dispatched {$count} domain expiry checks.");

        return self::SUCCESS;
    }
}

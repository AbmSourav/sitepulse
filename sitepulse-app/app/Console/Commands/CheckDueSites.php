<?php

namespace App\Console\Commands;

use App\Jobs\CheckSiteHeartbeat;
use App\Models\Website;
use Illuminate\Console\Command;

class CheckDueSites extends Command
{
    protected $signature = 'sites:check-due';
    protected $description = 'Dispatch heartbeat checks for sites whose next_check_at is due';

    public function handle(): int
    {
        $count = 0;

        Website::where('status', 'connected')
            ->where(function ($query) {
                $query->whereNull('next_check_at')
                    ->orWhere('next_check_at', '<=', now());
            })
            ->chunkById(100, function ($sites) use (&$count) {
                foreach ($sites as $site) {
                    // job dispatch for monitoring website uptime
                    CheckSiteHeartbeat::dispatch($site);
                    $count++;
                }
            });

        $this->info("Dispatched {$count} heartbeat checks.");

        return self::SUCCESS;
    }
}

<?php

namespace App\Console\Commands;

use App\Jobs\CheckSiteHeartbeat;
use App\Models\Website;
use Illuminate\Console\Command;

class CheckDueSites extends Command
{
    protected $signature = 'sites:check-due';

    protected $description = 'Dispatch heartbeat checks for sites whose next_check_at is due';

    private const LOCAL_TLD_PATTERN = '/\.(test|local|localhost|example|invalid|internal|localhost:\d+)$/i';

    public function handle(): int
    {
        $isProduction = app()->isProduction();
        $count = 0;
        $skipped = 0;

        Website::where('status', 'connected')
            ->where(function ($query) {
                $query->whereNull('next_check_at')
                    ->orWhere('next_check_at', '<=', now());
            })
            ->chunkById(100, function ($sites) use ($isProduction, &$count, &$skipped) {
                foreach ($sites as $site) {
                    if ($isProduction && $this->isLocalDomain($site->url)) {
                        $skipped++;

                        continue;
                    }

                    CheckSiteHeartbeat::dispatch($site);
                    $count++;
                }
            });

        $this->info("Dispatched {$count} heartbeat checks.".($skipped ? " Skipped {$skipped} local domains." : ''));

        return self::SUCCESS;
    }

    private function isLocalDomain(string $url): bool
    {
        $host = parse_url($url, PHP_URL_HOST) ?? '';

        if ($host === 'localhost' || $host === '127.0.0.1' || $host === '::1') {
            return true;
        }

        return (bool) preg_match(self::LOCAL_TLD_PATTERN, $host);
    }
}

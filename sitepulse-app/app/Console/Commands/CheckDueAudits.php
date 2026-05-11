<?php

namespace App\Console\Commands;

use App\Jobs\FetchSiteAudit;
use App\Models\Website;
use Illuminate\Console\Command;

class CheckDueAudits extends Command
{
    protected $signature   = 'sites:audit-due';
    protected $description = 'Dispatch audit fetch jobs for sites whose next_audit_at is due';

    private const LOCAL_TLD_PATTERN = '/\.(test|local|localhost|example|invalid|internal|dev)$/i';

    public function handle(): int
    {
        $isProduction = app()->isProduction();
        $count        = 0;
        $skipped      = 0;

        Website::where('status', 'connected')
            ->where(function ($query) {
                $query->whereNull('next_audit_at')
                    ->orWhere('next_audit_at', '<=', now());
            })
            ->chunkById(100, function ($sites) use ($isProduction, &$count, &$skipped) {
                foreach ($sites as $site) {
                    if ($isProduction && $this->isLocalDomain($site->url)) {
                        $skipped++;
                        continue;
                    }

                    FetchSiteAudit::dispatch($site);
                    $count++;
                }
            });

        $this->info("Dispatched {$count} audit fetch jobs." . ($skipped ? " Skipped {$skipped} local domains." : ''));

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

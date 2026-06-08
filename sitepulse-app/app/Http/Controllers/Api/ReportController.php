<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ReportController extends Controller
{
    public function incidents(Request $request): JsonResponse
    {
        $website = $request->attributes->get('website');
        $page    = (int) $request->input('page', 1);

        if ($page === 1) {
            // Cache the first page of incidents for 24 hours to reduce database load,
            // as this is the most frequently accessed page.
            $incidents = Cache::store('api-cache')->remember(
                "incidents:website:{$website->id}:page:1",
                now()->addHours(24),
                fn () => $website->incidents()->orderByDesc('started_at')->paginate(10)->toArray(),
            );

            return response()->json($incidents);
        }

        $incidents = $website->incidents()->orderByDesc('started_at')->paginate(10, page: $page);

        return response()->json($incidents);
    }

    public function auditReports(Request $request): JsonResponse
    {
        $website = $request->attributes->get('website');
        $page    = (int) $request->input('page', 1);

        if ($page === 1) {
            $reports = Cache::store('api-cache')->remember(
                "audit-reports:website:{$website->id}:page:1",
                now()->addDays(7),
                fn () => $website->auditReports()->orderByDesc('audited_at')->paginate(10)->toArray(),
            );

            return response()->json($reports);
        }

        $reports = $website->auditReports()->orderByDesc('audited_at')->paginate(10, page: $page);

        return response()->json($reports);
    }

    public function stats(Request $request): JsonResponse
    {
        $website = $request->attributes->get('website');

        $cached = Cache::store('api-cache')->get("website:{$website->id}:stats");
        if ($cached) {
            return response()->json($cached);
        }

        $now   = now();
        $since = $now->copy()->subDays(7);

        $incidents7d = $website->incidents()
            ->where('started_at', '>=', $since)
            ->get();

        $incidents30d = $website->incidents()
            ->where('started_at', '>=', $now->copy()->subDays(30))
            ->count();

        $totalSeconds    = $since->diffInSeconds($now);
        $downtimeSeconds = $incidents7d->sum(fn ($i) => $i->started_at->diffInSeconds($i->resolved_at ?? $now));
        $uptimePct       = $totalSeconds > 0
            ? round((max(0, $totalSeconds - $downtimeSeconds) / $totalSeconds) * 100, 2)
            : 100.0;

        $domainExpiresAt    = $website->meta_data['domain_expires_at'] ?? null;
        $domainExpiringSoon = $domainExpiresAt
            && now()->diffInDays($domainExpiresAt, false) <= 30
            && now()->diffInDays($domainExpiresAt, false) >= 0;

        $data = [
            'uptime_7d'            => $uptimePct,
            'downtime_minutes_7d'  => (int) round($downtimeSeconds / 60),
            'incidents_7d'         => $incidents7d->count(),
            'incidents_30d'        => $incidents30d,
            'domain_expires_at'    => $domainExpiresAt,
            'domain_expiring_soon' => $domainExpiringSoon,
            'last_checked_at'      => $website->last_checked_at?->toIso8601String(),
        ];

        // set cache
        Cache::store('api-cache')->put("website:{$website->id}:stats", $data, now()->addHours(24));

        return response()->json($data);
    }
}

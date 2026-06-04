<?php

namespace App\Http\Controllers;

use App\Models\SiteIncident;
use App\Models\Website;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user   = $request->user();
        $teamId = $user->currentTeam->id;
        $now    = now();
        $since7 = $now->copy()->subDays(7);

        $websites = Website::where('team_id', $teamId)
            ->with(['incidents' => fn ($q) => $q->where('started_at', '>=', $since7->toDateTimeString())])
            ->get();

        $sitesOnline     = $websites->where('uptime_status', 'up')->count();
        $sitesTotal      = $websites->count();
        $activeIncidents = $websites
            ->where('status', 'connected')
            ->sum(fn (Website $site) => $site->incidents->whereNull('resolved_at')->count());

        $siteStats = $websites->map(function (Website $website) use ($now, $since7) {
            $siteStat = [
                'id'              => $website->id,
                'url'             => parse_url($website->url, PHP_URL_HOST),
                'status'          => $website->status,
                'uptime_status'   => $website->uptime_status,
                'last_checked_at' => $website->last_checked_at?->toIso8601String(),
                'incidents_7d'    => $website->incidents->count(),
            ];

            if ($website->status === 'disconnected') {
                $siteStat['uptime_7d'] = null;
                return $siteStat;
            }

            $windowStart   = $website->created_at->gt($since7) ? $website->created_at : $since7;
            $windowSeconds = $windowStart->diffInSeconds($now);

            $downtimeSeconds = $website->incidents->sum(function (SiteIncident $i) use ($now, $since7) {
                $start = $i->started_at->gt($since7) ? $i->started_at : $since7;
                $end   = $i->resolved_at ?? $now;

                return max(0, $start->diffInSeconds($end));
            });

            $uptime7d = 100.0;
            if ($windowSeconds > 0) {
                $uptime7d = round(max(0, ($windowSeconds - $downtimeSeconds) / $windowSeconds * 100), 2);
            }

            $siteStat['uptime_7d'] = $uptime7d;

            return $siteStat;
        });

        $connected  = $siteStats->whereNotNull('uptime_7d');
        $avgUptime7d = $connected->count() > 0
            ? round($connected->avg('uptime_7d'), 2)
            : null;

        $domainsExpiringSoon = Website::where('team_id', $teamId)
            ->where('status', 'connected')
            ->whereNotNull('meta_data->domain_expires_at')
            ->whereRaw("JSON_UNQUOTE(meta_data->>'$.domain_expires_at') <= ?", [$now->copy()->addDays(30)->toDateString()])
            ->count();

        return Inertia::render('dashboard', [
            'emailVerified'       => (bool) $user->email_verified_at,
            'sitesOnline'         => $sitesOnline,
            'sitesTotal'          => $sitesTotal,
            'activeIncidents'     => $activeIncidents,
            'avgUptime7d'         => $avgUptime7d,
            'domainsExpiringSoon' => $domainsExpiringSoon,
            'siteStats'           => $siteStats->values(),
        ]);
    }
}

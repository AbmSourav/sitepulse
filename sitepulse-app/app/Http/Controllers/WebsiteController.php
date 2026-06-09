<?php

namespace App\Http\Controllers;

use App\Jobs\CheckDomainExpiry;
use App\Jobs\FetchSiteAudit;
use App\Models\SiteIncident;
use App\Models\Website;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Inertia\Inertia;

class WebsiteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $websites = Website::where('team_id', $user->currentTeam->id)
            ->with(['incidents', 'latestIncident', 'user'])
            ->get();

        return Inertia::render('websites/websites', [
            'websites' => $this->formatWebsites($websites),
            'uptime'   => $this->calcUptime($websites),
        ]);
    }

    public function addMonitor(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'url' => 'required|url|unique:websites,url',
        ]);

        $website = Website::create([
            'user_id'      => $request->user()->id,
            'team_id'      => $request->user()->currentTeam->id,
            'url'          => $data['url'],
            'api_key'      => null,
            'status'       => 'connected',
            'connected_at' => now(),
        ]);

        CheckDomainExpiry::dispatch($website);

        return redirect()->route('websites.index');
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request)
    {
        $data = $request->validate([
            'siteUrl' => 'required|url',
            'siteBaseUrl' => 'required|url',
        ]);

        return Inertia::render('websites/authorize', [
            'siteUrl' => $data['siteUrl'],
            'siteBaseUrl' => $data['siteBaseUrl'],
        ]);
    }

    /**
     * Abort with 403 if the given team ID does not belong to the authenticated user.
     */
    private function authorizeTeam(int $teamId): void
    {
        abort_if($teamId !== request()->user()->team_id, 403);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'siteUrl' => 'required|url|unique:websites,url',
            'siteBaseUrl' => 'required|url',
            'teamId'  => 'required|exists:teams,id',
        ]);

        $this->authorizeTeam($data['teamId']);

        try {
            $website = Website::create([
                'user_id'      => $request->user()->id,
                'team_id'      => $data['teamId'],
                'url'          => $data['siteUrl'],
                'api_key'      => Str::random(32),
                'status'       => 'connected',
                'connected_at' => now(),
                'meta_data'    => ['siteBaseUrl' => $data['siteBaseUrl']],
            ]);

            CheckDomainExpiry::dispatch($website);
            FetchSiteAudit::dispatch($website);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to create website. '.$e->getMessage(),
            ], 500);
        }

        $redirectUrl = rtrim($data['siteUrl'], '/').'&'.http_build_query([
            'spmApiKey'     => $website->api_key,
            'spmNotice'     => 'Website is connected',
            'spmNoticeType' => 'success',
        ]);

        return Inertia::location($redirectUrl);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request)
    {
        $data = $request->validate([
            'websiteId' => 'required|exists:websites,id',
            'status'    => 'required|in:connected,disconnected',
        ]);

        $website = Website::find($data['websiteId']);
        $this->authorizeTeam($website->team_id);

        $updates = ['status' => $data['status']];
        if ($data['status'] === 'connected') {
            $updates['connected_at'] = now();
        }
        $website->update($updates);

        $user = request()->user();

        $websites = Website::where('team_id', $user->currentTeam->id)
            ->with(['incidents', 'latestIncident', 'user'])
            ->get();

        return Inertia::render('websites/websites', [
            'websites' => $this->formatWebsites($websites),
            'uptime'   => $this->calcUptime($websites),
        ]);
    }

    private function formatWebsites(Collection $websites): Collection
    {
        return $websites->map(function (Website $website) {
            $url = parse_url($website->url);
            $domain = $url['host'].(! empty($url['port']) ? ':'.$url['port'] : '');

            $latestIncident = $website->latestIncident ?? [];
            if ($latestIncident) {
                $latestIncident = [
                    'id'          => $latestIncident->id,
                    'started_at'  => $latestIncident->started_at->toIso8601String(),
                    'resolved_at' => $latestIncident->resolved_at?->toIso8601String(),
                    'reason'      => $latestIncident->reason,
                    'http_status' => $latestIncident->http_status,
                ];
            }

            return [
                'id'                => $website->id,
                'url'               => $domain,
                'full_url'          => $website->url,
                'status'            => $website->status,
                'uptime_status'     => $website->uptime_status,
                'last_checked_at'   => $website->last_checked_at?->toIso8601String(),
                'connected_at'      => $website->connected_at?->toIso8601String(),
                'created_at'        => $website->created_at->toIso8601String(),
                'recentIncident'    => $latestIncident,
                'created_by'        => $website->user ? ['id' => $website->user->id, 'name' => $website->user->name] : null,
                'domain_expires_at' => $website->meta_data['domain_expires_at'] ?? null,
            ];
        });
    }

    private function calcUptime(Collection $websites): Collection
    {
        $now = now();

        return $websites->mapWithKeys(function (Website $website) use ($now) {
            if ($website->status === 'disconnected') {
                return [$website->id => null];
            }

            $since = $website->created_at;
            $totalSeconds = $since->diffInSeconds($now);

            $downtimeSeconds = $website->incidents
                ->filter(fn (SiteIncident $i) => $i->started_at->gte($since))
                ->sum(fn (SiteIncident $i) => $i->started_at->diffInSeconds($i->resolved_at ?? $now));

            $uptimeSeconds = max(0, $totalSeconds - $downtimeSeconds);
            $uptimePct = $totalSeconds > 0 ? round(($uptimeSeconds / $totalSeconds) * 100, 2) : 100.0;

            return [$website->id => [
                'uptime_seconds'    => $uptimeSeconds,
                'total_seconds'     => $totalSeconds,
                'uptime_percentage' => $uptimePct,
                'incident_count'    => $website->incidents->filter(fn (SiteIncident $i) => $i->started_at->gte($since))->count(),
                'incidents_7_days'  => $website->incidents->filter(fn (SiteIncident $i) => $i->started_at->gte($now->copy()->subDays(7)))->count(),
                'incidents_30_days' => $website->incidents->filter(fn (SiteIncident $i) => $i->started_at->gte($now->copy()->subDays(30)))->count(),
            ]];
        });
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}

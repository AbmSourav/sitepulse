<?php

namespace App\Http\Controllers;

use App\Enums\TeamRole;
use App\Jobs\FetchSiteAudit;
use App\Models\SiteIncident;
use App\Models\Website;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Illuminate\Support\Str;

class WebsiteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $websites = Website::where('team_id', $user->currentTeam->id)
            ->with('incidents')
            ->get();

        $teams = $user->teams()
            ->wherePivotIn('role', [TeamRole::Owner->value, TeamRole::Admin->value])
            ->get(['teams.id', 'teams.name']);

        return Inertia::render('websites/websites', [
            'websites' => $this->formatWebsites($websites),
            'uptime'   => $this->calcUptime($websites),
            'teams'    => $teams,
        ]);
    }

    public function addMonitor(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'url'    => 'required|url|unique:websites,url',
            'teamId' => 'required|exists:teams,id',
        ]);

        $this->authorizeTeam($data['teamId']);

        Website::create([
            'user_id'      => $request->user()->id,
            'team_id'      => $data['teamId'],
            'url'          => $data['url'],
            'api_key'      => null,
            'status'       => 'connected',
            'connected_at' => now(),
        ]);

        return redirect()->route('websites.index');
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request)
    {
        $data = $request->validate([
            'siteUrl' => 'required|url',
        ]);

        $user = $request->user();
        $teams = $user->teams()
            ->wherePivotIn('role', [TeamRole::Owner->value, TeamRole::Admin->value])
            ->get();

        return Inertia::render('websites/authorize', [
            'teams'     => $teams,
            'siteUrl'   => $data['siteUrl'],
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
            'siteUrl'   => 'required|url|unique:websites,url',
            'teamId'    => 'required|exists:teams,id',
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
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to create website. ' . $e->getMessage()
            ], 500);
        }

        $redirectUrl = rtrim($data['siteUrl'], '/') . '&' . http_build_query([
            'spmApiKey'  => $website->api_key,
            'spmNotice'  => 'Website is connected',
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
            'status'    => 'required|in:connected,disconnected'
        ]);

        $website = Website::find($data['websiteId']);
        $this->authorizeTeam($website->team_id);

        $updates = ['status' => $data['status']];
        if ($data['status'] === 'connected') {
            $updates['connected_at'] = now();
        }
        $website->update($updates);

        $websites = Website::where('team_id', request()->user()->currentTeam->id)
            ->with('incidents')
            ->get();

        return Inertia::render('websites/websites', [
            'websites' => $this->formatWebsites($websites),
            'uptime'   => $this->calcUptime($websites),
        ]);
    }

    private function formatWebsites(Collection $websites): Collection
    {
        return $websites->map(function (Website $website) {
            $url    = parse_url($website->url);
            $domain = $url['host'] . (! empty($url['port']) ? ':' . $url['port'] : '');

            return [
                'id'         => $website->id,
                'url'        => $domain,
                'status'     => $website->status,
                'created_at' => $website->created_at->toDateTimeString(),
            ];
        });
    }

    private function calcUptime(Collection $websites): Collection
    {
        $now = now();

        return $websites->mapWithKeys(function (Website $website) use ($now) {
            if ($website->status === 'disconnected' || ! $website->connected_at) {
                return [$website->id => null];
            }

            $connectedAt  = $website->connected_at;
            $totalSeconds = $connectedAt->diffInSeconds($now);

            $downtimeSeconds = $website->incidents
                ->filter(fn (SiteIncident $i) => $i->started_at >= $connectedAt)
                ->sum(fn (SiteIncident $i) => $i->started_at->diffInSeconds($i->resolved_at ?? $now));

            $uptimeSeconds = max(0, $totalSeconds - $downtimeSeconds);
            $uptimePct     = $totalSeconds > 0 ? round(($uptimeSeconds / $totalSeconds) * 100, 2) : 100.0;

            return [$website->id => [
                'uptime_seconds'    => $uptimeSeconds,
                'total_seconds'     => $totalSeconds,
                'uptime_percentage' => $uptimePct,
                'incident_count'    => $website->incidents->filter(fn (SiteIncident $i) => $i->started_at >= $connectedAt)->count(),
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

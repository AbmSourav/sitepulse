<?php

namespace App\Http\Controllers;

use App\Models\SiteIncident;
use App\Models\Website;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class IncidentController extends Controller
{
    public function index(Request $request): Response
    {
        $teamId = $request->user()->team_id;

        $websites = Website::where('team_id', $teamId)
            ->orderBy('url')
            ->get(['id', 'url']);

        $websiteIds  = $websites->pluck('id');
        $websiteList = $websites->map(fn ($site) => ['id' => $site->id, 'url' => $site->url]);

        $websiteId = $request->integer('website_id') ?: null;
        $month     = $request->filled('month') ? $request->string('month') : null;

        $incidents = SiteIncident::whereIn('website_id', $websiteIds)
            ->when($websiteId, fn ($q) => $q->where('website_id', $websiteId))
            ->when($month, function ($q) use ($month) {
                $start = now()->createFromFormat('Y-m', $month)->startOfMonth();
                $q->whereBetween('started_at', [$start, $start->copy()->endOfMonth()]);
            })
            ->with('website:id,url')
            ->orderByDesc('started_at')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('incidents/incidents', [
            'incidents'   => $incidents,
            'websiteList' => $websiteList,
            'filters'     => ['website_id' => $websiteId, 'month' => $month],
        ]);
    }
}

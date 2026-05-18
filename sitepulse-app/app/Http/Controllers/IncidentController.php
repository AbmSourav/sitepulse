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

        $websiteIds = Website::where('team_id', $teamId)->pluck('id');

        $incidents = SiteIncident::whereIn('website_id', $websiteIds)
            ->with('website:id,url')
            ->orderByDesc('started_at')
            ->get();

        return Inertia::render('incidents/incidents', [
            'incidents' => $incidents,
        ]);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Website;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Str;

class WebsiteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $websites = Website::where('team_id', request()->user()->currentTeam->id)->get();

        if (!$websites->isEmpty()) {
            $websites->transform(function ($website) {
                $url = parse_url($website->url);
                $domain = $url['host'] . (!empty($url['port']) ? ':' . $url['port'] :  '');

                return [
                    'id'            => $website->id,
                    'url'           => $domain,
                    'status'        => $website->status,
                    'created_at'    => $website->created_at->toDateTimeString(),
                ];
            });
        }

        return Inertia::render('websites/websites', [
            'websites' => $websites
        ]);
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
        $teams = $user?->teams()->get();

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
                'user_id'   => $request->user()->id,
                'team_id'   => $data['teamId'],
                'url'       => $data['siteUrl'],
                'api_key'   => Str::random(32),
                'status'    => 'connected',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to create website. ' . $e->getMessage()
            ], 500);
        }

        $redirectUrl = rtrim($data['siteUrl'], '/') . '&' . http_build_query([
            'spmApiKey' => $website->api_key,
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
            'status'    => 'required|in:active,disabled'
        ]);

        $website = Website::find($data['websiteId']);
        $this->authorizeTeam($website->team_id);

        $website->update(['status' => $data['status']]);

        $websites = Website::where('team_id', request()->user()->currentTeam->id)->get();
        if (!$websites->isEmpty()) {
            $websites->transform(function ($website) {
                return [
                    'id'            => $website->id,
                    'url'           => $website->url,
                    'status'        => $website->status,
                    'created_at'    => $website->created_at->toDateTimeString(),
                ];
            });
        }

        return Inertia::render('websites/websites', [
            'websites' => $websites
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}

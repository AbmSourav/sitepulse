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
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'siteUrl'   => 'required|url|unique:websites,url',
            'teamId'    => 'required|exists:teams,id',
        ]);

        try {
            Website::create([
                'user_id'   => $request->user()->id,
                'team_id'   => $data['teamId'],
                'url'       => $data['siteUrl'],
                'api_key'   => Str::random(32),
                'status'    => 'active',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to create website. ' . $e->getMessage()
            ], 500);
        }

        return Inertia::location($data['siteUrl']);
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

<?php

namespace App\Http\Middleware;

use App\Models\Website;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class EnforceApiPlanLimit
{
    public function handle(Request $request, Closure $next): Response
    {
        $user   = $request->user();
        $limits = $user->planLimits();
        $max    = $limits['maxSites'];

        if ($max !== -1 && Website::where('team_id', $user->currentTeam->id)->count() >= $max) {
            $message     = "Your plan allows a maximum of {$max} monitored websites.";
            $siteUrl     = $request->input('siteUrl', '');
            $redirectUrl = rtrim($siteUrl, '/') . '&' . http_build_query([
                'spmApiKey'     => null,
                'spmNotice'     => $message,
                'spmNoticeType' => 'error',
            ]);

            return Inertia::location($redirectUrl);
        }

        return $next($request);
    }
}

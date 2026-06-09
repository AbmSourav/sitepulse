<?php

namespace App\Http\Middleware;

use App\Models\Website;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuthenticateApiRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $request->input('api_key');

        if (! $apiKey) {
            return response()->json(['error' => 'Missing API key.'], 401);
        }

        $website = Website::where('api_key', $apiKey)->first();

        if (! $website) {
            return response()->json(['error' => 'Invalid API key.'], 401);
        }

        $requestHost = parse_url($request->header('Origin') ?? $request->header('Referer') ?? '', PHP_URL_HOST);
        $websiteHost = parse_url($website->url, PHP_URL_HOST);

        if (! $requestHost || ! $websiteHost || $requestHost !== $websiteHost) {
            return response()->json([
                'error' => 'Request origin does not match registered site.',
            ], 403);
        }

        // user email must be verified
        if (! $website->user?->hasVerifiedEmail()) {
            return response()->json(['error' => 'Account email is not verified.'], 403);
        }

        $request->attributes->set('website', $website);

        return $next($request);
    }
}

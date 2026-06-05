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

        $reports = $website->auditReports()
            ->orderByDesc('audited_at')
            ->paginate(10);

        return response()->json($reports);
    }
}

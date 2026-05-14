<?php

namespace App\Http\Controllers;

use App\Models\AuditReport;
use App\Models\Website;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditReportController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $teamId = $user->team_id;

        $websiteList = Website::where('team_id', $teamId)
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get()
            ->transform(function ($site) {
                $parsed = parse_url($site->url);
                $domain = $parsed['host'] . (!empty($parsed['port']) ? ':' . $parsed['port'] : '');

                return ['id' => $site->id, 'url' => $domain];
            });

        $website = Website::where('team_id', $teamId)->orderByDesc('created_at')->first();

        $month = now()->startOfMonth();

        $reports = $website
            ? AuditReport::where('website_id', $website->id)
                ->whereBetween('audited_at', [$month, $month->copy()->endOfMonth()])
                ->orderByDesc('audited_at')
                ->get()
            : [];

        return Inertia::render('audit-reports/auditReports', [
            'websiteList'   => $websiteList,
            'latestWebsite' => $website?->only('id', 'url'),
            'auditReports'  => $reports,
            'filters'       => [
                'website_id' => $website?->id,
                'month'      => $month->format('Y-m'),
            ],
        ]);
    }

    public function filter(Request $request): JsonResponse
    {
        $teamId = $request->user()->team_id;

        $websiteId = $request->integer('website_id');
        $website = Website::where('team_id', $teamId)->find($websiteId);

        if (! $website) {
            return response()->json(['auditReports' => [], 'filters' => ['website_id' => null, 'month' => $request->string('month')]]);
        }

        $month = $request->filled('month')
            ? now()->createFromFormat('Y-m', $request->string('month'))->startOfMonth()
            : now()->startOfMonth();

        $reports = AuditReport::where('website_id', $website->id)
            ->whereBetween('audited_at', [$month, $month->copy()->endOfMonth()])
            ->orderByDesc('audited_at')
            ->get();

        return response()->json([
            'auditReports' => $reports,
            'filters'      => [
                'website_id' => $website->id,
                'month'      => $month->format('Y-m'),
            ],
        ]);
    }
}

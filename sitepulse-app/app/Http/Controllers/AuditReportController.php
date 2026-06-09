<?php

namespace App\Http\Controllers;

use App\Models\AuditReport;
use App\Models\Website;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditReportController extends Controller
{
    public function index(Request $request): Response
    {
        $teamId = $request->user()->team_id;

        $websites = Website::where('team_id', $teamId)->orderBy('url')->get(['id', 'url']);
        $websiteIds = $websites->pluck('id');
        $websiteList = $websites->map(fn ($site) => ['id' => $site->id, 'url' => $site->url]);

        $websiteId = $request->integer('website_id') ?: null;
        $month = $request->filled('month') ? $request->string('month') : null;

        $reports = AuditReport::whereIn('website_id', $websiteIds)
            ->when($websiteId, fn ($q) => $q->where('website_id', $websiteId))
            ->when($month, function ($q) use ($month) {
                $start = now()->createFromFormat('Y-m', $month)->startOfMonth();
                $q->whereBetween('audited_at', [$start, $start->copy()->endOfMonth()]);
            })
            ->with('website:id,url')
            ->orderByDesc('audited_at')
            ->paginate(10)
            ->withQueryString();

        return Inertia::render('audit-reports/auditReports', [
            'websiteList'  => $websiteList,
            'auditReports' => $reports,
            'filters'      => ['website_id' => $websiteId, 'month' => $month],
        ]);
    }

    public function show(Request $request, int $auditReport): Response
    {
        $report = AuditReport::findOrFail($auditReport);
        $website = $report->website?->only('url');
        $parsed = parse_url($website['url']);
        $domain = $parsed['host'].(! empty($parsed['port']) ? ':'.$parsed['port'] : '');

        return Inertia::render('audit-reports/show', [
            'report'  => $report,
            'website' => $domain,
        ]);
    }
}

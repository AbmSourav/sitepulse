<?php

namespace App\Http\Controllers;

use App\Models\AuditReport;
use App\Models\Website;
use App\Services\AuditSummarizer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

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
        $report = AuditReport::with('website:id,url,team_id')->findOrFail($auditReport);

        $this->authorizeReport($request, $report);

        $website = $report->website?->only('url');
        $parsed = parse_url($website['url']);
        $domain = $parsed['host'].(! empty($parsed['port']) ? ':'.$parsed['port'] : '');

        return Inertia::render('audit-reports/show', [
            'report'  => $report,
            'website' => $domain,
            'hasAiApiKey'    => $request->user()->hasClaudeAi(),
        ]);
    }

    /**
     * Generate (or return the already-persisted) AI summary for a report.
     */
    public function summary(Request $request, int $auditReport, AuditSummarizer $summarizer): JsonResponse
    {
        $report = AuditReport::with('website:id,team_id')->findOrFail($auditReport);

        $this->authorizeReport($request, $report);

        // Persisted column IS the cache — reports are immutable, generated once.
        // if (! empty($report->ai_summary)) {
        //     return response()->json($report->ai_summary);
        // }

        $user = $request->user();

        if (! $user->hasClaudeAi()) {
            return response()->json(['needs_setup' => true]);
        }

        try {
            $data = $summarizer->summarize($user, $report);
        } catch (RuntimeException $e) {
            return response()->json(['error' => $e->getMessage()], 502);
        }

        $report->ai_summary = $data;
        $report->save();

        return response()->json($data);
    }

    /**
     * Ensure the report belongs to the current user's team.
     */
    private function authorizeReport(Request $request, AuditReport $report): void
    {
        abort_unless(
            $report->website?->team_id === $request->user()->team_id,
            403
        );
    }
}

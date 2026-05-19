import { Head, Link, router, usePage } from '@inertiajs/react';
import { AuditReportDetail } from '@/components/audit-report/audit-report-detail';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { show as auditReportShow, index as auditReportsIndex } from '@/routes/audit-reports';
import { useState } from 'react';
import type { AuditReport, Website } from '@/types';

interface PaginatedReports {
    data: AuditReport[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

function parseDomain(url: string) {
    try {
        return new URL(url).host;
    } catch {
        return url;
    }
}

export default function AuditReports() {
    const { auditReports, websiteList, filters } = usePage<{
        auditReports: PaginatedReports;
        websiteList: Pick<Website, 'id' | 'url'>[];
        filters: { website_id: number | null; month: string | null };
    } & Record<string, unknown>>().props;

    const [selectedReport, setSelectedReport] = useState<AuditReport | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    function applyFilters(overrides: Record<string, string | number | null>) {
        const params: Record<string, string | number> = {};
        const merged: Record<string, string | number | null> = { website_id: filters?.website_id, month: filters?.month, ...overrides };

        if (merged.website_id) params.website_id = merged.website_id;
        if (merged.month) params.month = merged.month;
        if (merged.page) params.page = merged.page;

        router.get(auditReportsIndex(), params, { preserveState: true, replace: true });
    }

    function handleWebsiteFilter(e: React.ChangeEvent<HTMLSelectElement>) {
        applyFilters({ website_id: e.target.value || null, page: null });
    }

    function handleMonthFilter(e: React.ChangeEvent<HTMLSelectElement>) {
        applyFilters({ month: e.target.value || null, page: null });
    }

    function goToPage(page: number) {
        applyFilters({ page });
    }

    return (
        <>
            <Head title="Audit Reports" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="md:px-12 sm:px-5 pt-4">
                    <div className="flex items-center gap-3 mb-3 bg-gray-50 dark:bg-gray-800 rounded-sm border border-gray-200 dark:border-gray-700 p-2">
                        <select
                            value={filters.month ?? ''}
                            onChange={handleMonthFilter}
                            className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                        >
                            <option value="">All months</option>
                            {Array.from({ length: 12 }, (_, i) => {
                                const d = new Date();
                                d.setDate(1);
                                d.setMonth(d.getMonth() - i);
                                const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                                return <option key={value} value={value}>{label}</option>;
                            })}
                        </select>
                        <select
                            value={filters.website_id ?? ''}
                            onChange={handleWebsiteFilter}
                            className="text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                        >
                            <option value="">All websites</option>
                            {websiteList.map((site) => (
                                <option key={site.id} value={site.id}>
                                    {parseDomain(site.url)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {auditReports.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center pt-12">
                            <CalendarDays className="size-10 mb-3 opacity-40" />
                            <p className="text-gray-500 dark:text-gray-400">No audit reports found</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-sm border border-gray-200 dark:border-gray-700">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Website</th>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Date</th>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">WP Version</th>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">SSL</th>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Plugins</th>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Themes</th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {auditReports.data.map((report) => (
                                            <tr
                                                key={report.id}
                                                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                                                onClick={() => { setSelectedReport(report); setSheetOpen(true); }}
                                            >
                                                <td className="px-4 py-3 font-medium">
                                                    {report.website ? parseDomain(report.website.url) : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                    {new Date(report.audited_at).toLocaleDateString(undefined, {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                    })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {report.server?.wp_version?.version ? (
                                                        <span className="text-gray-500 dark:text-gray-400">UP</span>
                                                    ) : (
                                                        <span className="text-red-600 dark:text-red-400 font-bold">DOWN</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                    {report.server?.wp_version?.version ?? '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {report.security?.ssl_valid === true ? (
                                                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                                            <span className="size-1.5 rounded-full bg-green-500 inline-block" />
                                                            Valid
                                                        </span>
                                                    ) : report.security?.ssl_valid === false ? (
                                                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                                                            <span className="size-1.5 rounded-full bg-red-500 inline-block" />
                                                            Invalid
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500 dark:text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                    {report.server?.wp_version?.version ? (
                                                        <>
                                                            {report.plugins?.total ?? '—'}
                                                            {(report.plugins?.outdated ?? 0) > 0 && (
                                                                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                                                                    {report.plugins!.outdated} outdated
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                    {report.server?.wp_version?.version ? (
                                                        <>
                                                            {report.themes?.total ?? '—'}
                                                            {(report.themes?.outdated ?? 0) > 0 && (
                                                                <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                                                                    {report.themes!.outdated} outdated
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <Button variant="outline" size="sm" asChild>
                                                        <Link href={auditReportShow(report.id).url}>Detail</Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {auditReports.last_page > 1 && (
                                <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
                                    <span>Page {auditReports.current_page} of {auditReports.last_page}</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => goToPage(auditReports.current_page - 1)}
                                            disabled={!auditReports.prev_page_url}
                                            className="cursor-pointer px-3 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => goToPage(auditReports.current_page + 1)}
                                            disabled={!auditReports.next_page_url}
                                            className="cursor-pointer px-3 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <AuditReportDetail report={selectedReport} open={sheetOpen} onOpenChange={setSheetOpen} />
        </>
    );
}

AuditReports.layout = () => ({
    breadcrumbs: [{ title: 'Audit Reports', href: auditReportsIndex() }],
});

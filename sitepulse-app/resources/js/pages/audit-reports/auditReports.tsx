import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { AuditReportDetail } from '@/components/audit-report/audit-report-detail';
import { CalendarDays, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import auditReports, { show as auditReportShow } from '@/routes/audit-reports';

const auditReportsIndex = auditReports.index;
const auditReportsFilter = auditReports.filter;

import type { AuditReport, Website } from '@/types';

interface Filters {
    website_id: number | null;
    month: string; // 'YYYY-MM'
}

interface Props {
    websiteList: Pick<Website, 'id' | 'url'>[];
    latestWebsite: Pick<Website, 'id' | 'url'> | null;
    auditReports: AuditReport[];
    filters: Filters;
    [key: string]: unknown;
}

const MONTHS = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
];

export default function AuditReports() {
    const { websiteList, latestWebsite, auditReports: initialReports, filters: initialFilters } = usePage<Props>().props;

    const defaultWebsiteId = initialFilters.website_id
        ? String(initialFilters.website_id)
        : latestWebsite
          ? String(latestWebsite.id)
          : '';
    const defaultMonth = initialFilters.month?.split('-')[1] ?? String(new Date().getMonth() + 1).padStart(2, '0');

    const [reports, setReports] = useState<AuditReport[]>(initialReports);
    const [filters, setFilters] = useState({ website_id: defaultWebsiteId, month: defaultMonth });
    const [loading, setLoading] = useState(false);
    const [selectedReport, setSelectedReport] = useState<AuditReport | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);

    const selectedWebsite = websiteList.find((w) => String(w.id) === filters.website_id);

    async function applyFilter(next: { website_id: string; month: string }) {
        setFilters(next);
        if (!next.website_id) return;

        const year = initialFilters.month?.split('-')[0] ?? new Date().getFullYear();
        const params = new URLSearchParams({ website_id: next.website_id, month: `${year}-${next.month}` });

        setLoading(true);
        const res = await fetch(`${auditReportsFilter.url()}?${params}`);
        const data = await res.json();
        setReports(data.auditReports);
        setLoading(false);
    }

    function onMonthChange(month: string) {
        applyFilter({ website_id: filters.website_id, month });
    }

    function onWebsiteChange(websiteId: string) {
        applyFilter({ website_id: websiteId, month: filters.month });
    }

    return (
        <>
            <Head title="Audit Reports" />
            <div className="p-6">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-sm border border-gray-200 dark:border-gray-700 p-2 mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Select value={filters.month} onValueChange={onMonthChange} disabled={loading}>
                            <SelectTrigger className="w-40 mr-3 bg-card">
                                <CalendarDays className="size-4 text-muted-foreground" />
                                <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                                {MONTHS.map((month) => (
                                    <SelectItem key={month.value} value={month.value}>
                                        {month.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={filters.website_id} onValueChange={onWebsiteChange} disabled={loading}>
                            <SelectTrigger className="w-64 bg-card">
                                <Globe className="size-4 text-muted-foreground" />
                                <SelectValue placeholder="Select a website">
                                    {selectedWebsite?.url ?? 'Select a website'}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                                {websiteList.length === 0 ? (
                                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                                        No websites found
                                    </div>
                                ) : (
                                    websiteList.map((website) => (
                                        <SelectItem key={website.id} value={String(website.id)}>
                                            {website.url}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {reports.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <CalendarDays className="size-10 mb-3 opacity-40" />
                        <p className="text-sm">No audit reports found for this month.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-sm border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">Date</th>
                                    <th className="px-4 py-3 text-left font-medium">Status</th>
                                    <th className="px-4 py-3 text-left font-medium">WP Version</th>
                                    <th className="px-4 py-3 text-left font-medium">SSL</th>
                                    <th className="px-4 py-3 text-left font-medium">Plugins</th>
                                    <th className="px-4 py-3 text-left font-medium">Themes</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-border">
                                {reports.map((report: AuditReport) => (
                                    <tr
                                        key={report.id}
                                        className="hover:bg-muted/50 transition-colors cursor-pointer"
                                        onClick={() => { setSelectedReport(report); setSheetOpen(true); }}
                                    >
                                        <td className="px-4 py-3 text-foreground">
                                            {new Date(report.audited_at).toLocaleDateString(undefined, {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </td>
                                        <td className="px-4 py-3 text-foreground">
                                            {report.server?.wp_version?.version
                                                ? <span className="text-muted-foreground">UP</span>
                                                : <span className="text-red-600 dark:text-red-400 font-bold">DOWN</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-foreground">
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
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-foreground">
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
                                        <td className="px-4 py-3 text-foreground">
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
                )}
            </div>

            <AuditReportDetail report={selectedReport} open={sheetOpen} onOpenChange={setSheetOpen} />
        </>
    );
}

AuditReports.layout = () => ({
    breadcrumbs: [{
        title: 'Audit Reports', href: auditReportsIndex.url()
    }],
});

import { Head, Link, router, usePage } from '@inertiajs/react';
import { CalendarDays, Download } from 'lucide-react';
import { useState } from 'react';
import { AuditReportDetail } from '@/components/audit-report/audit-report-detail';
import { Button } from '@/components/ui/button';
import {
    show as auditReportShow,
    index as auditReportsIndex,
} from '@/routes/audit-reports';
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
    const { auditReports, websiteList, filters } = usePage<
        {
            auditReports: PaginatedReports;
            websiteList: Pick<Website, 'id' | 'url'>[];
            filters: { website_id: number | null; month: string | null };
        } & Record<string, unknown>
    >().props;

    const [selectedReport, setSelectedReport] = useState<AuditReport | null>(
        null,
    );
    const [sheetOpen, setSheetOpen] = useState(false);

    function applyFilters(overrides: Record<string, string | number | null>) {
        const params: Record<string, string | number> = {};
        const merged: Record<string, string | number | null> = {
            website_id: filters?.website_id,
            month: filters?.month,
            ...overrides,
        };

        if (merged.website_id) {
            params.website_id = merged.website_id;
        }

        if (merged.month) {
            params.month = merged.month;
        }

        if (merged.page) {
            params.page = merged.page;
        }

        router.get(auditReportsIndex(), params, {
            preserveState: true,
            replace: true,
        });
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
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 sm:mx-5 md:mx-12 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                Start auditing your WordPress site
                            </h2>
                            <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
                                Download the SitePulse Monitor plugin, install
                                it on your WordPress site, then connect it to
                                SitePulse. Once connected, audit reports will
                                appear here automatically.
                            </p>
                            <ol className="mt-2 list-inside list-decimal text-xs leading-normal text-gray-500 dark:text-gray-400">
                                <li>Download the plugin (.zip) below.</li>
                                <li>
                                    In WordPress, go to{' '}
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                        Plugins → Add New → Upload Plugin
                                    </span>
                                    , upload the .zip, and activate it.
                                </li>
                                <li>
                                    Go to 'SitePulse Monitor' menu page and
                                    click{' '}
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                        Connect
                                    </span>{' '}
                                    to link it to your account.
                                </li>
                            </ol>
                        </div>
                        <Button asChild className="shrink-0">
                            <a href="/sitepulse-monitor.zip" download>
                                <Download className="size-4" />
                                Download plugin
                            </a>
                        </Button>
                    </div>
                </div>

                <div className="pt-4 sm:px-5 md:px-12">
                    <div className="mb-3 flex items-center gap-3 rounded-sm border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
                        <select
                            value={filters.month ?? ''}
                            onChange={handleMonthFilter}
                            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                        >
                            <option value="">All months</option>
                            {Array.from({ length: 12 }, (_, i) => {
                                const d = new Date();
                                d.setDate(1);
                                d.setMonth(d.getMonth() - i);
                                const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                const label = d.toLocaleString('en-US', {
                                    month: 'long',
                                    year: 'numeric',
                                });

                                return (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                );
                            })}
                        </select>
                        <select
                            value={filters.website_id ?? ''}
                            onChange={handleWebsiteFilter}
                            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
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
                            <CalendarDays className="mb-3 size-10 opacity-40" />
                            <p className="text-gray-500 dark:text-gray-400">
                                No audit reports found
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-sm">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-left dark:bg-gray-800">
                                        <tr className="h-[55px]">
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                                                Website
                                            </th>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                                                Date
                                            </th>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                                                Status
                                            </th>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                                                WP Version
                                            </th>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                                                SSL
                                            </th>
                                            <th className="px-4 py-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {auditReports.data.map((report) => (
                                            <tr
                                                key={report.id}
                                                className="h-[55px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                                onClick={() => {
                                                    setSelectedReport(report);
                                                    setSheetOpen(true);
                                                }}
                                            >
                                                <td className="px-4 py-3 font-medium">
                                                    {report.website
                                                        ? parseDomain(
                                                              report.website
                                                                  .url,
                                                          )
                                                        : '—'}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                                                    {new Date(
                                                        report.audited_at,
                                                    ).toLocaleDateString(
                                                        undefined,
                                                        {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric',
                                                        },
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {report.server?.wp_version
                                                        ?.version ? (
                                                        <span className="text-gray-500 dark:text-gray-400">
                                                            UP
                                                        </span>
                                                    ) : (
                                                        <span className="font-bold text-red-600 dark:text-red-400">
                                                            DOWN
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                    {report.server?.wp_version
                                                        ?.version ?? '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {report.security
                                                        ?.ssl_valid === true ? (
                                                        <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                                            <span className="inline-block size-1.5 rounded-full bg-green-500" />
                                                            Valid
                                                        </span>
                                                    ) : report.security
                                                          ?.ssl_valid ===
                                                      false ? (
                                                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                                                            <span className="inline-block size-1.5 rounded-full bg-red-500" />
                                                            Invalid
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500 dark:text-gray-400">
                                                            —
                                                        </span>
                                                    )}
                                                </td>
                                                <td
                                                    className="px-4 py-3 text-right"
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                >
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={
                                                                auditReportShow(
                                                                    report.id,
                                                                ).url
                                                            }
                                                        >
                                                            Detail
                                                        </Link>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {auditReports.last_page > 1 && (
                                <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                                    <span>
                                        Page {auditReports.current_page} of{' '}
                                        {auditReports.last_page}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() =>
                                                goToPage(
                                                    auditReports.current_page -
                                                        1,
                                                )
                                            }
                                            disabled={
                                                !auditReports.prev_page_url
                                            }
                                            className="cursor-pointer rounded border border-gray-200 px-3 py-1 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() =>
                                                goToPage(
                                                    auditReports.current_page +
                                                        1,
                                                )
                                            }
                                            disabled={
                                                !auditReports.next_page_url
                                            }
                                            className="cursor-pointer rounded border border-gray-200 px-3 py-1 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
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

            <AuditReportDetail
                report={selectedReport}
                open={sheetOpen}
                onOpenChange={setSheetOpen}
            />
        </>
    );
}

AuditReports.layout = () => ({
    breadcrumbs: [{ title: 'Audit Reports', href: auditReportsIndex() }],
});

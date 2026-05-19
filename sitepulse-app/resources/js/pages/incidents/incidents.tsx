import { Head, router, usePage } from '@inertiajs/react';
import { index as incidentsIndex } from '@/routes/incidents';
import type { Website } from '@/types/website';
import { AlertTriangle } from 'lucide-react';

interface Incident {
    id: number;
    website_id: number;
    website: Pick<Website, 'id' | 'url'> | null;
    started_at: string;
    resolved_at: string | null;
    reason: string | null;
    http_status: number | null;
}

interface PaginatedIncidents {
    data: Incident[];
    current_page: number;
    last_page: number;
    prev_page_url: string | null;
    next_page_url: string | null;
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function parseDomain(url: string) {
    try {
        return new URL(url).host;
    } catch {
        return url;
    }
}

function Duration({ startedAt, resolvedAt }: { startedAt: string; resolvedAt: string | null }) {
    if (!resolvedAt) return <span className="text-yellow-600 dark:text-yellow-400">Ongoing</span>;

    const ms = new Date(resolvedAt).getTime() - new Date(startedAt).getTime();
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    let label = '';
    if (days > 0) label = `${days}d ${hours % 24}h`;
    else if (hours > 0) label = `${hours}h ${minutes % 60}m`;
    else label = `${minutes}m`;

    return <span>{label}</span>;
}

export default function Incidents() {
    const { incidents, websiteList, filters } = usePage<{
        incidents: PaginatedIncidents;
        websiteList: Pick<Website, 'id' | 'url'>[];
        filters: { website_id: number | null; month: string | null };
    } & Record<string, unknown>>().props;

    function applyFilters(overrides: Record<string, string | number | null>) {
        const params: Record<string, string | number> = {};
        const merged: Record<string, string | number | null> = { website_id: filters?.website_id, month: filters?.month, ...overrides };

        if (merged.website_id) params.website_id = merged.website_id;
        if (merged.month) params.month = merged.month;
        if (merged.page) params.page = merged.page;

        router.get(incidentsIndex(), params, { preserveState: true, replace: true });
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
            <Head title="Incidents" />
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
                                const date = new Date();
                                date.setDate(1);
                                date.setMonth(date.getMonth() - i);
                                const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                                const label = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });

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

                    {incidents.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center pt-12">
                            <AlertTriangle className="size-10 mb-3 opacity-40" />
                            <p className="text-gray-500 dark:text-gray-400">
                                No incidents found
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-sm border border-gray-200 dark:border-gray-700">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-800 text-left">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Website</th>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Status</th>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">HTTP</th>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Started</th>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Resolved</th>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Duration</th>
                                            <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Reason</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {incidents.data.map((incident) => (
                                            <tr key={incident.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                                <td className="px-4 py-3 font-medium">
                                                    {incident.website ? parseDomain(incident.website.url) : '—'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {incident.resolved_at ? (
                                                        <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                                                            Resolved
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                                                            Down
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                                    {incident.http_status ?? '—'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                    {formatDate(incident.started_at)}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                    {incident.resolved_at ? formatDate(incident.resolved_at) : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                    <Duration startedAt={incident.started_at} resolvedAt={incident.resolved_at} />
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                                    {incident.reason ?? '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {incidents.last_page > 1 && (
                                <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-400">
                                    <span>Page {incidents.current_page} of {incidents.last_page}</span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => goToPage(incidents.current_page - 1)}
                                            disabled={!incidents.prev_page_url}
                                            className="cursor-pointer px-3 py-1 rounded border border-gray-200 dark:border-gray-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => goToPage(incidents.current_page + 1)}
                                            disabled={!incidents.next_page_url}
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
        </>
    );
}

Incidents.layout = () => ({
    breadcrumbs: [{
        title: 'Incidents',
        href: incidentsIndex(),
    }],
});

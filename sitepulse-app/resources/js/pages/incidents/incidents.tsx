import { Head, router, usePage } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import IncidentCard from '@/components/incidents/incident-card';
import type { Incident } from '@/components/incidents/incident-card';
import { index as incidentsIndex } from '@/routes/incidents';
import type { Website } from '@/types/website';

interface PaginatedIncidents {
    data: Incident[];
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

export default function Incidents() {
    const { incidents, websiteList, filters } = usePage<
        {
            incidents: PaginatedIncidents;
            websiteList: Pick<Website, 'id' | 'url'>[];
            filters: { website_id: number | null; month: string | null };
        } & Record<string, unknown>
    >().props;

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

        router.get(incidentsIndex(), params, {
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
            <Head title="Incidents" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="pt-4 sm:px-5 md:px-12">
                    <div className="mb-3 flex items-center gap-3 rounded-sm border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-black/80">
                        <select
                            value={filters.month ?? ''}
                            onChange={handleMonthFilter}
                            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-black/80 dark:text-gray-300"
                        >
                            <option value="">All months</option>
                            {Array.from({ length: 12 }, (_, i) => {
                                const date = new Date();
                                date.setDate(1);
                                date.setMonth(date.getMonth() - i);
                                const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                                const label = date.toLocaleString('en-US', {
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
                            className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-black/80 dark:text-gray-300"
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
                            <AlertTriangle className="mb-3 size-10 opacity-40" />
                            <p className="text-gray-500 dark:text-gray-400">
                                No incidents found
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
                                {incidents.data.map((incident) => (
                                    <IncidentCard
                                        key={incident.id}
                                        incident={incident}
                                    />
                                ))}
                            </div>

                            {incidents.last_page > 1 && (
                                <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                                    <span>
                                        Page {incidents.current_page} of{' '}
                                        {incidents.last_page}
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() =>
                                                goToPage(
                                                    incidents.current_page - 1,
                                                )
                                            }
                                            disabled={!incidents.prev_page_url}
                                            className="cursor-pointer rounded border border-gray-200 px-3 py-1 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-700 dark:hover:bg-gray-800"
                                        >
                                            Previous
                                        </button>
                                        <button
                                            onClick={() =>
                                                goToPage(
                                                    incidents.current_page + 1,
                                                )
                                            }
                                            disabled={!incidents.next_page_url}
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
        </>
    );
}

Incidents.layout = () => ({
    breadcrumbs: [
        {
            title: 'Incidents',
            href: incidentsIndex(),
        },
    ],
});

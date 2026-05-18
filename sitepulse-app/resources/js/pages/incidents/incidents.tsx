import { Head, usePage } from '@inertiajs/react';
import { index as incidentsIndex } from '@/routes/incidents';
import type { Website } from '@/types/website';

interface Incident {
    id: number;
    website_id: number;
    website: Pick<Website, 'id' | 'url'> | null;
    started_at: string;
    resolved_at: string | null;
    reason: string | null;
    http_status: number | null;
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
    const { incidents } = usePage<{ incidents: Incident[] } & Record<string, unknown>>().props;

    return (
        <>
            <Head title="Incidents" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="md:px-12 sm:px-5 pt-4">
                    <h1 className="text-xl font-semibold mb-6">Incidents</h1>

                    {incidents.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400">No incidents recorded.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
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
                                    {incidents.map((incident) => (
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

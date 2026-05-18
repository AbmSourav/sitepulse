import { Head, router, usePage } from '@inertiajs/react';
import websiteRoutes from '@/routes/websites';
import type { Website } from '@/types/global';
import { toast } from 'sonner';
import { useState } from 'react';

interface UptimeStat {
    uptime_seconds: number;
    total_seconds: number;
    uptime_percentage: number;
    incident_count: number;
}

function formatSeconds(seconds: number) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d} day ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

export default function Websites() {
    const { websites, uptime } = usePage<{ websites: Website[]; uptime: Record<number, UptimeStat | null> } & Record<string, unknown>>().props;
    const [ loading, setLoading ] = useState(false)

    function handleStatusChange(websiteId: number, currentStatus: string) {
        const newStatus = currentStatus === 'connected' ? 'disconnected' : 'connected';
        setLoading(true)

        router.post(websiteRoutes.update.url(),
            {
                websiteId,
                status: newStatus
            },
            {
                preserveUrl: true,
                onSuccess: (res) => {
                    toast.success('Website audit ' + (newStatus === 'disconnected' ? 'disconnected' : 'activated'));
                },
                onFinish: () => setLoading(false)
            }
        );
    }

    return (
        <>
            <Head title="Websites" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                {websites?.length > 0 ? (
                    <div className='pt-6 flex flex-col md:px-12 sm:px-5'>
                        {websites?.map((website: Website) => {
                            const createdAt = Temporal.PlainDate.from(website.created_at.slice(0, 10))
                                .toLocaleString('en-US', { month: 'short', day: '2-digit', year: '2-digit' });

                            const stat = uptime[website.id] ?? null;

                            return (
                                <div key={website.id} className="flex items-center justify-between max-w-2xl border-b border-gray-200 py-4">
                                    <div>
                                        <h3 className="text-lg font-semibold">{website.url}</h3>
                                        <p className="text-xs text-gray-400">Created: {createdAt}</p>
                                    </div>

                                    <div className="text-center">
                                        {stat && (
                                            <>
                                                <p className={`text-lg font-bold ${stat.uptime_percentage >= 99 ? 'text-green-600 dark:text-green-400' : stat.uptime_percentage >= 95 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {stat.uptime_percentage}%
                                                </p>
                                                <p className="text-xs text-gray-400">uptime · {formatSeconds(stat.uptime_seconds)} up of {formatSeconds(stat.total_seconds)}</p>
                                            </>
                                        )}
                                    </div>

                                    <div className="text-center">
                                        {stat && (
                                            <>
                                                <p className="text-lg font-bold text-gray-700 dark:text-gray-200">{stat.incident_count}</p>
                                                <p className="text-xs text-gray-400">incident{stat.incident_count !== 1 ? 's' : ''}</p>
                                            </>
                                        )}
                                    </div>

                                    <button
                                        className="bg-gray-600 py-1 px-2 text-sm text-white cursor-pointer rounded"
                                        onClick={() => handleStatusChange(website.id, website.status)}
                                        disabled={loading}
                                    >
                                        {website.status === 'connected' ? 'Disable' : 'Activate'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p>No websites found.</p>
                )}
            </div>
        </>
    );
}

Websites.layout = () => ({
    breadcrumbs: [{
        title: 'Websites',
        href: websiteRoutes.index.url(),
    }],
});

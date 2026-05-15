import { Head, router, usePage } from '@inertiajs/react';
import websiteRoutes from '@/routes/websites';
import type { Website } from '@/types/global';
import { toast } from 'sonner';
import { useState } from 'react';

export default function Websites() {
    const { websites } = usePage().props;
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

                            return (
                                <div key={website.id} className="flex items-center justify-between max-w-2xl border-b border-gray-200 py-4">
                                    <div>
                                        <h3 className="text-lg font-semibold">{website.url}</h3>
                                        <p className="text-xs text-gray-400">Created: {createdAt}</p>
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

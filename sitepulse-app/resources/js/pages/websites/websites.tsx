import { Head, router, usePage } from '@inertiajs/react';
import websiteRoutes from '@/routes/websites';
import type { Website } from '@/types/global';
import { toast } from 'sonner';

export default function Websites() {
    const { websites } = usePage().props;

    function handleStatusChange(websiteId: number, currentStatus: string) {
        // TODO: after disabling a website, make a rest-api call to that website so that it can stop sending data to the server. --- IGNORE ---
        const newStatus = currentStatus === 'active' ? 'disabled' : 'active';

        router.post(websiteRoutes.update.url(), {
            websiteId,
            status: newStatus
        }, {
            preserveUrl: true,
            onSuccess: (res) => {
                console.log('Status updated successfully:', res);
                toast.success('Website audit ' + (newStatus === 'disabled' ? 'disabled' : 'activated'));
            }
        });
    }

    return (
        <>
            <Head title="Websites" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                {websites?.length > 0 ? (
                    <div className='pt-6 flex flex-col px-12'>
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
                                        className="bg-gray-600 py-1 px-2 mt-2 text-sm text-white cursor-pointer rounded"
                                        onClick={() => handleStatusChange(website.id, website.status)}
                                    >
                                        {website.status === 'active' ? 'Disable' : 'Activate'}
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

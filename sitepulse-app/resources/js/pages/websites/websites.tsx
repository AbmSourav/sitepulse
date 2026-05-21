import { Head, router, usePage } from '@inertiajs/react';
import websiteRoutes from '@/routes/websites';
import type { Website } from '@/types/global';
import { toast } from 'sonner';
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UptimeStat {
    uptime_seconds: number;
    total_seconds: number;
    uptime_percentage: number;
    incident_count: number;
}

interface Team {
    id: number;
    name: string;
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
    const { websites, uptime, teams } = usePage<{
        websites: Website[];
        uptime: Record<number, UptimeStat | null>;
        teams: Team[];
    } & Record<string, unknown>>().props;

    const [loading, setLoading] = useState(false);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [url, setUrl] = useState('');
    const [teamId, setTeamId] = useState<string>(teams?.[0]?.id?.toString() ?? '');
    const [submitting, setSubmitting] = useState(false);

    function handleStatusChange(websiteId: number, currentStatus: string) {
        const newStatus = currentStatus === 'connected' ? 'disconnected' : 'connected';
        setLoading(true);

        router.post(websiteRoutes.update.url(),
            { websiteId, status: newStatus },
            {
                preserveUrl: true,
                onSuccess: () => {
                    toast.success('Website audit ' + (newStatus === 'disconnected' ? 'disconnected' : 'activated'));
                },
                onFinish: () => setLoading(false),
            }
        );
    }

    function handleAddMonitor(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);

        router.post(websiteRoutes.monitor.url(),
            { url, teamId: parseInt(teamId) },
            {
                onSuccess: () => {
                    toast.success('Monitoring started');
                    setSheetOpen(false);
                    setUrl('');
                },
                onError: (errors) => {
                    const first = Object.values(errors)[0];
                    if (first) toast.error(first as string);
                },
                onFinish: () => setSubmitting(false),
            }
        );
    }

    return (
        <>
            <Head title="Websites" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="flex justify-end md:px-12 sm:px-5">
                    <Button onClick={() => setSheetOpen(true)}>Add Monitoring</Button>
                </div>

                {websites?.length > 0 ? (
                    <div className='pt-2 flex flex-col md:px-12 sm:px-5'>
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
                    <p className="md:px-12 sm:px-5">No websites found.</p>
                )}
            </div>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Add Monitoring</SheetTitle>
                    </SheetHeader>

                    <form onSubmit={handleAddMonitor} className="mt-6 flex flex-col gap-5 px-7">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="monitor-url">URL</Label>
                            <Input
                                id="monitor-url"
                                type="url"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                required
                            />
                        </div>

                        {teams && teams.length > 1 && (
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="monitor-team">Team</Label>
                                <Select value={teamId} onValueChange={setTeamId}>
                                    <SelectTrigger id="monitor-team">
                                        <SelectValue placeholder="Select team" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teams.map((t) => (
                                            <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="pt-2">
                            <Button type="submit" className="flex-1 cursor-pointer" disabled={submitting}>
                                {submitting ? 'Starting…' : 'Start Monitoring'}
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </>
    );
}

Websites.layout = () => ({
    breadcrumbs: [{
        title: 'Websites',
        href: websiteRoutes.index.url(),
    }],
});

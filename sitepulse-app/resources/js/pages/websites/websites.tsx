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
import { Badge } from '@/components/ui/badge';

interface UptimeStat {
    uptime_seconds: number;
    total_seconds: number;
    uptime_percentage: number;
    incident_count: number;
}

interface MonitoredWebsite extends Website {
    uptime_status: 'up' | 'down' | 'unknown';
    last_checked_at: string | null;
}

interface Team {
    id: number;
    name: string;
}

function formatRelativeTime(dateStr: string | null): string {
    if (!dateStr) return '—';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;

    return `${Math.floor(diff / 86400)}d ago`;
}

export default function Websites() {
    const { websites, uptime, teams } = usePage<{
        websites: MonitoredWebsite[];
        uptime: Record<number, UptimeStat | null>;
        teams: Team[];
    } & Record<string, unknown>>().props;
    console.log(websites)

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
                    toast.success(newStatus === 'disconnected' ? 'Monitoring disabled' : 'Monitoring activated');
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
            <div className="flex h-full flex-1 flex-col gap-4 px-12 py-4 mt-5">
                <div className="flex items-center justify-between">
                    <Button onClick={() => setSheetOpen(true)}>Add Monitoring</Button>
                </div>

                <div className="overflow-hidden rounded-sm border border-border">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr className="border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Uptime</th>
                                <th className="px-4 py-3">Last Check</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {websites?.length > 0 ? websites.map((website) => {
                                const stat = uptime[website.id] ?? null;
                                const isConnected = website.status === 'connected';

                                return (
                                    <tr key={website.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                                        <td className="px-4 py-3 font-medium">{website.url}</td>

                                        <td className="px-4 py-3">
                                            {!isConnected ? (
                                                <Badge variant="secondary">Disabled</Badge>
                                            ) : website.uptime_status === 'up' ? (
                                                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">Online</Badge>
                                            ) : website.uptime_status === 'down' ? (
                                                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">Down</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                                            )}
                                        </td>

                                        <td className="px-4 py-3">
                                            {stat ? (
                                                <span className={`font-medium ${stat.uptime_percentage >= 99 ? 'text-green-600 dark:text-green-400' : stat.uptime_percentage >= 95 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
                                                    {stat.uptime_percentage}%
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </td>

                                        <td className="px-4 py-3 text-muted-foreground">
                                            {formatRelativeTime(website.last_checked_at)}
                                        </td>

                                        <td className="px-4 py-3 text-right">
                                            <button
                                                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer disabled:opacity-50"
                                                onClick={() => handleStatusChange(website.id, website.status)}
                                                disabled={loading}
                                            >
                                                {isConnected ? 'Disable' : 'Enable'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                                        No websites yet. Click <strong>Add Monitoring</strong> to get started.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
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

                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setSheetOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1" disabled={submitting}>
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

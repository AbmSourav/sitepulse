import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import PlanLimitDialog from '@/components/plan-limit-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import WebsiteStats from '@/components/websites/website-stats';
import type { WebsiteStatsProps } from '@/components/websites/website-stats';
import websiteRoutes from '@/routes/websites';
import { Globe } from 'lucide-react';

interface UptimeStat {
    uptime_seconds: number;
    total_seconds: number;
    uptime_percentage: number;
    incident_count: number;
    incidents_7_days: number;
    incidents_30_days: number;
}

interface Team {
    id: number;
    name: string;
}

function formatRelativeTime(dateStr: string | null): string {
    if (!dateStr) {
        return '—';
    }

    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);

    if (diff < 60) {
        return `${diff}s ago`;
    }

    if (diff < 3600) {
        return `${Math.floor(diff / 60)}m ago`;
    }

    if (diff < 86400) {
        return `${Math.floor(diff / 3600)}h ago`;
    }

    return `${Math.floor(diff / 86400)}d ago`;
}

export default function Websites() {
    const { websites, uptime, teams } = usePage<
        {
            websites: WebsiteStatsProps[];
            uptime: Record<number, UptimeStat | null>;
            teams: Team[];
        } & Record<string, unknown>
    >().props;

    const [addSheetOpen, setAddSheetOpen] = useState(false);
    const [selectedWebsite, setSelectedWebsite] =
        useState<WebsiteStatsProps | null>(null);
    const [url, setUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [planError, setPlanError] = useState<string | null>(null);

    function handleAddMonitor(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);

        router.post(
            websiteRoutes.monitor.url(),
            { url },
            {
                onSuccess: () => {
                    toast.success('Monitoring started');
                    setAddSheetOpen(false);
                    setUrl('');
                },
                onError: (errors) => {
                    if (errors.plan) {
                        setPlanError(errors.plan);
                    } else {
                        const first = Object.values(errors)[0];
                        if (first) toast.error(first as string);
                    }
                },
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <>
            <PlanLimitDialog
                message={planError}
                onClose={() => setPlanError(null)}
            />
            <Head title="Websites" />
            <div className="mt-5 flex h-full flex-1 flex-col gap-4 px-12 py-4">
                <div className="flex items-center justify-between">
                    <Button
                        className="cursor-pointer"
                        onClick={() => setAddSheetOpen(true)}
                    >
                        Add Monitoring
                    </Button>
                </div>

                <div className="overflow-hidden rounded-sm">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr className="h-[55px] border-b border-border bg-muted/40 text-left text-xs font-medium tracking-wide text-muted-foreground uppercase">
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Uptime</th>
                                <th className="px-4 py-3">Last Check</th>
                                <th className="px-4 py-3">Domain Expiry</th>
                                <th className="px-4 py-3">Added by</th>
                            </tr>
                        </thead>
                        <tbody>
                            {websites?.length > 0 ? (
                                websites.map((website) => {
                                    const stat = uptime[website.id] ?? null;
                                    const isConnected =
                                        website.status === 'connected';
                                    console.log('stats', stat, website);

                                    return (
                                        <tr
                                            key={website.id}
                                            onClick={() =>
                                                setSelectedWebsite(website)
                                            }
                                            className="h-[55px] cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/20"
                                        >
                                            <td className="px-4 py-3 font-medium">
                                                {website.url}
                                            </td>

                                            <td className="px-4 py-3">
                                                {!isConnected ? (
                                                    <Badge variant="secondary">
                                                        Disabled
                                                    </Badge>
                                                ) : website.uptime_status ===
                                                  'up' ? (
                                                    <Badge className="border-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                                        Online
                                                    </Badge>
                                                ) : website.uptime_status ===
                                                  'down' ? (
                                                    <Badge className="border-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                                        Down
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        variant="outline"
                                                        className="text-muted-foreground"
                                                    >
                                                        Pending
                                                    </Badge>
                                                )}
                                            </td>

                                            <td className="relative px-4 py-3">
                                                {stat &&
                                                website?.uptime_status !==
                                                    'unknown' ? (
                                                    <span
                                                        className={`absolute top-[10px] left-[10px] text-[22px] font-medium ${stat.uptime_percentage >= 97 ? 'text-green-600 dark:text-green-400' : stat.uptime_percentage >= 90 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}
                                                    >
                                                        {stat.uptime_percentage}
                                                        %
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-3 text-muted-foreground">
                                                {formatRelativeTime(
                                                    website.last_checked_at,
                                                )}
                                            </td>

                                            <td className="px-4 py-3 text-muted-foreground">
                                                {website.domain_expires_at
                                                    ? (() => {
                                                          const days =
                                                              Math.ceil(
                                                                  (new Date(
                                                                      website.domain_expires_at!,
                                                                  ).getTime() -
                                                                      Date.now()) /
                                                                      86400000,
                                                              );
                                                          return (
                                                              <span
                                                                  className={
                                                                      days <= 30
                                                                          ? 'font-medium text-red-600 dark:text-red-400'
                                                                          : days <=
                                                                              60
                                                                            ? 'text-yellow-600 dark:text-yellow-400'
                                                                            : ''
                                                                  }
                                                              >
                                                                  {new Date(
                                                                      website.domain_expires_at!,
                                                                  ).toLocaleDateString(
                                                                      undefined,
                                                                      {
                                                                          year: 'numeric',
                                                                          month: 'short',
                                                                          day: 'numeric',
                                                                      },
                                                                  )}
                                                                  {days <= 30 &&
                                                                      ` (${days}d)`}
                                                              </span>
                                                          );
                                                      })()
                                                    : '—'}
                                            </td>

                                            <td className="px-4 py-3 text-muted-foreground">
                                                {website.created_by?.name ??
                                                    '—'}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-10 text-center text-muted-foreground"
                                    >
                                        <div className="flex flex-col items-center justify-center pt-5">
                                            <Globe className="mb-3 size-10 opacity-40" />
                                            <p className="text-gray-500 dark:text-gray-400">
                                                <span>No websites yet.</span>
                                                <br />
                                                Click{' '}
                                                <strong>
                                                    Add Monitoring
                                                </strong>{' '}
                                                to get started.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <WebsiteStats
                website={selectedWebsite}
                uptime={
                    selectedWebsite
                        ? (uptime[selectedWebsite.id] ?? null)
                        : null
                }
                open={selectedWebsite !== null}
                onClose={() => setSelectedWebsite(null)}
            />

            <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
                <SheetContent className="sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>Add Monitoring</SheetTitle>
                    </SheetHeader>

                    <form
                        onSubmit={handleAddMonitor}
                        className="mt-6 flex flex-col gap-5 px-10"
                    >
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

                        <div className="flex gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 cursor-pointer"
                                onClick={() => setAddSheetOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 cursor-pointer"
                                disabled={submitting}
                            >
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
    breadcrumbs: [
        {
            title: 'Websites',
            href: websiteRoutes.index.url(),
        },
    ],
});

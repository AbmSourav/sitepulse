import { router } from '@inertiajs/react';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import websiteRoutes from '@/routes/websites';

interface Incident {
    id: number;
    started_at: string;
    resolved_at: string | null;
    reason: string | null;
    http_status: number | null;
}

export interface WebsiteStatsProps {
    id: number;
    url: string;
    full_url: string;
    status: string;
    uptime_status: 'up' | 'down' | 'unknown';
    last_checked_at: string | null;
    connected_at: string | null;
    recentIncident: Incident | [];
    created_by: { id: number; name: string } | null;
    domain_expires_at: string | null;
}

interface UptimeStat {
    uptime_percentage: number;
    incident_count: number;
    uptime_seconds: number;
    total_seconds: number;
    incidents_7_days: number;
    incidents_30_days: number;
}

interface Props {
    website: WebsiteStatsProps | null;
    uptime: UptimeStat | null;
    open: boolean;
    onClose: () => void;
}

const REASON_LABELS: Record<string, string> = {
    connection_refused: 'Connection refused',
    php_error: 'PHP fatal error',
    invalid_response: 'Invalid response',
    request_failed: 'Request failed',
};

function reasonLabel(reason: string | null, httpStatus: number | null): string {
    if (!reason) {
        return 'Unknown';
    }

    if (REASON_LABELS[reason]) {
        return REASON_LABELS[reason];
    }

    if (reason.startsWith('http_') && httpStatus) {
        return `HTTP ${httpStatus}`;
    }

    return reason;
}

function formatDuration(startedAt: string, resolvedAt: string | null): string {
    const start = new Date(startedAt).getTime();
    const end = resolvedAt ? new Date(resolvedAt).getTime() : Date.now();
    const mins = Math.floor((end - start) / 60000);

    if (mins < 60) {
        return `${mins}m`;
    }

    if (mins < 1440) {
        const h = Math.floor(mins / 60);
        const m = mins % 60;

        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }

    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);

    return h > 0 ? `${d}d ${h}h` : `${d}d`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function UptimeBar({ percentage }: { percentage: number }) {
    const color =
        percentage >= 97
            ? 'bg-green-500'
            : percentage >= 90
              ? 'bg-yellow-500'
              : 'bg-red-500';

    return (
        <div className="mt-10 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uptime</span>
                <span
                    className={`font-semibold ${
                        percentage >= 97
                            ? 'text-green-600 dark:text-green-400'
                            : percentage >= 90
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                    }`}
                >
                    {percentage}%
                </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    small,
}: {
    label: string;
    value: string;
    small?: boolean;
}) {
    return (
        <div className="rounded-md border border-border px-3 py-2.5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p
                className={`mt-0.5 font-semibold ${small ? 'text-sm' : 'text-xl'}`}
            >
                {value}
            </p>
        </div>
    );
}

export default function WebsiteStats({
    website,
    uptime,
    open,
    onClose,
}: Props) {
    const [toggling, setToggling] = useState(false);

    if (!website) {
        return null;
    }

    const isConnected = website.status === 'connected';
    const incident = Array.isArray(website.recentIncident)
        ? null
        : website.recentIncident;

    function handleToggleStatus() {
        const newStatus = isConnected ? 'disconnected' : 'connected';
        setToggling(true);
        router.post(
            websiteRoutes.update.url(),
            { websiteId: website!.id, status: newStatus },
            {
                preserveUrl: true,
                onSuccess: () =>
                    toast.success(
                        newStatus === 'disconnected'
                            ? 'Monitoring disabled'
                            : 'Monitoring activated',
                    ),
                onFinish: () => setToggling(false),
            },
        );
    }

    return (
        <Sheet
            open={open}
            onOpenChange={(o) => {
                if (!o) {
                    onClose();
                }
            }}
        >
            <SheetContent className="overflow-y-auto sm:max-w-xl">
                <SheetHeader className="mb-4">
                    <SheetTitle>Monitoring Stats</SheetTitle>
                </SheetHeader>

                <div className="px-12 pb-8">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex">
                            <div className="text-lg font-medium">
                                {website.url}
                            </div>
                            <div className="ml-2 shrink-0">
                                {!isConnected ? (
                                    <Badge variant="secondary">Disabled</Badge>
                                ) : website.uptime_status === 'up' ? (
                                    <Badge className="border-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                        Online
                                    </Badge>
                                ) : website.uptime_status === 'down' ? (
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
                            </div>
                        </div>
                    </div>

                    {uptime && (
                        <>
                            <UptimeBar percentage={uptime.uptime_percentage} />

                            <div className="mt-10 grid grid-cols-2 gap-3">
                                <StatCard
                                    label="Total Incidents"
                                    value={String(uptime.incident_count)}
                                />
                                <StatCard
                                    label="Monitoring since"
                                    value={
                                        website.connected_at
                                            ? formatDate(website.connected_at)
                                            : '—'
                                    }
                                    small
                                />
                                <StatCard
                                    label="Last 7 days"
                                    value={String(uptime.incidents_7_days)}
                                />
                                <StatCard
                                    label="Last 30 days"
                                    value={String(uptime.incidents_30_days)}
                                />
                            </div>
                        </>
                    )}

                    {isConnected && (
                        <div className="mt-8">
                            <h3 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                Recent incident
                            </h3>

                            {!incident ? (
                                <p className="text-sm text-muted-foreground">
                                    No incidents recorded.
                                </p>
                            ) : (
                                <div
                                    key={incident.id}
                                    className="space-y-1 rounded-md border border-border px-3 py-2.5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                            {reasonLabel(
                                                incident.reason,
                                                incident.http_status,
                                            )}
                                        </span>
                                        <span className="shrink-0 text-xs text-muted-foreground">
                                            {formatDuration(
                                                incident.started_at,
                                                incident.resolved_at,
                                            )}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatDate(incident.started_at)}
                                        {incident.resolved_at ? (
                                            <span className="ml-1 text-green-600 dark:text-green-400">
                                                — recovered
                                            </span>
                                        ) : (
                                            <span className="ml-1 text-red-500">
                                                — ongoing
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-12 border-t border-border pt-8">
                        <button
                            onClick={handleToggleStatus}
                            disabled={toggling}
                            className={`cursor-pointer rounded px-3 py-2 text-sm hover:text-white focus-visible:outline-none disabled:opacity-50 ${
                                isConnected
                                    ? 'border border-red-600 text-red-600 hover:bg-red-700 dark:text-red-400 dark:hover:bg-red-300'
                                    : 'border border-green-600 text-green-600 hover:bg-green-700 dark:text-green-400 dark:hover:bg-green-300'
                            }`}
                        >
                            {isConnected
                                ? 'Disable monitoring'
                                : 'Enable monitoring'}
                        </button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

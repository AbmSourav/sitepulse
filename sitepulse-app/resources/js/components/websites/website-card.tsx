import { CalendarClock, Clock, Globe, User } from 'lucide-react';
import type { WebsiteStatsProps } from '@/components/websites/website-stats';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UptimeStat {
    uptime_seconds: number;
    total_seconds: number;
    uptime_percentage: number;
    incident_count: number;
    incidents_7_days: number;
    incidents_30_days: number;
}

interface Props {
    website: WebsiteStatsProps;
    uptime: UptimeStat | null;
    onSelect: (website: WebsiteStatsProps) => void;
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

function StatusBadge({ website }: { website: WebsiteStatsProps }) {
    if (website.status !== 'connected') {
        return <Badge variant="secondary">Disabled</Badge>;
    }

    if (website.uptime_status === 'up') {
        return (
            <Badge className="border-0 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Online
            </Badge>
        );
    }

    if (website.uptime_status === 'down') {
        return (
            <Badge className="border-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                Down
            </Badge>
        );
    }

    return (
        <Badge variant="outline" className="text-muted-foreground">
            Pending
        </Badge>
    );
}

function DomainExpiry({ dateStr }: { dateStr: string | null }) {
    if (!dateStr) {
        return <span className="text-muted-foreground">—</span>;
    }

    const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);

    return (
        <span
            className={cn(
                'font-medium',
                days <= 30
                    ? 'text-red-600 dark:text-red-400'
                    : days <= 60
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-foreground',
            )}
        >
            {new Date(dateStr).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            })}
            {days <= 30 && ` (${days}d)`}
        </span>
    );
}

export default function WebsiteCard({ website, uptime, onSelect }: Props) {
    const hasUptime = uptime && website.uptime_status !== 'unknown';

    const uptimeColor = uptime
        ? uptime.uptime_percentage >= 97
            ? 'text-green-600 dark:text-green-400'
            : uptime.uptime_percentage >= 90
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-red-600 dark:text-red-400'
        : '';

    return (
        <button
            type="button"
            onClick={() => onSelect(website)}
            className="group cursor-pointer flex w-full flex-col gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
            {/* Header: name + status */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${website.uptime_status === 'down' ? 'bg-destructive/20' : 'bg-primary/10'} text-primary`}>
                        <Globe className={`size-4 ${website.uptime_status === 'down' ? 'text-destructive/90' : ''}`} />
                    </span>
                    <span className="truncate font-medium text-foreground">
                        {website.url}
                    </span>
                </div>
                <StatusBadge website={website} />
            </div>

            {/* Uptime headline */}
            <div className="flex items-baseline gap-2">
                {hasUptime ? (
                    <>
                        <span className={cn('text-3xl font-bold', uptimeColor)}>
                            {uptime.uptime_percentage}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                            uptime
                        </span>
                    </>
                ) : (
                    <span className="text-sm text-muted-foreground">
                        No uptime data yet
                    </span>
                )}
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-1 gap-2 border-t border-border pt-3 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="size-3.5 shrink-0" />
                    <span>Last check:</span>
                    <span className="text-foreground">
                        {formatRelativeTime(website.last_checked_at)}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarClock className="size-3.5 shrink-0" />
                    <span>Expires:</span>
                    <DomainExpiry dateStr={website.domain_expires_at} />
                </div>

                <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                    <User className="size-3.5 shrink-0" />
                    <span>Added by:</span>
                    <span className="text-foreground">
                        {website.created_by?.name ?? '—'}
                    </span>
                </div>
            </div>
        </button>
    );
}

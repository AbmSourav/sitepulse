import { Clock, Globe, Timer } from 'lucide-react';
import type { Website } from '@/types/website';

export interface Incident {
    id: number;
    website_id: number;
    website: Pick<Website, 'id' | 'url'> | null;
    started_at: string;
    resolved_at: string | null;
    reason: string | null;
    http_status: number | null;
}

interface Props {
    incident: Incident;
}

function formatDate(dateStr: string) {
    const normalized = dateStr.includes('T')
        ? dateStr
        : dateStr.replace(' ', 'T') + 'Z';

    return new Date(normalized).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
    });
}

function parseDomain(url: string) {
    try {
        return new URL(url).host;
    } catch {
        return url;
    }
}

function durationLabel(startedAt: string, resolvedAt: string | null): string {
    if (!resolvedAt) {
        return 'Ongoing';
    }

    const ms = new Date(resolvedAt).getTime() - new Date(startedAt).getTime();
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days}d ${hours % 24}h`;
    }

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    }

    return `${minutes}m`;
}

export default function IncidentCard({ incident }: Props) {
    const resolved = incident.resolved_at !== null;

    return (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            {/* Header: website + status */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${resolved ? 'bg-primary/10 text-primary' : 'bg-destructive/20 text-destructive/90'}`}
                    >
                        <Globe className="size-4" />
                    </span>
                    <span className="truncate font-medium text-foreground">
                        {incident.website
                            ? parseDomain(incident.website.url)
                            : '—'}
                    </span>
                </div>

                {resolved ? (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Resolved
                    </span>
                ) : (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Down
                    </span>
                )}
            </div>

            {/* Duration headline */}
            <div className="flex items-center gap-2">
                <Timer className="size-4 text-muted-foreground" />
                {resolved ? (
                    <span className="text-lg font-semibold text-foreground">
                        {durationLabel(
                            incident.started_at,
                            incident.resolved_at,
                        )}
                    </span>
                ) : (
                    <span className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                        Ongoing
                    </span>
                )}
                {incident.http_status && (
                    <span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        HTTP {incident.http_status}
                    </span>
                )}
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs">
                <div className="flex items-center gap-1 text-muted-foreground">
                    <span>Started:</span>
                    <span className="text-foreground">
                        {formatDate(incident.started_at)}
                    </span>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground">
                    <span>Resolved:</span>
                    <span className="text-foreground">
                        {incident.resolved_at
                            ? formatDate(incident.resolved_at)
                            : '—'}
                    </span>
                </div>

                {incident.reason && (
                    <div className="text-muted-foreground">
                        <span>Reason: </span>
                        <span className="text-foreground">
                            {incident.reason}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

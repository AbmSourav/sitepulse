import { Link } from '@inertiajs/react';
import { CalendarDays, Globe, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { show as auditReportShow } from '@/routes/audit-reports';
import type { AuditReport } from '@/types';

interface Props {
    report: AuditReport;
    onSelect: (report: AuditReport) => void;
}

function parseDomain(url: string) {
    try {
        return new URL(url).host;
    } catch {
        return url;
    }
}

function SslBadge({ valid }: { valid: boolean | undefined }) {
    if (valid === true) {
        return (
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                <span className="inline-block size-1.5 rounded-full bg-green-500" />
                Valid
            </span>
        );
    }

    if (valid === false) {
        return (
            <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                <span className="inline-block size-1.5 rounded-full bg-red-500" />
                Invalid
            </span>
        );
    }

    return <span className="text-muted-foreground">—</span>;
}

export default function AuditReportCard({ report, onSelect }: Props) {
    const wpVersion = report.server?.wp_version?.version;
    const isUp = Boolean(wpVersion);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onSelect(report)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(report);
                }
            }}
            className="group flex cursor-pointer flex-col gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
            {/* Header: website + up/down */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Globe className="size-4" />
                    </span>
                    <span className="truncate font-medium text-foreground">
                        {report.website ? parseDomain(report.website.url) : '—'}
                    </span>
                </div>

                {isUp ? (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        UP
                    </span>
                ) : (
                    <span className="inline-flex shrink-0 items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        DOWN
                    </span>
                )}
            </div>

            {/* Meta */}
            <div className="grid grid-cols-1 gap-2 border-t border-border pt-3 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <CalendarDays className="size-3.5 shrink-0" />
                    <span>Audited:</span>
                    <span className="text-foreground">
                        {new Date(report.audited_at).toLocaleDateString(
                            undefined,
                            { day: '2-digit', month: 'short', year: 'numeric' },
                        )}
                    </span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground">
                    <ShieldCheck className="size-3.5 shrink-0" />
                    <span>SSL:</span>
                    <SslBadge valid={report.security?.ssl_valid} />
                </div>

                <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
                    <span>WP version:</span>
                    <span className="text-foreground">{wpVersion ?? '—'}</span>
                </div>
            </div>

            {/* Full-report link — stop propagation so it doesn't open the sheet */}
            <div
                className="border-t border-border pt-3"
                onClick={(e) => e.stopPropagation()}
            >
                <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={auditReportShow(report.id).url}>
                        View full report
                    </Link>
                </Button>
            </div>
        </div>
    );
}

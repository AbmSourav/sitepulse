import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { AuditReport, AuditReportPlugin, AuditReportTheme } from '@/types';

interface Props {
    report: AuditReport | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function formatBytes(bytes?: number): string {
    if (!bytes) return '—';
    if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
    return <h3 className="text-sm font-semibold text-foreground mb-3">{children}</h3>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
            <span className="text-muted-foreground shrink-0">{label}</span>
            <span className="text-foreground text-right">{children}</span>
        </div>
    );
}

function HealthCheckRow({ label, value }: { label: string; value?: Record<string, string> }) {
    if (!value) return null;
    const status = value.status ?? '';
    const good = status === 'good';
    return (
        <div className="flex items-center justify-between py-1.5 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <Badge className={good
                ? 'border-transparent bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }>
                {value.label ?? status}
            </Badge>
        </div>
    );
}

function PluginRow({ item }: { item: AuditReportPlugin }) {
    const outdated = item.require_update;

    return (
        <div className="py-2 border-b border-border last:border-0">
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                    {item.is_active && (
                        <Badge className="border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Active</Badge>
                    )}
                    {outdated && (
                        <Badge className="border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Outdated</Badge>
                    )}
                </div>
            </div>
            <span className="text-xs text-muted-foreground">
                {item.installed_version}
                {outdated && ` → ${item.latest_version}`}
            </span>
        </div>
    );
}

function ThemeRow({ item }: { item: AuditReportTheme }) {
    const outdated = item.require_update;
    return (
        <div className="py-2 border-b border-border last:border-0">
            <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                <div className="flex items-center gap-1 shrink-0">
                    {item.is_active && (
                        <Badge className="border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Active</Badge>
                    )}
                    {outdated && (
                        <Badge className="border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Outdated</Badge>
                    )}
                </div>
            </div>
            <span className="text-xs text-muted-foreground">
                {item.installed_version}
                {outdated && ` → ${item.latest_version}`}
            </span>
        </div>
    );
}

export function AuditReportDetail({ report, open, onOpenChange }: Props) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-xl overflow-y-auto" side="right">
                <SheetHeader>
                    <SheetTitle>Audit Report</SheetTitle>
                    {report && (
                        <SheetDescription>
                            {new Date(report.audited_at).toLocaleDateString(undefined, {
                                weekday: 'short', day: '2-digit', month: 'long', year: 'numeric',
                            })}
                        </SheetDescription>
                    )}
                </SheetHeader>

                {report && (
                    <div className="px-5 pb-6 space-y-5">
                        {/* Server */}
                        <section>
                            <SectionHeading>Server</SectionHeading>
                            <Row label="WordPress">{report.server?.wp_version?.version ?? '—'}</Row>
                            <Row label="PHP">{report.server?.php_version?.version ?? '—'}</Row>
                            <Row label="MySQL">{report.server?.sql_server?.version ?? '—'}</Row>
                            <Row label="Database size">{formatBytes(report.server?.db_size_bytes)}</Row>
                            <Row label="PHP errors">
                                {report.server?.php_errors?.status
                                    ? <span className="text-red-600 dark:text-red-400">Error</span>
                                    : <span className="text-green-600 dark:text-green-400">None</span>
                                }
                            </Row>
                        </section>

                        <Separator />

                        {/* Security */}
                        <section>
                            <SectionHeading>Security</SectionHeading>
                            <Row label="SSL">
                                {report.security?.ssl_valid === true ? (
                                    <Badge className="border-transparent bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Valid</Badge>
                                ) : report.security?.ssl_valid === false ? (
                                    <Badge variant="destructive">Invalid</Badge>
                                ) : '—'}
                            </Row>
                            {report.security?.ssl_expires_at && (
                                <Row label="SSL expires">{report.security.ssl_expires_at}</Row>
                            )}
                        </section>

                        <Separator />

                        {/* Health */}
                        <section>
                            <SectionHeading>Health</SectionHeading>
                            <Row label="Cron">
                                <Badge variant={report.health?.cron_status === 'enabled' ? 'secondary' : 'outline'}>
                                    {report.health?.cron_status ?? '—'}
                                </Badge>
                            </Row>
                            <Row label="Debug mode">
                                {report.health?.debug_mode
                                    ? <Badge className="border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">On</Badge>
                                    : <Badge variant="secondary">Off</Badge>
                                }
                            </Row>
                            {report.health?.admin_email && (
                                <Row label="Admin email">{report.health.admin_email}</Row>
                            )}
                            {report.health?.locale && (
                                <Row label="Locale">{report.health.locale}</Row>
                            )}
                            <HealthCheckRow label="HTTPS" value={report.health?.https_status} />
                            <HealthCheckRow label="Scheduled events" value={report.health?.scheduled_events} />
                            <HealthCheckRow label="Background updates" value={report.health?.background_updates} />
                            <HealthCheckRow label="Loopback requests" value={report.health?.loopback_requests} />
                            <HealthCheckRow label="REST API" value={report.health?.rest_availability} />
                        </section>

                        <Separator />

                        {/* Plugins */}
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <SectionHeading>Plugins</SectionHeading>
                                <span className="text-xs text-muted-foreground">
                                    {report.plugins?.total ?? 0} total
                                    {(report.plugins?.outdated ?? 0) > 0 && `, ${report.plugins!.outdated} outdated`}
                                </span>
                            </div>
                        </section>

                        <Separator />

                        {/* Themes */}
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <SectionHeading>Themes</SectionHeading>
                                <span className="text-xs text-muted-foreground">
                                    {report.themes?.total ?? 0} total
                                    {(report.themes?.outdated ?? 0) > 0 && `, ${report.themes!.outdated} outdated`}
                                </span>
                            </div>
                        </section>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}

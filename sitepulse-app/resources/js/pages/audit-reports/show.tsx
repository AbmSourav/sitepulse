import { usePage } from '@inertiajs/react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { index as auditReportsIndex } from '@/routes/audit-reports';
import type { AuditReport, AuditReportPlugin, AuditReportTheme } from '@/types';

interface Props {
    report: AuditReport;
    website: 'string' | null;
    [key: string]: unknown;
}

function formatBytes(bytes?: number): string {
    if (!bytes) return '—';
    if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
    return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
    return <h2 className="text-2xl font-semibold text-foreground mb-3">{children}</h2>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-start justify-between gap-4 mt-2 py-2 text-sm border-b border-border last:border-0">
            <span className="text-muted-foreground shrink-0 w-40">{label}</span>
            <span className="text-foreground text-right">{children ?? '—'}</span>
        </div>
    );
}

function HealthCheckRow({ label, value }: { label: string; value?: Record<string, string> }) {
    if (!value) return null;
    const status = value.status ?? '';
    const good = status === 'good';
    return (
        <div className="flex items-center justify-between mt-3 py-2 text-sm border-b border-border last:border-0">
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
    return (
        <div className="flex items-center justify-between mt-3 py-2.5 border-b border-border last:border-0">
            <div>
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                    {item.installed_version}
                    {item.require_update && ` → ${item.latest_version}`}
                </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                {item.is_active && (
                    <Badge className="border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Active</Badge>
                )}
                {item.require_update && (
                    <Badge className="border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Outdated</Badge>
                )}
                {item.has_vulnerability && (
                    <Badge variant="destructive">Vulnerable</Badge>
                )}
            </div>
        </div>
    );
}

function ThemeRow({ item }: { item: AuditReportTheme }) {
    return (
        <div className="flex items-center justify-between mt-3 py-2.5 border-b border-border last:border-0">
            <div>
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                    {item.installed_version}
                    {item.require_update && ` → ${item.latest_version}`}
                </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                {item.is_active && (
                    <Badge className="border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Active</Badge>
                )}
                {item.require_update && (
                    <Badge className="border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Outdated</Badge>
                )}
            </div>
        </div>
    );
}

export default function AuditReportShow() {
    const { report, website } = usePage<Props>().props;

    const auditedAt = new Date(report.audited_at).toLocaleDateString(undefined, {
        weekday: 'short', day: '2-digit', month: 'long', year: 'numeric',
    });

    return (
        <>
            <div className="p-6 w-full space-y-8">

                {/* Header */}
                <div>
                    <h1 className="text-2xl font-semibold text-foreground mb-1">{website}</h1>
                    <p className="text-sm text-muted-foreground">{auditedAt}</p>
                </div>

                {/* Section nav */}
                <div className="flex items-center gap-1 flex-wrap">
                    {(['Server', 'Security', 'Health', 'Plugins', 'Themes'] as const).map((label) => (
                        <button
                            key={label}
                            onClick={() => document.getElementById(label.toLowerCase())?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="bg-green-100 cursor-pointer px-3 py-1.5 text-sm rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <Separator />

                <div className='max-w-[60%] mx-auto'>
                    {/* Server */}
                    <section id="server">
                        <SectionHeading>Server</SectionHeading>
                        <Row label="WordPress">{report.server?.wp_version?.version}</Row>
                        <Row label="PHP">{report.server?.php_version?.version}</Row>
                        <Row label="MySQL">{report.server?.sql_server?.version}</Row>
                        <Row label="Database size">{formatBytes(report.server?.db_size_bytes)}</Row>

                        <div
                        className={`flex ${report.server?.php_errors?.status ? 'flex-col' : ''} items-start justify-between gap-4 mt-2 py-2 text-sm border-b border-border last:border-0`}
                        >
                            <span className="text-muted-foreground shrink-0 w-40">
                                PHP Error
                            </span>
                            {report.server?.php_errors?.status
                                ? <div className="text-red-600 dark:text-red-400">
                                    status: {report?.server?.php_errors?.status} <br />
                                    file: {report?.server?.php_errors?.file} <br />
                                    message: {report?.server?.php_errors?.message}
                                  </div>
                                : <span className="text-green-600 dark:text-green-400">None</span>
                            }
                        </div>
                    </section>

                    <Separator className="my-12" />

                    {/* Security */}
                    <section id="security">
                        <SectionHeading>Security</SectionHeading>
                        <Row label="SSL">
                            {report.security?.ssl_valid === true ? (
                                <Badge className="border-transparent bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Valid</Badge>
                            ) : report.security?.ssl_valid === false ? (
                                <Badge variant="destructive">Invalid</Badge>
                            ) : null}
                        </Row>
                        {report.security?.ssl_expires_at && (
                            <Row label="SSL expires">{report.security.ssl_expires_at}</Row>
                        )}
                    </section>

                    <Separator className="my-10" />

                    {/* Health */}
                    <section id="health">
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
                        {report.health?.admin_email && <Row label="Admin email">{report.health.admin_email}</Row>}
                        {report.health?.locale && <Row label="Locale">{report.health.locale}</Row>}
                        <HealthCheckRow label="HTTPS" value={report.health?.https_status} />
                        <HealthCheckRow label="Scheduled events" value={report.health?.scheduled_events} />
                        <HealthCheckRow label="Background updates" value={report.health?.background_updates} />
                        <HealthCheckRow label="Loopback requests" value={report.health?.loopback_requests} />
                        <HealthCheckRow label="REST API" value={report.health?.rest_availability} />
                    </section>

                    <Separator className="my-10" />

                    {/* Plugins */}
                    <section id="plugins">
                        <div className="flex items-center justify-between mb-3">
                            <SectionHeading>Plugins</SectionHeading>
                            <span className="text-sm text-muted-foreground">
                                {report.plugins?.total ?? 0} total
                                {(report.plugins?.outdated ?? 0) > 0 && `, ${report.plugins!.outdated} outdated`}
                            </span>
                        </div>
                        {report.plugins?.items?.length
                            ? report.plugins.items.map((item, i) => <PluginRow key={i} item={item} />)
                            : <p className="text-sm text-muted-foreground">No plugins found.</p>
                        }
                    </section>

                    <Separator className="my-10" />

                    {/* Themes */}
                    <section id="themes">
                        <div className="flex items-center justify-between mb-3">
                            <SectionHeading>Themes</SectionHeading>
                            <span className="text-sm text-muted-foreground">
                                {report.themes?.total ?? 0} total
                                {(report.themes?.outdated ?? 0) > 0 && `, ${report.themes!.outdated} outdated`}
                            </span>
                        </div>
                        {report.themes?.items?.length
                            ? report.themes.items.map((item, i) => <ThemeRow key={i} item={item} />)
                            : <p className="text-sm text-muted-foreground">No themes found.</p>
                        }
                    </section>
                </div>
            </div>
        </>
    );
}

AuditReportShow.layout = () => ({
    breadcrumbs: [
        { title: 'Audit Reports', href: auditReportsIndex.url() },
        { title: 'Report Detail' },
    ],
});

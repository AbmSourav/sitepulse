import { Link, usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import {
    index as auditReportsIndex,
    summary as summaryRoute,
} from '@/routes/audit-reports';
import { edit as profileEdit } from '@/routes/profile';
import type {
    AiSummary,
    AuditReport,
    AuditReportPlugin,
    AuditReportTheme,
} from '@/types';

interface Props {
    report: AuditReport;
    website: 'string' | null;
    [key: string]: unknown;
}

const SEVERITY_STYLES: Record<string, string> = {
    critical: 'border-transparent bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    warning: 'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    info: 'border-transparent bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

const SEVERITY_ORDER: Record<string, number> = {
    critical: 0,
    warning: 1,
    info: 2,
};

function formatBytes(bytes?: number): string {
    if (!bytes) {
        return '—';
    }

    if (bytes >= 1_073_741_824) {
        return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
    }

    return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
        <h2 className="mb-3 text-2xl font-semibold text-foreground">
            {children}
        </h2>
    );
}

function Row({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="mt-2 flex items-start justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
            <span className="w-40 shrink-0 text-muted-foreground">{label}</span>
            <span className="text-right text-foreground">
                {children ?? '—'}
            </span>
        </div>
    );
}

function HealthCheckRow({
    label,
    value,
}: {
    label: string;
    value?: Record<string, string>;
}) {
    if (!value) {
        return null;
    }

    const status = value.status ?? '';
    const good = status === 'good';

    return (
        <div className="mt-3 flex items-center justify-between border-b border-border py-2 text-sm last:border-0">
            <span className="text-muted-foreground">{label}</span>
            <Badge
                className={
                    good
                        ? 'border-transparent bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }
            >
                {value.label ?? status}
            </Badge>
        </div>
    );
}

function PluginRow({ item }: { item: AuditReportPlugin }) {
    return (
        <div className="mt-3 flex items-center justify-between border-b border-border py-2.5 last:border-0">
            <div>
                <p className="text-sm font-medium text-foreground">
                    {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                    {item.installed_version}
                    {item.require_update && ` → ${item.latest_version}`}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
                {item.is_active && (
                    <Badge className="border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Active
                    </Badge>
                )}
                {item.require_update && (
                    <Badge className="border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Outdated
                    </Badge>
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
        <div className="mt-3 flex items-center justify-between border-b border-border py-2.5 last:border-0">
            <div>
                <p className="text-sm font-medium text-foreground">
                    {item.name}
                </p>
                <p className="text-xs text-muted-foreground">
                    {item.installed_version}
                    {item.require_update && ` → ${item.latest_version}`}
                </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
                {item.is_active && (
                    <Badge className="border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        Active
                    </Badge>
                )}
                {item.require_update && (
                    <Badge className="border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        Outdated
                    </Badge>
                )}
            </div>
        </div>
    );
}

type SummaryState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ready'; data: AiSummary }
    | { status: 'needs_setup' }
    | { status: 'error'; message: string };

function AiSummaryPanel({ report }: { report: AuditReport }) {
    const { hasAiApiKey } = usePage<Props>().props;

    const [state, setState] = useState<SummaryState>(
        report.ai_summary
            ? { status: 'ready', data: report.ai_summary }
            : { status: 'idle' },
    );

    // Default open when a summary already exists; otherwise start collapsed.
    const [open, setOpen] = useState<boolean>(!!report.ai_summary);

    async function generate() {
        if (state?.status === 'loading') {
            return;
        }

        setState({ status: 'loading' });

        try {
            // Inertia/Laravel ships the CSRF token in the XSRF-TOKEN cookie;
            // send it back as the X-XSRF-TOKEN header (raw fetch doesn't auto-do this).
            const xsrf = decodeURIComponent(
                document.cookie
                    .split('; ')
                    .find((c) => c.startsWith('XSRF-TOKEN='))
                    ?.split('=')[1] ?? '',
            );

            const res = await fetch(summaryRoute.url({ auditReport: report.id }), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': xsrf,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const body = await res.json();

            if (body.needs_setup) {
                setState({ status: 'needs_setup' });
            } else if (body.error) {
                setState({ status: 'error', message: body.error });
            } else {
                setState({ status: 'ready', data: body as AiSummary });
                setOpen(true);
            }
        } catch {
            setState({
                status: 'error',
                message: 'Could not reach the server. Please try again.',
            });
        }
    }

    return (
        <Collapsible
            open={open}
            onOpenChange={setOpen}
            className="rounded-lg border border-border bg-muted/30"
        >
            <div className="group flex w-full justify-between gap-4 p-5 text-left">
                <div className="flex flex-col gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">
                            AI summary
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            A plain-English overview and prioritized
                            recommendations, generated by Claude.
                        </p>
                    </div>

                    {!hasAiApiKey && (
                        <p className="text-sm text-muted-foreground">
                            Add your Claude API key in{' '}
                            <Link href={profileEdit.url()} className="underline">
                                Profile settings
                            </Link>{' '}
                            to enable AI summaries.
                        </p>
                    )}

                    {hasAiApiKey == true && (
                        <div className="relative">
                            <div
                            onClick={generate}
                            className="cursor-pointer w-[150px] px-3 py-3 text-sm shadow-md rounded bg-primary text-white font-medium text-center"
                            >
                                {state.status === 'loading'
                                    ? 'Analyzing…'
                                    : 'Explain with AI'}
                            </div>
                        </div>
                    )}
                </div>
                <CollapsibleTrigger className="group/chevron h-fit shrink-0 cursor-pointer p-5">
                    <ChevronDown className="size-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]/chevron:rotate-180" />
                </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="space-y-4 px-5 pb-5">
                {state.status === 'error' && (
                    <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-red-600 dark:text-red-400">
                            {state.message}
                        </p>
                        <Button
                            variant="outline"
                            onClick={generate}
                            className="shrink-0 cursor-pointer"
                        >
                            Retry
                        </Button>
                    </div>
                )}

                {state.status === 'ready' && (
                    <div className="space-y-4 pt-3">
                        <div className='px-10'><hr className="border-border" /></div>
                        <p className="text-sm text-foreground pt-3 leading-relaxed">
                            {state.data.summary}
                        </p>

                        {state.data.recommendations.length > 0 && (
                            <ul className="space-y-2">
                                {[...state.data.recommendations]
                                    .sort(
                                        (a, b) =>
                                            (SEVERITY_ORDER[a.severity] ?? 3) -
                                            (SEVERITY_ORDER[b.severity] ?? 3),
                                    )
                                    .map((rec, i) => (
                                        <li
                                            key={i}
                                            className="rounded-md border border-border bg-background p-3"
                                        >
                                            <div className="mb-1 flex items-center gap-2">
                                                <Badge
                                                    className={
                                                        SEVERITY_STYLES[
                                                            rec.severity
                                                        ] ?? SEVERITY_STYLES.info
                                                    }
                                                >
                                                    {rec.severity}
                                                </Badge>
                                                <span className="text-sm font-medium text-foreground">
                                                    {rec.title}
                                                </span>
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                {rec.action}
                                            </p>
                                        </li>
                                    ))}
                            </ul>
                        )}

                        <p className="text-xs text-muted-foreground">
                            Generated by {state.data.model}
                        </p>
                    </div>
                )}
            </CollapsibleContent>
        </Collapsible>
    );
}

export default function AuditReportShow() {
    const { report, website } = usePage<Props>().props;

    const auditedAt = new Date(report.audited_at).toLocaleDateString(
        undefined,
        {
            weekday: 'short',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
        },
    );

    return (
        <>
            <div className="w-full space-y-8 p-6">
                {/* Header */}
                <div>
                    <h1 className="mb-1 text-2xl font-semibold text-foreground">
                        {website}
                    </h1>
                    <p className="text-sm text-muted-foreground">{auditedAt}</p>
                </div>

                {/* Section nav */}
                <div className="flex flex-wrap items-center gap-1">
                    {(
                        [
                            'Server',
                            'Security',
                            'Health',
                            'Plugins',
                            'Themes',
                        ] as const
                    ).map((label) => (
                        <button
                            key={label}
                            onClick={() =>
                                document
                                    .getElementById(label.toLowerCase())
                                    ?.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'start',
                                    })
                            }
                            className="cursor-pointer rounded-md bg-green-100 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <Separator />

                {/* AI summary */}
                <AiSummaryPanel report={report} />

                <div className="mx-auto max-w-[60%]">
                    {/* Server */}
                    <section id="server">
                        <SectionHeading>Server</SectionHeading>
                        <Row label="WordPress">
                            {report.server?.wp_version?.version}
                        </Row>
                        <Row label="PHP">
                            {report.server?.php_version?.version}
                        </Row>
                        <Row label="MySQL">
                            {report.server?.sql_server?.version}
                        </Row>
                        <Row label="Database size">
                            {formatBytes(report.server?.db_size_bytes)}
                        </Row>

                        <div
                            className={`flex ${report.server?.php_errors?.status ? 'flex-col' : ''} mt-2 items-start justify-between gap-4 border-b border-border py-2 text-sm last:border-0`}
                        >
                            <span className="w-40 shrink-0 text-muted-foreground">
                                PHP Error
                            </span>
                            {report.server?.php_errors?.status ? (
                                <div className="text-red-600 dark:text-red-400">
                                    status: {report?.server?.php_errors?.status}{' '}
                                    <br />
                                    file: {
                                        report?.server?.php_errors?.file
                                    }{' '}
                                    <br />
                                    message:{' '}
                                    {report?.server?.php_errors?.message}
                                </div>
                            ) : (
                                <span className="text-green-600 dark:text-green-400">
                                    None
                                </span>
                            )}
                        </div>
                    </section>

                    <Separator className="my-12" />

                    {/* Security */}
                    <section id="security">
                        <SectionHeading>Security</SectionHeading>
                        <Row label="SSL">
                            {report.security?.ssl_valid === true ? (
                                <Badge className="border-transparent bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    Valid
                                </Badge>
                            ) : report.security?.ssl_valid === false ? (
                                <Badge variant="destructive">Invalid</Badge>
                            ) : null}
                        </Row>
                        {report.security?.ssl_expires_at && (
                            <Row label="SSL expires">
                                {report.security.ssl_expires_at}
                            </Row>
                        )}
                    </section>

                    <Separator className="my-10" />

                    {/* Health */}
                    <section id="health">
                        <SectionHeading>Health</SectionHeading>
                        <Row label="Cron">
                            <Badge
                                variant={
                                    report.health?.cron_status === 'enabled'
                                        ? 'secondary'
                                        : 'outline'
                                }
                            >
                                {report.health?.cron_status ?? '—'}
                            </Badge>
                        </Row>
                        <Row label="Debug mode">
                            {report.health?.debug_mode ? (
                                <Badge className="border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                    On
                                </Badge>
                            ) : (
                                <Badge variant="secondary">Off</Badge>
                            )}
                        </Row>
                        {report.health?.admin_email && (
                            <Row label="Admin email">
                                {report.health.admin_email}
                            </Row>
                        )}
                        {report.health?.locale && (
                            <Row label="Locale">{report.health.locale}</Row>
                        )}
                        <HealthCheckRow
                            label="HTTPS"
                            value={report.health?.https_status}
                        />
                        <HealthCheckRow
                            label="Scheduled events"
                            value={report.health?.scheduled_events}
                        />
                        <HealthCheckRow
                            label="Background updates"
                            value={report.health?.background_updates}
                        />
                        <HealthCheckRow
                            label="Loopback requests"
                            value={report.health?.loopback_requests}
                        />
                        <HealthCheckRow
                            label="REST API"
                            value={report.health?.rest_availability}
                        />
                    </section>

                    <Separator className="my-10" />

                    {/* Plugins */}
                    <section id="plugins">
                        <div className="mb-3 flex items-center justify-between">
                            <SectionHeading>Plugins</SectionHeading>
                            <span className="text-sm text-muted-foreground">
                                {report.plugins?.total ?? 0} total
                                {(report.plugins?.outdated ?? 0) > 0 &&
                                    `, ${report.plugins!.outdated} outdated`}
                            </span>
                        </div>
                        {report.plugins?.items?.length ? (
                            report.plugins.items.map((item, i) => (
                                <PluginRow key={i} item={item} />
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No plugins found.
                            </p>
                        )}
                    </section>

                    <Separator className="my-10" />

                    {/* Themes */}
                    <section id="themes">
                        <div className="mb-3 flex items-center justify-between">
                            <SectionHeading>Themes</SectionHeading>
                            <span className="text-sm text-muted-foreground">
                                {report.themes?.total ?? 0} total
                                {(report.themes?.outdated ?? 0) > 0 &&
                                    `, ${report.themes!.outdated} outdated`}
                            </span>
                        </div>
                        {report.themes?.items?.length ? (
                            report.themes.items.map((item, i) => (
                                <ThemeRow key={i} item={item} />
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                No themes found.
                            </p>
                        )}
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

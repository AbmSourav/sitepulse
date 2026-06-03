import { Head, Link, usePage } from '@inertiajs/react';
import AlertError from '@/components/alert-error';
import { Badge } from '@/components/ui/badge';
import { dashboard } from '@/routes';
import websiteRoutes from '@/routes/websites';

interface SiteStat {
    id: number;
    url: string;
    status: string;
    uptime_status: string;
    last_checked_at: string | null;
    uptime_7d: number | null;
    incidents_7d: number;
}

interface Props {
    emailVerified: boolean;
    sitesOnline: number;
    sitesTotal: number;
    activeIncidents: number;
    avgUptime7d: number | null;
    siteStats: SiteStat[];
}

function formatRelativeTime(dateStr: string | null): string {
    if (!dateStr) return '—';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function uptimeColor(pct: number) {
    if (pct >= 97) return 'text-green-600 dark:text-green-400';
    if (pct >= 90) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="flex flex-col gap-1 rounded-xl border border-sidebar-border/70 dark:border-sidebar-border p-5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
            <span className="text-3xl font-semibold">{value}</span>
            {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
        </div>
    );
}

export default function Dashboard() {
    const { emailVerified, sitesOnline, sitesTotal, activeIncidents, avgUptime7d, siteStats } =
        usePage<Props & Record<string, unknown>>().props;

    return (
        <>
            <Head title="Dashboard" />

            {!emailVerified && (
                <div className="mx-4 mt-4">
                    <AlertError
                        title="Email not verified"
                        errors={['Please check your mail inbox and verify your email address.']}
                    />
                </div>
            )}

            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-4">
                <div className="grid auto-rows-min gap-4 md:grid-cols-3">
                    <StatCard
                        label="Sites Online"
                        value={`${sitesOnline} / ${sitesTotal}`}
                        sub={sitesTotal === 0 ? 'No sites monitored yet' : sitesOnline === sitesTotal ? 'All sites up' : `${sitesTotal - sitesOnline} site${sitesTotal - sitesOnline !== 1 ? 's' : ''} offline`}
                    />
                    <StatCard
                        label="Active Incidents"
                        value={activeIncidents}
                        sub={activeIncidents === 0 ? 'No ongoing outages' : `${activeIncidents} site${activeIncidents !== 1 ? 's' : ''} currently down`}
                    />
                    <StatCard
                        label="Avg 7-day Uptime"
                        value={avgUptime7d != null ? `${avgUptime7d}%` : '—'}
                        sub="Across all connected sites"
                    />
                </div>

                <div className="flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <div className="flex items-center justify-between border-b border-border px-5 py-3">
                        <span className="text-sm font-medium">Sites — last 7 days</span>
                        <Link href={websiteRoutes.index.url()} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            Manage sites →
                        </Link>
                    </div>

                    <table className="w-full text-sm">
                        <thead>
                            <tr className="h-[45px] border-b border-border bg-muted/40 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                <th className="px-5 py-3">Site</th>
                                <th className="px-5 py-3">Status</th>
                                <th className="px-5 py-3">Uptime</th>
                                <th className="px-5 py-3">Incidents</th>
                                <th className="px-5 py-3">Last Check</th>
                            </tr>
                        </thead>
                        <tbody>
                            {siteStats.length > 0 ? siteStats.map((site) => (
                                <tr
                                    key={site.id}
                                    className="h-[55px] border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                                >
                                    <td className="px-5 py-3 font-medium">{site.url}</td>

                                    <td className="px-5 py-3">
                                        {site.status === 'disconnected' ? (
                                            <Badge variant="secondary">Disabled</Badge>
                                        ) : site.uptime_status === 'up' ? (
                                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">Online</Badge>
                                        ) : site.uptime_status === 'down' ? (
                                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">Down</Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                                        )}
                                    </td>

                                    <td className="px-5 py-3">
                                        {site.uptime_7d != null ? (
                                            <span className={`font-medium ${uptimeColor(site.uptime_7d)}`}>
                                                {site.uptime_7d}%
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground">—</span>
                                        )}
                                    </td>

                                    <td className="px-5 py-3 text-muted-foreground">
                                        {site.incidents_7d > 0 ? (
                                            <span className="text-red-600 dark:text-red-400 font-medium">{site.incidents_7d}</span>
                                        ) : '0'}
                                    </td>

                                    <td className="px-5 py-3 text-muted-foreground">
                                        {formatRelativeTime(site.last_checked_at)}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="px-5 py-12 text-center text-muted-foreground">
                                        <span className="mb-2 block">No sites monitored yet.</span>
                                        <Link href={websiteRoutes.index.url()} className="bg-primary text-white px-2 py-1 rounded hover:bg-primary/90 transition-colors">
                                            Add a site
                                        </Link>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = () => ({
    breadcrumbs: [{
        title: 'Dashboard',
        href: dashboard(),
    }],
});

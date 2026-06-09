import { Head, Link, usePage } from '@inertiajs/react';
import { Activity, Bell, Globe, PlugZap, ShieldCheck, Zap } from 'lucide-react';
import { dashboard, login, register } from '@/routes';
import AppLogo from '@/components/app-logo';

export default function Welcome({
    canRegister = true,
}: {
    canRegister?: boolean;
}) {
    const { auth } = usePage<{ auth: { user: unknown } }>().props;

    return (
        <>
            <Head title="SitePulse — Uptime & WordPress Audit Monitoring" />

            <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
                <div className="">
                    {/* Nav */}
                    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
                        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                            <div className="flex items-center overflow-hidden">
                                <AppLogo size={10} />
                            </div>
                            <nav className="flex items-center gap-3">
                                {auth.user ? (
                                    <Link
                                        href={dashboard()}
                                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                                    >
                                        Dashboard →
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href={login()}
                                            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                        >
                                            Log in
                                        </Link>
                                        {canRegister && (
                                            <Link
                                                href={register()}
                                                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
                                            >
                                                Get started free
                                            </Link>
                                        )}
                                    </>
                                )}
                            </nav>
                        </div>
                    </header>

                    {/* Hero */}
                    <section className="relative overflow-hidden px-6 py-24 text-center lg:py-28">
                        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-white to-white dark:from-primary/10 dark:via-gray-950 dark:to-gray-950" />
                        <div className="mx-auto max-w-3xl">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                                </span>
                                Uptime monitoring + WordPress audits
                            </div>
                            <h1 className="mb-6 flex flex-col text-5xl leading-tight font-extrabold tracking-tight lg:text-6xl">
                                <span>Monitor any Website</span>
                                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-4xl text-transparent">
                                    Deep-dive WordPress website
                                </span>
                            </h1>
                            <p className="mx-auto mb-10 max-w-xl text-lg text-gray-500 dark:text-gray-400">
                                SitePulse checks uptime for any website — and
                                goes deeper for WordPress with plugin audits,
                                SSL tracking, PHP error detection,
                                <br />
                                and instant alerts.
                            </p>
                            <p className="mb-8 text-gray-500 dark:text-gray-400">
                                Monitor up to 3 sites for free. No credit card
                                required.
                            </p>
                            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                                {canRegister ? (
                                    <Link
                                        href={register()}
                                        className="rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
                                    >
                                        Start monitoring free
                                    </Link>
                                ) : (
                                    <Link
                                        href={login()}
                                        className="rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
                                    >
                                        Log in
                                    </Link>
                                )}
                                <a
                                    href="#how-it-works"
                                    className="rounded-xl border border-gray-200 px-8 py-3.5 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                                >
                                    See how it works
                                </a>
                            </div>
                        </div>
                    </section>

                    {/* Stats bar */}
                    <div className="border-y border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50">
                        <div className="mx-auto grid max-w-5xl grid-cols-2 divide-x divide-y divide-gray-100 md:grid-cols-4 md:divide-y-0 dark:divide-gray-800">
                            {[
                                {
                                    value: '5 min',
                                    label: 'Check interval on Free plan',
                                },
                                {
                                    value: '100+',
                                    label: 'Proxy IPs to prevent false alerts',
                                },
                                {
                                    value: '99.9%',
                                    label: 'Uptime report accuracy',
                                },
                                {
                                    value: 'Instant',
                                    label: 'Slack, Discord & email alerts',
                                },
                            ].map((stat) => (
                                <div
                                    key={stat.label}
                                    className="px-8 py-6 text-center"
                                >
                                    <p className="text-2xl font-bold text-primary">
                                        {stat.value}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {stat.label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Two modes */}
                <section id="how-it-works" className="px-6 py-24">
                    <div className="mx-auto max-w-5xl">
                        <div className="mb-16 text-center">
                            <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
                                Two ways to monitor
                            </h2>
                            <p className="mt-4 text-gray-500 dark:text-gray-400">
                                Works out of the box for any site. Goes further
                                for WordPress.
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Any website */}
                            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                <div className="mb-5 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                                    <Globe className="h-6 w-6" />
                                </div>
                                <div className="mb-1 text-xs font-semibold tracking-widest text-primary uppercase">
                                    Any Website
                                </div>
                                <h3 className="mb-3 text-xl font-bold">
                                    Uptime monitoring
                                </h3>
                                <p className="mb-6 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                                    Add any URL — no plugin, no setup. SitePulse
                                    pings your site on a regular schedule and
                                    alerts you the moment it goes down or
                                    recovers.
                                </p>
                                <ol className="space-y-3">
                                    {[
                                        'Create a free account',
                                        'Add your website URL',
                                        'Get alerted when it goes down',
                                    ].map((step, i) => (
                                        <li
                                            key={step}
                                            className="flex items-center gap-3 text-sm"
                                        >
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                                {i + 1}
                                            </span>
                                            <span className="text-gray-700 dark:text-gray-300">
                                                {step}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            {/* WordPress */}
                            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-8 shadow-sm dark:bg-primary/5">
                                <div className="mb-5 inline-flex rounded-xl bg-primary/15 p-3 text-primary">
                                    <PlugZap className="h-6 w-6" />
                                </div>
                                <div className="mb-1 flex items-center gap-2">
                                    <span className="text-xs font-semibold tracking-widest text-primary uppercase">
                                        WordPress
                                    </span>
                                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                                        Full audit
                                    </span>
                                </div>
                                <h3 className="mb-3 text-xl font-bold">
                                    Monitoring + deep audit
                                </h3>
                                <p className="mb-6 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                                    Install the free WordPress plugin, connect
                                    it to your account, and unlock full site
                                    health reports alongside uptime monitoring.
                                </p>
                                <ol className="space-y-3">
                                    {[
                                        'Create a free account',
                                        'Install the SitePulse plugin on WordPress',
                                        'Connect it to your dashboard',
                                        'Uptime + audit reports start automatically',
                                    ].map((step, i) => (
                                        <li
                                            key={step}
                                            className="flex items-center gap-3 text-sm"
                                        >
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                                                {i + 1}
                                            </span>
                                            <span className="text-gray-700 dark:text-gray-300">
                                                {step}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    </div>
                </section>

                {/* WordPress features */}
                <section className="bg-gray-50 px-6 py-24 dark:bg-gray-900/50">
                    <div className="mx-auto max-w-6xl">
                        <div className="mb-4 text-center text-xs font-semibold tracking-widest text-primary uppercase">
                            WordPress plugin features
                        </div>
                        <div className="mb-16 text-center">
                            <h2 className="text-3xl font-bold tracking-tight lg:text-4xl">
                                Everything your WordPress site needs
                            </h2>
                            <p className="mt-4 text-gray-500 dark:text-gray-400">
                                One plugin. One dashboard. Complete visibility.
                            </p>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {[
                                {
                                    icon: <Zap className="h-5 w-5" />,
                                    title: 'Uptime Monitoring',
                                    desc: 'Heartbeat checks every 1–5 minutes. Checks are made through 100+ rotating proxy IPs to eliminate false downtime alerts caused by network issues.',
                                    color: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/40 dark:text-yellow-400',
                                },
                                {
                                    icon: <Bell className="h-5 w-5" />,
                                    title: 'Instant Alerts',
                                    desc: 'Notified via email, Slack, Discord, or webhooks when a site goes down — and again when it comes back up.',
                                    color: 'text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-400',
                                },
                                {
                                    icon: <PlugZap className="h-5 w-5" />,
                                    title: 'Plugin & Theme Audits',
                                    desc: 'Scans for outdated, vulnerable, or inactive plugins and themes. Know your risk before attackers do.',
                                    color: 'text-primary bg-primary/10',
                                },
                                {
                                    icon: <ShieldCheck className="h-5 w-5" />,
                                    title: 'SSL & Security',
                                    desc: 'Tracks SSL certificate expiry, validates HTTPS, and surfaces misconfigurations before they become problems.',
                                    color: 'text-green-600 bg-green-50 dark:bg-green-950/40 dark:text-green-400',
                                },
                                {
                                    icon: <Activity className="h-5 w-5" />,
                                    title: 'PHP Error Tracking',
                                    desc: 'Detects PHP fatal and parse errors in heartbeat responses. Catch broken deployments before your users do.',
                                    color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-400',
                                },
                                {
                                    icon: <Globe className="h-5 w-5" />,
                                    title: 'DB & Server Health',
                                    desc: 'Reports database size, PHP version, WordPress cron status, debug mode, and server environment details.',
                                    color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-400',
                                },
                            ].map((f) => (
                                <div
                                    key={f.title}
                                    className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                                >
                                    <div
                                        className={`mb-4 inline-flex rounded-xl p-2.5 ${f.color}`}
                                    >
                                        {f.icon}
                                    </div>
                                    <h3 className="mb-2 text-base font-semibold">
                                        {f.title}
                                    </h3>
                                    <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                                        {f.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="px-6 py-24 text-center">
                    <div className="mx-auto max-w-2xl">
                        <h2 className="mb-4 flex flex-col text-3xl font-bold tracking-tight lg:text-4xl">
                            <span>Your sites deserve better than</span>
                            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                                Finding out late
                            </span>
                        </h2>
                        <p className="mb-8 text-gray-500 dark:text-gray-400">
                            Monitor up to 3 sites for free. No credit card
                            required.
                        </p>
                        {canRegister ? (
                            <Link
                                href={register()}
                                className="inline-block rounded-xl bg-primary px-10 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
                            >
                                Create your free account →
                            </Link>
                        ) : (
                            <Link
                                href={login()}
                                className="inline-block rounded-xl bg-primary px-10 py-4 text-base font-semibold text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
                            >
                                Log in to your account →
                            </Link>
                        )}
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-gray-100 px-6 py-8 dark:border-gray-800">
                    <div className="mx-auto flex items-center justify-between text-sm text-gray-400">
                        <div className="flex items-center overflow-hidden">
                            <AppLogo size={10} />
                        </div>
                        <p>Uptime monitoring &amp; WordPress audit</p>
                    </div>
                </footer>
            </div>
        </>
    );
}

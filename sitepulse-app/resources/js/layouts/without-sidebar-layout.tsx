import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import type { AppLayoutProps } from '@/types';
import { Link } from '@inertiajs/react';
import { home } from '@/routes';
import AppLogoIcon from '@/components/app-logo-icon';

export default function WithoutSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {

    return (
        <AppShell variant="sidebar">
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <div className='flex justify-center items-center py-4'>
                    <Link
                        href={home()}
                        className="flex items-center gap-2 font-medium"
                    >
                        <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-md">
                            <AppLogoIcon className="size-9 fill-current text-[var(--foreground)] dark:text-white" />
                        </div>
                        <span>Site Pulse</span>
                    </Link>
                </div>
                {children}
            </AppContent>
        </AppShell>

    );
}

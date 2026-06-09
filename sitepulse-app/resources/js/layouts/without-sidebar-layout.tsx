import { AppContent } from '@/components/app-content';
import AppLogoIcon from '@/components/app-logo-icon';
import { AppShell } from '@/components/app-shell';
import type { AppLayoutProps } from '@/types';

export default function WithoutSidebarLayout({ children }: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppContent variant="sidebar" className="overflow-x-hidden">
                <div className="mt-6 flex items-center justify-center gap-2 py-4">
                    <div className="mb-1 flex h-10 w-14 items-center justify-center rounded-md">
                        <AppLogoIcon className="size-9 fill-current text-[var(--foreground)] dark:text-white" />
                    </div>
                    <span className="text-lg font-bold">SitePulse</span>
                </div>
                {children}
            </AppContent>
        </AppShell>
    );
}

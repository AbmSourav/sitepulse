import { Link } from '@inertiajs/react';
import {
    LayoutGrid,
    Globe,
    ClipboardList,
    AlertTriangle,
    Users,
    Bell,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as auditReportsIndex } from '@/routes/audit-reports';
import { index as incidentsIndex } from '@/routes/incidents';
import { index as notificationsIndex } from '@/routes/notifications';
import { index as teamsIndex } from '@/routes/teams';
import { index as websitesIndex } from '@/routes/websites';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard(),
            icon: LayoutGrid,
        },
        {
            title: 'Websites',
            href: websitesIndex(),
            icon: Globe,
        },
        {
            title: 'Audit Reports',
            href: auditReportsIndex(),
            icon: ClipboardList,
        },
        {
            title: 'Incidents',
            href: incidentsIndex(),
            icon: AlertTriangle,
        },
    ];

    const accountNavItems: NavItem[] = [
        {
            title: 'Teams',
            href: teamsIndex(),
            icon: Users,
        },
        {
            title: 'Notifications',
            href: notificationsIndex(),
            icon: Bell,
        },
    ];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <div className="flex items-center">
                                    <AppLogo size={8} />
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
                <NavMain items={accountNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}

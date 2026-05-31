import type { Auth } from '@/types/auth';
import type { Team } from '@/types/teams';

export type PlanLimits = {
    maxSites: number;
    minInterval: number;
    maxTeams: number;
    notificationChannels: string[];
};

export type PlanInfo = {
    value: 'free' | 'pro' | 'enterprise';
    label: string;
    limits: PlanLimits;
};

export interface Website {
    id: number;
    team_id: number;
    url: string;
    api_key: string;
    status: string;
    created_at: string;
    updated_at: string;
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            currentTeam: Team | null;
            teams: Team[];
            currentPlan: PlanInfo | null;
            siteUrl: string | null;
            websites: Website[];
            [key: string]: unknown;
        };
    }
}

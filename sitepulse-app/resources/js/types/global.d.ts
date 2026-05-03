import type { Auth } from '@/types/auth';
import type { Team } from '@/types/teams';

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
            siteUrl: string | null;
            websites: Website[];
            [key: string]: unknown;
        };
    }
}

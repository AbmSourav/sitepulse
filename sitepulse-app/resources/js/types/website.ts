export interface Website {
    id: number;
    team_id: number;
    url: string;
    api_key: string;
    status: 'connected' | 'disconnected';
    uptime_status: 'up' | 'down' | 'unknown';
    last_audited_at: string | null;
    next_audit_at: string | null;
    next_check_at: string | null;
    consecutive_failures: number;
    created_at: string;
    updated_at: string;
}

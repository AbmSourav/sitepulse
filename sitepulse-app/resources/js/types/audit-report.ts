export interface AuditReportHealth {
    cron_status?: 'enabled' | 'disabled' | 'unknown';
    admin_email?: string;
    locale?: string;
    https_status?: Record<string, string>;
    scheduled_events?: Record<string, string>;
    background_updates?: Record<string, string>;
    loopback_requests?: Record<string, string>;
    rest_availability?: Record<string, string>;
    debug_mode?: Record<string, string>;
    file_uploads?: Record<string, string>;
}

export interface AuditReportServer {
    wp_version?: { version?: string; [key: string]: string | undefined };
    php_version?: { version?: string; [key: string]: string | undefined };
    sql_server?: { version?: string; [key: string]: string | undefined };
    php_extensions?: Record<string, string>;
    db_size_bytes?: number;
    php_errors?: { status?: number; message?: string; file?: string; } | null;
}

export interface AuditReportSecurity {
    ssl_valid?: boolean;
    ssl_expires_at?: string | null;
}

export interface AuditReportPlugin {
    name: string;
    installed_version: string;
    latest_version: string;
    is_active: boolean;
    require_update: boolean;
    has_vulnerability?: boolean;
}

export interface AuditReportTheme {
    name: string;
    installed_version: string;
    latest_version: string;
    is_active: boolean;
    require_update: boolean;
}

export interface AuditReport {
    id: number;
    website_id: number;
    audited_at: string;
    health: AuditReportHealth | null;
    server: AuditReportServer | null;
    security: AuditReportSecurity | null;
    plugins: {
        total: number;
        outdated: number;
        items: AuditReportPlugin[];
    } | null;
    themes: {
        total: number;
        outdated: number;
        items: AuditReportTheme[];
    } | null;
    created_at: string;
    updated_at: string;
}

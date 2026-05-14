# SitePulse

WordPress Site Auditor SaaS with uptime monitoring. A WordPress plugin reports health metrics (plugins, DB size, PHP errors, SSL status); the Laravel app stores audit history, monitors uptime via scheduled heartbeat checks, and renders reports with recommendations. Alerts are sent via email and Slack/Discord webhooks for critical issues (plugin vulnerabilities, SSL expiry, site down).

## Monorepo Layout

```
sitepulse/
├── sitepulse-app/          # Laravel 13 app — backend API + React/Inertia frontend
└── sitepulse-wp/           # WordPress Docker dev environment
    ├── sitepulse-monitor/  # WP plugin source — tracked in git
    └── wordpress/          # Full WP install — NOT tracked in git
        └── wp-content/plugins/sitepulse-monitor/   # Symlink or copy for local dev
```

`sitepulse-wp/sitepulse-monitor/` is the canonical plugin source. The `sitepulse-wp/wordpress/` directory is gitignored — only the plugin folder at `sitepulse-wp/sitepulse-monitor/` is tracked.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Laravel 13, PHP 8.5 |
| Frontend | React 19, TypeScript, Inertia.js v3, Tailwind CSS v4 |
| UI components | Radix UI, shadcn/ui pattern |
| Auth | Laravel Fortify (2FA, email verification) |
| Database | MySQL 8.0 |
| Queue | Database driver |
| Web server | Caddy 2 |
| Runtime | PHP-FPM 8.5 (Docker) |
| WP runtime | PHP 8.1, Nginx, MySQL (Docker) |

---

## Laravel App (`sitepulse-app/`)

App URL: `http://sitepulse-app.test:6080/` (or `http://localhost:6080/`)

`dc` is aliased to `docker compose` in this project.

```bash
# Start
dc up -d --build

# Stop
dc down

# Run artisan
dc exec php php artisan <command>

# Run migrations
dc exec php php artisan migrate

# Tail logs
dc exec php php artisan pail

# Open tinker
dc exec php php artisan tinker

# Run tests
dc exec php php artisan test

# Frontend dev (runs inside container via composer dev)
dc exec php composer dev
```

### Docker Services

| Service | Container | Port |
|---|---|---|
| PHP-FPM | `sitepulse-php` | 9000 (internal) |
| Caddy | `sitepulse-caddy` | `APP_PORT` (default 6080) |
| MySQL | `sitepulse-mysql` | `DB_PORT` (default 3306) |

Dockerfile base: `php:8.5-fpm` (Debian). Extensions: `pdo_mysql`, `mbstring`, `exif`, `pcntl`, `bcmath`, `gd`, `zip`, `opcache`, `xdebug`.

Database files persist in `sitepulse-app/db/`. Caddy config at `docker-configs/caddy/Caddyfile`.

---

## WordPress Dev Environment (`sitepulse-wp/`)

WordPress site URL: `http://sitepulse-wp.test:4103/` (or `http://localhost:4103/`)

All commands run from `sitepulse-wp/`:

```bash
# Start
dc up -d --build

# Stop
dc down

# Run WP-CLI
dc exec php wp <command>
```

### Docker Services

| Service | Container | Port |
|---|---|---|
| Nginx | `sitepulse-wp_web` | 4103 |
| PHP-FPM | `sitepulse-wp_php` | internal |
| MySQL | `sitepulse-wp_mysql` | 5299 |
| phpMyAdmin | `sitepulse-wp_phpmyadmin` | 6095 |

Database: `wp` / user: `wp` / password: `secret`

### Plugin

Plugin source: `sitepulse-wp/sitepulse-monitor/` (tracked in git)

Plugin entry point: `sitepulse-wp/sitepulse-monitor/sitepulse.php`

For local dev, the plugin is also present at `sitepulse-wp/wordpress/wp-content/plugins/sitepulse-monitor/` (inside the gitignored WP install). After working on the WP install copy, sync it back to the tracked source with the repo-root `setup` script:

```bash
./setup sync-plugin
```

This deletes everything in `sitepulse-wp/sitepulse-monitor/` and rsyncs from the WP install (excluding `node_modules`, `vendor`, `resources/build`, `prod`).

The plugin talks to the Laravel app at `http://sitepulse-app.test:6080` (and the Laravel app pings the WP plugin at `http://sitepulse-wp.test:4103`). Cross-container DNS resolution is set up via `extra_hosts: <name>:host-gateway` in each `docker-compose.yml`.

**Plugin → Laravel** (audit + connect/disconnect):
- `POST /api/v1/sites/audit` — push audit report
- `POST /api/v1/websites/disconnect` — flag the site as disconnected
- `POST /api/v1/websites/reconnect` — flag the site as connected again

The `api_key` is sent in the **request body** (not URL — avoids leaking in logs/referrer headers). Keys are stored in the `websites` table of the Laravel app and in the `spm_app` WP option (read via `Sitepulse\SitepulseMonitor\Lib\AppData`).

**Laravel → Plugin** (uptime heartbeat):
- `GET /index.php?rest_route=/sitepulse-monitor/v1/heartbeat` — returns `{ok: true, plugin: <version>, time: ...}`
- Auth via `X-SPM-API-Key` header. Uses `index.php?rest_route=` form so it works regardless of WP permalink settings.

---

## Architecture

### Backend (Laravel)

```
app/
├── Actions/          # Single-purpose action classes
├── Console/
│   └── Commands/
│       └── CheckDueSites.php       # Dispatches heartbeat jobs for sites due for check
├── Http/
│   ├── Controllers/
│   │   ├── Api/                    # AuditController, SiteController (connect/disconnect)
│   │   ├── Settings/               # Profile, Security
│   │   └── Teams/                  # Team CRUD, members, invitations
│   └── Middleware/
│       ├── AuthenticateApiRequest.php  # api_key + domain validation for plugin → Laravel
│       └── EnsureTeamMembership.php
├── Jobs/
│   └── CheckSiteHeartbeat.php      # GETs /heartbeat on one site, updates uptime state
├── Models/
│   ├── User.php          # Has 2FA, belongs to teams
│   ├── Team.php          # Slug-routed, soft-deletes
│   ├── Website.php       # WP site registered by a team — also holds uptime state
│   ├── AuditReport.php   # Immutable audit snapshot (5 JSON columns)
│   ├── SiteIncident.php  # Outage record (one row per outage, not per check)
│   ├── Membership.php
│   └── TeamInvitation.php
└── Enums/
    ├── TeamRole.php
    ├── TeamPermission.php
    └── UptimeStatus.php       # 'up' | 'down' | 'unknown'
```

Routes:
- `routes/web.php` — main web routes, dashboard under `/{team_slug}/dashboard`
- `routes/settings.php` — profile, security, appearance, team management
- `routes/api.php` — plugin endpoints under `/api/v1/...`
- `routes/console.php` — schedules `sites:check-due` every minute

### Plugin → Laravel API (`/api/v1`)

All endpoints use `AuthenticateApiRequest` middleware: reads `api_key` from request body, looks up the `Website`, validates `Origin`/`Referer` host matches `website.url`, binds the resolved `Website` to `$request->attributes`. Status filter is `connected` (not `active`) — see "Website status values" below.

| Route | Purpose |
|---|---|
| `POST /api/v1/sites/audit` | Plugin pushes audit report |
| `POST /api/v1/websites/disconnect` | Plugin signals user disconnected the site |
| `POST /api/v1/websites/reconnect` | Plugin signals user reconnected the site |

`AuditReport` stores data in 5 nullable JSON columns: `health`, `server`, `security`, `plugins`, `themes`. Reports are immutable — `updating` events are blocked in `boot()`.

### Uptime monitoring pipeline

Three pieces working together:

1. **Scheduler** (`routes/console.php`) — runs `sites:check-due` every minute. Triggered by either system cron calling `php artisan schedule:run`, or by `php artisan schedule:work` running long-lived in dev.
2. **Command** (`app/Console/Commands/CheckDueSites.php`) — picks sites where `status = 'connected'` AND (`next_check_at IS NULL` OR `next_check_at <= now()`). Dispatches one `CheckSiteHeartbeat` job per due site.
3. **Job** (`app/Jobs/CheckSiteHeartbeat.php`) — hits `GET <origin>/index.php?rest_route=/sitepulse-monitor/v1/heartbeat` with `X-SPM-API-Key` header. Classifies response, updates state, writes `next_check_at = now() + 5min`.

Cadence is hardcoded at 5 min for now. Paid plans will make it per-site (see `sitepulse-app/plan.md` "Future: Paid Plans").

Job behavior:
- Success (`2xx + ok=true`) → `consecutive_failures = 0`, `uptime_status = 'up'`, close any open `SiteIncident`.
- Failure (timeout / 5xx / non-2xx / `ok != true` / body contains PHP-error signature) → increment `consecutive_failures`. **Two-strike rule**: only flip to `down` and create a `SiteIncident` after `consecutive_failures >= 2`. Catches recovery-mode pages where WP returns 200 + critical-error HTML — the job scans the body for `Fatal error:`, `Parse error:`, `There has been a critical error...` etc.

Incidents are written **only on state transitions** — healthy site = 0 rows; outage = 1 row. No per-check ledger.

### Website status values

Be careful with two different status fields on `websites`:

- `status` — connection state: `'connected'` | `'disconnected'`. Set by the plugin via the connect/disconnect API. Filtered in `CheckDueSites` (`where('status', 'connected')`).
- `uptime_status` — health from monitoring: `'up'` | `'down'` | `'unknown'` (default). Updated by `CheckSiteHeartbeat`. See `App\Enums\UptimeStatus`.

### Cross-container Docker networking

Both `docker-compose.yml` files use `extra_hosts: <name>:host-gateway` so containers can reach each other by hostname:

- WP container → Laravel: `http://sitepulse-app.test:6080`
- Laravel container → WP: `http://sitepulse-wp.test:4103`

If you add a new container that needs to talk to either side, replicate this pattern.

### Frontend (React + Inertia)

```
resources/js/
├── app.tsx           # Inertia entry point — layout resolver
├── pages/            # One file per route
├── components/       # Shared components (ui/ = base, root = app-specific)
├── layouts/          # AppLayout (sidebar), AuthLayout, SettingsLayout
├── hooks/            # Custom hooks
├── actions/          # TS mirrors of Laravel controllers (auto-generated by Wayfinder)
├── routes/           # Type-safe route helpers (auto-generated by Wayfinder)
└── types/            # Shared TypeScript types
```

Layout resolution (`app.tsx`):
- `welcome` → no layout
- `auth/*` → `AuthLayout`
- `settings/*`, `teams/*` → `AppLayout` + `SettingsLayout`
- everything else → `AppLayout` (includes sidebar)

### Multi-Tenancy (Teams)

- Every user has a personal team created on registration
- URLs are **not** team-prefixed — authorization is handled per-controller via `authorizeTeam(int $teamId)` in `WebsiteController` (checks `$user->team_id` matches the resource's `team_id`)
- Roles: `Owner`, `Member`, `Guest` (via `TeamRole` enum)

### WordPress Plugin (`sitepulse-monitor`)

```
sitepulse-wp/sitepulse-monitor/
├── sitepulse.php       # Plugin entry — registers Core
├── src/
│   ├── Core.php        # Bootstraps services
│   ├── Lib/
│   │   ├── AppData.php     # get/set wrapper around the spm_app option
│   │   ├── BaseService.php # Service interface (`register()`)
│   │   ├── Http.php        # wp_remote_request wrapper, base URL = SPM_APP_URL
│   │   └── Response.php    # Response wrapper
│   └── Services/
│       ├── AdminMenu.php       # WP admin menu page
│       ├── AssetsManager.php   # Enqueue admin React bundle
│       ├── AuditReport.php     # Collects + sends audit data, handles connect handshake
│       └── RestApi.php         # /heartbeat (public via api_key) + /disconnect, /reconnect (admin-only)
└── resources/                  # React admin UI sources
```

Each `Services/*` class implements `BaseService::register()` and is registered in `Core::services()`. The Core constructor instantiates each and calls `register()` — this is where `add_action`/`add_filter` hooks go.

Plugin REST routes (registered in `RestApi.php`):
- `GET /sitepulse-monitor/v1/heartbeat` — auth: `X-SPM-API-Key` header (matched against stored api_key)
- `POST /sitepulse-monitor/v1/disconnect` — auth: `current_user_can('manage_options')`
- `POST /sitepulse-monitor/v1/reconnect` — auth: `current_user_can('manage_options')`

Plugin state (api_key, connection status) is stored in the `spm_app` WP option as JSON. Read/write via `AppData::get('api_key')` / `AppData::set($value, 'api_key')`.

---

## Key Patterns

### Adding a new page

1. Create `app/Http/Controllers/MyController.php`
2. Add route in `routes/web.php` (or `routes/settings.php`)
3. Run `php artisan wayfinder:generate` to update TS route helpers
4. Create `resources/js/pages/my-page.tsx`
5. To add the page to the sidebar, add a nav item to `mainNavItems` in `resources/js/components/app-sidebar.tsx`:

```tsx
import { index as myPageIndex } from '@/routes/my-page';   // generated by Wayfinder
import { MyIcon } from 'lucide-react';                       // any lucide icon

// inside mainNavItems:
{ title: 'My Page', href: myPageIndex(), icon: MyIcon },
```

### Running Wayfinder (route/action type generation)

```bash
dc exec php php artisan wayfinder:generate
```

Regenerates `resources/js/actions/` and `resources/js/routes/` from Laravel routes. Note: `.form()` helpers are only generated during Vite watch/build (`composer dev`), not by this command. Use `.url()` for string route output.

### Adding a background job

1. `php artisan make:job MyJob`
2. Dispatch via `MyJob::dispatch()` or schedule in `routes/console.php`
3. Queue runs via `php artisan queue:work` (started by `composer dev`)

### Running the uptime monitor locally

Two long-lived processes are needed:

```bash
# Terminal 1 — fires due heartbeat checks every minute
dc exec php php artisan schedule:work

# Terminal 2 — processes the dispatched jobs
dc exec php php artisan queue:work
```

To force a site to be checked immediately (skip waiting for `next_check_at`):

```bash
dc exec php php artisan tinker --execute="App\Models\Website::find(1)->update(['next_check_at' => now()->subMinute()]);"
```

To run once without waiting on the scheduler:

```bash
dc exec php php artisan sites:check-due
dc exec php php artisan queue:work --stop-when-empty
```

---

## Testing

```bash
# Run all tests
dc exec php php artisan test

# Run specific file
dc exec php php artisan test tests/Feature/MyTest.php

# With coverage
dc exec php php artisan test --coverage
```

Tests live in `tests/Feature/` and `tests/Unit/`. Uses PestPHP.

---

## Code Style

```bash
# PHP linting (Laravel Pint)
dc exec php ./vendor/bin/pint

# JS/TS linting
dc exec php npm run lint

# TS type check
dc exec php npm run types:check

# Format frontend
dc exec php npm run format
```

---

## Environment Variables (key ones — Laravel app)

```
APP_URL=http://localhost:8000
DB_HOST=mysql
DB_DATABASE=sitepulse
QUEUE_CONNECTION=database
MAIL_MAILER=log
SESSION_DRIVER=database
```

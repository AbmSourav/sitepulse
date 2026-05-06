# SitePulse

WordPress Site Auditor SaaS. A WordPress plugin reports health metrics (plugins, DB size, PHP errors, SSL status), the Laravel app stores audit history and renders reports with recommendations. Alerts are sent via email and Slack/Discord webhooks for critical issues (plugin vulnerabilities, SSL expiry, site down).

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

For local dev, the plugin is also present at `sitepulse-wp/wordpress/wp-content/plugins/sitepulse-monitor/` (inside the gitignored WP install). Keep both in sync or set up a symlink.

The plugin POSTs audit data to the Laravel app's REST API endpoint:
```
POST http://host.docker.internal:6080/api/sites/audit
```
(`host.docker.internal` resolves to the host machine from inside Docker, allowing the WP container to reach the Laravel container.)

The `api_key` must be sent in the request body (not the URL). Keys are stored in the `websites` table of the Laravel app.

---

## Architecture

### Backend (Laravel)

```
app/
├── Actions/          # Single-purpose action classes
├── Http/
│   ├── Controllers/
│   │   ├── Api/        # AuditController — WP plugin API
│   │   ├── Settings/   # Profile, Security
│   │   └── Teams/      # Team CRUD, members, invitations
│   └── Middleware/
│       └── AuthenticateAuditRequest.php  # api_key + domain validation
├── Models/
│   ├── User.php          # Has 2FA, belongs to teams
│   ├── Team.php          # Slug-routed, soft-deletes
│   ├── Website.php       # WP site registered by a team
│   ├── AuditReport.php   # Immutable audit snapshot (5 JSON columns)
│   ├── Membership.php    # Pivot: team_members table
│   └── TeamInvitation.php
└── Enums/
    └── TeamRole.php
```

Routes:
- `routes/web.php` — main web routes, dashboard under `/{team_slug}/dashboard`
- `routes/settings.php` — profile, security, appearance, team management
- `routes/api.php` — `POST /api/sites/audit` (WP plugin endpoint)
- `routes/console.php` — Artisan scheduled commands

### Audit API

`POST /api/sites/audit` — authenticated by `api_key` in request body.

`AuthenticateAuditRequest` middleware:
1. Reads `api_key` from request body
2. Looks up `Website` — 401 if not found
3. Checks `status === 'active'` — 403 if disabled
4. Validates request `Origin`/`Referer` domain matches `website.url` — 403 on mismatch
5. Binds `Website` to `$request->attributes` for the controller

`AuditReport` stores data in 5 nullable JSON columns: `health`, `server`, `security`, `plugins`, `themes`. Reports are immutable — `updating` events are blocked in `boot()`.

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
- URLs are prefixed with `{current_team}` slug: `/{team-slug}/dashboard`
- `EnsureTeamMembership` middleware protects team-scoped routes
- Roles: `Owner`, `Member`, `Guest` (via `TeamRole` enum)

---

## Key Patterns

### Adding a new page

1. Create `app/Http/Controllers/MyController.php`
2. Add route in `routes/web.php` (or `routes/settings.php`)
3. Run `php artisan wayfinder:generate` to update TS route helpers
4. Create `resources/js/pages/my-page.tsx`

### Running Wayfinder (route/action type generation)

```bash
dc exec php php artisan wayfinder:generate
```

Regenerates `resources/js/actions/` and `resources/js/routes/` from Laravel routes. Note: `.form()` helpers are only generated during Vite watch/build (`composer dev`), not by this command. Use `.url()` for string route output.

### Adding a background job

1. `php artisan make:job MyJob`
2. Dispatch via `MyJob::dispatch()` or schedule in `routes/console.php`
3. Queue runs via `php artisan queue:work` (started by `composer dev`)

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

# Site Pulse

SitePulse is a SaaS platform that gives website site owners a single place to monitor the health and availability of their websites. 
A lightweight WordPress plugin continuously reports key site metrics — plugin vulnerabilities, SSL certificate status, database size, and PHP errors — back to the SitePulse dashboard, where all audit history is stored and actionable recommendations are surfaced. In parallel, SitePulse runs automated uptime checks every few minutes and immediately alerts the team via email, Slack, or Discord the moment a site goes down — and again when it recovers. The result is full visibility into both the real-time availability and long-term health of every WordPress site a team manages, without any manual checking.

<br>

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

<br>

## SaaS Stack

[![PHP](https://img.shields.io/badge/PHP-8.5-777BB4?logo=php&logoColor=white)]()
[![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel&logoColor=white)]()
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white)]()
[![Caddy](https://img.shields.io/badge/Caddy-2-1F88C0?logo=caddy&logoColor=white)]()
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)]()

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)]()
[![Inertia.js](https://img.shields.io/badge/Inertia.js-v3-9553E9?logo=inertia&logoColor=white)]()
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)]()

<br>

## Downtime Monitoring

SitePulse monitors connected websites by running periodic heartbeat checks through Laravel's scheduler and queue system. Here's how the full pipeline works:

### 1. Scheduler — `sites:check-due` (every 15 seconds)

`routes/console.php` schedules the `sites:check-due` artisan command to run every 15 seconds via `php artisan schedule:work`, on production it'll use Supervisor. The command queries all websites where `status = 'connected'` and `next_check_at` is past due (or null), then dispatches one `CheckSiteHeartbeat` job per site into the queue.

```
Scheduler (every 15s)
  └── CheckDueSites command
        └── dispatches CheckSiteHeartbeat job per due site
```

### 2. Queue Job — `CheckSiteHeartbeat`

The job runs via `php artisan queue:work`. For each website it:

- **WordPress sites** (have an `api_key`): Laravel app sends a GET request to WordPress site's `/index.php?rest_route=/sitepulse-monitor/v1/heartbeat` rest api with an `X-SPM-API-Key` header and expects `{ ok: true }` in the response body. Also scans the body for PHP fatal error signatures.
- **Plain sites** (no `api_key`): sends a GET to the site root URL and considers any 2xx response as up.

After each check, `next_check_at` is updated based on the result:

| State | Next check interval |
|---|---|
| Up | 4 minutes |
| 1st failure | 2 minutes (confirm it's really down) |
| 2nd+ failure | 9 minutes |
| 6+ consecutive failures | 19 minutes |

**State transitions:**
- On the **1st failure**: `uptime_status` flips to `down`, a `SiteIncident` row is created.
- On the **2nd failure** (confirmed down): `SendIncidentNotification` is dispatched with event `'down'`.
- On **recovery** (next successful check): the open incident is resolved, `SendIncidentNotification` dispatched with event `'up'`.

Incidents are written only on transitions — a healthy site has zero incident rows.

### 3. Notification Job — `SendIncidentNotification`

Dispatched on down/up transitions. Loads all active `NotificationChannel` rows for the site's team and fires each one:

| Channel type | Delivery |
|---|---|
| **Email** | Laravel `Mail::send()` using the `emails.incident-notification` Blade template |
| **Slack** | POST to the configured incoming webhook URL |
| **Discord** | POST to the configured incoming webhook URL |
| **Webhook** | POST JSON payload; optional HMAC-SHA256 signature via `X-SPM-Signature` header |

The email always fires as a fallback — if no email channel is configured for the team, it falls back to the website owner's account email.

<br>

## WordPress Stack

[![PHP](https://img.shields.io/badge/PHP-8.1-777BB4?logo=php&logoColor=white)]()
[![WordPress](https://img.shields.io/badge/WordPress-6.x-21759B?logo=wordpress&logoColor=white)]()
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white)]()
[![Nginx](https://img.shields.io/badge/Nginx-latest-009639?logo=nginx&logoColor=white)]()
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)]()

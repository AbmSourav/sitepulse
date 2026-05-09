# Plan: SitePulse — Audit Pipeline + Uptime Monitoring

## Context

SitePulse is a multi-tenant SaaS where WordPress sites send health metrics to a central Laravel app. Currently the `websites` table exists with `url`, `api_key`, and `status` — but there is no storage for audit data, no API endpoint, and no WP plugin authorization flow. This plan builds all three.

---

## Architecture Decision Summary

- **Categorized JSON columns**: `audit_reports` uses 5 JSON columns (`health`, `server`, `security`, `plugins`, `themes`) instead of many scalar columns. New fields can be added to any category without a migration.
- **Plugin pushes on schedule**: The WP plugin runs a daily WP-Cron job that POSTs audit data to Laravel. Works for any publicly reachable WP site.
- **Direct storage**: Controller validates the payload and writes directly to `audit_reports`. No staging table, no queue.
- **Authentication**: Custom middleware reads `api_key` from the request body (not the URL — avoids leaking in logs/referrer headers). Also validates that the request's `Origin`/`Referer` domain matches the website's registered URL. No Sanctum — there is no user session.
- **Immutability**: `AuditReport::boot()` blocks `updating` events — reports are write-once snapshots.

---

## Flow 1 — Authorization (one-time setup per WP site)

```
WP Admin                    Laravel App                      WP Admin
─────────────────────────────────────────────────────────────────────
1. User clicks "Connect to SitePulse" button
   → opens: {laravel}/websites/authorize?siteUrl={wpSiteUrl}

2.                      Show team selector UI
                        User picks a team, submits

3.                     WebsiteController@store
                        - validates siteUrl + teamId
                        - creates Website record
                        - generates api_key
                        - redirects to:
                            {wpSiteUrl}/wp-admin/admin.php
                            ?page=sitepulse
                            &api_key={api_key}
                            &status=connected

4.                                                 WP plugin reads
                                                   api_key from URL,
                                                   saves to wp_options,
                                                   shows "Connected" UI
```

**Changes to `WebsiteController@store`:**
- After creating the `Website`, redirect to `{siteUrl}/wp-admin/admin.php?page=sitepulse&api_key={api_key}&status=connected`
- Currently returns `Inertia::location($data['siteUrl'])` — replace this with `redirect()->away(...)`

---

## Flow 2 — Audit data push (recurring, WP-Cron daily)

```
WP Plugin (daily cron)              Laravel App
────────────────────────────────────────────────────────
1. Collect audit data from WP APIs
   POST /api/sites/audit
   Content-Type: application/json
   { "api_key": "...", ...audit payload... }

2.                                  AuthenticateAuditRequest middleware
                                    - read api_key from request body → 401 if missing
                                    - lookup Website by api_key → 401 if not found
                                    - check status === 'active' → 403 if disabled
                                    - validate Origin/Referer domain matches website.url → 403 if mismatch
                                    - bind Website to request

3.                                  AuditController@store
                                    - validate payload, including nested array items
                                    - build 5 category arrays
                                    - AuditReport::create(...)
                                    - return 201 {"message":"Audit stored.","report_id":1}

4. Plugin receives 201 → logs success
```

---

## New Files

| File | Purpose |
|---|---|
| `database/migrations/2026_05_03_000001_create_audit_reports_table.php` | Audit snapshot table |
| `app/Data/AuditPayload.php` | Readonly DTO — typed view of WP plugin POST body |
| `app/Models/AuditReport.php` | Eloquent model for audit snapshots |
| `app/Http/Middleware/AuthenticateAuditRequest.php` | api_key auth middleware |
| `app/Http/Controllers/Api/AuditController.php` | POST handler — validates + stores directly |
| `routes/api.php` | API route definitions |

## Modified Files

| File | Change |
|---|---|
| `bootstrap/app.php` | Add `api: __DIR__.'/../routes/api.php'` to `withRouting()` |
| `app/Models/Website.php` | Add `auditReports()`, `latestAudit()` relations |
| `app/Http/Controllers/WebsiteController.php` | `store()` — replace `Inertia::location()` with redirect back to WP admin with `api_key` |

---

## Migration Schema

### `audit_reports`

```php
$table->id();
$table->foreignId('website_id')->constrained()->cascadeOnDelete();
$table->timestamp('audited_at');   // WP plugin's reported time

$table->json('health');     // status, wp/php/mysql versions, cron, debug mode, admin email, locale
$table->json('server');     // db_size_bytes, php_error_count, php_errors sample
$table->json('security');   // ssl_valid, ssl_expires_at, vulnerable_plugins_count
$table->json('plugins');    // total, outdated, vulnerable counts + full items list
$table->json('themes');     // total, outdated counts + active theme + full items list

$table->timestamps();

$table->index(['website_id', 'audited_at'], 'idx_audit_website_time');
$table->index('audited_at', 'idx_audit_time');
```

#### JSON shape per category

```json
// health
{
  "status": "up",
  "wp_version": "6.5.0",
  "php_version": "8.2.0",
  "mysql_version": "8.0.36",
  "debug_mode": false,
  "cron_status": "enabled",
  "admin_email": "admin@example.com",
  "locale": "en_US"
}

// server
{
  "db_size_bytes": 52428800,
  "php_error_count": 3,
  "php_errors": [{ "type": "E_WARNING", "message": "...", "file": "...", "line": 42 }]
}

// security
{
  "ssl_valid": true,
  "ssl_expires_at": "2026-08-01",
  "vulnerable_plugins_count": 1
}

// plugins
{
  "total": 12,
  "outdated": 3,
  "vulnerable": 1,
  "items": [{ "name": "WooCommerce", "version": "8.0.0", "latest_version": "8.1.0", "is_active": true, "has_vulnerability": false }]
}

// themes
{
  "total": 3,
  "outdated": 1,
  "active": { "name": "Astra", "version": "4.0.0", "latest_version": "4.0.0" },
  "items": [{ "name": "Astra", "version": "4.0.0", "latest_version": "4.0.0", "is_active": true }]
}
```

---

## Key Implementation Details

### `WebsiteController@store` — redirect change

```php
// After Website::create(...)
return redirect()->away(
    $data['siteUrl'] . '/wp-admin/admin.php?page=sitepulse&api_key=' . $website->api_key . '&status=connected'
);
```

### `AuditReport` model — immutability guard

```php
protected static function boot(): void
{
    parent::boot();
    static::updating(fn () => false);
}
```

### `AuditReport` — casts

```php
protected function casts(): array
{
    return [
        'audited_at' => 'immutable_datetime',
        'health'     => 'array',
        'server'     => 'array',
        'security'   => 'array',
        'plugins'    => 'array',
        'themes'     => 'array',
    ];
}
```

### `AuditReport` — useful scopes

```php
scopeLatestForWebsite(int $websiteId)   // ordered by audited_at DESC, limit 1
scopeWithinDays(int $days)              // audited_at >= now()->subDays($days)
scopeWithVulnerabilities()              // whereRaw JSON: security->vulnerable_plugins_count > 0
```

### `Website` — new relations

```php
public function auditReports(): HasMany   // ordered by audited_at DESC
public function latestAudit(): HasOne     // hasOne()->latestOfMany('audited_at')
```

### Auth middleware flow

1. Read `api_key` from request body (`$request->input('api_key')`) — 401 if missing
2. `Website::where('api_key', $apiKey)->first()` — 401 if not found
3. Check `status === 'active'` — 403 if disabled
4. Parse `Origin` or `Referer` header host, compare to `parse_url($website->url, PHP_URL_HOST)` — 403 if mismatch
5. Bind `Website` to `$request->attributes` for controller

### Controller flow (`AuditController@store`)

1. Get `$website` from `$request->attributes`
2. `$request->validate([...])` — validate all payload fields
3. Build 5 category arrays from validated data (compute counts inline)
4. `AuditReport::create([...])` — return `201` with report ID

### WP Plugin payload keys → category columns

```
audited_at                        → audited_at (top-level column)

health_status                     → health.status
wp_version                        → health.wp_version
php_version                       → health.php_version
mysql_version                     → health.mysql_version
debug_mode                        → health.debug_mode
cron_status                       → health.cron_status
admin_email                       → health.admin_email
locale                            → health.locale

db_size_bytes                     → server.db_size_bytes
php_error_count                   → server.php_error_count
php_errors[]                      → server.php_errors

ssl_valid                         → security.ssl_valid
ssl_expires_at                    → security.ssl_expires_at
plugins[].has_vulnerability count → security.vulnerable_plugins_count

plugins[]                         → plugins.items
  (computed) count                → plugins.total
  (computed) outdated count       → plugins.outdated
  (computed) vulnerable count     → plugins.vulnerable

themes[]                          → themes.items
active_theme                      → themes.active
  (computed) count                → themes.total
  (computed) outdated count       → themes.outdated
```

---

## Implementation Order

1. Migration → `php artisan migrate`
2. `AuditPayload` DTO (`app/Data/AuditPayload.php`)
3. `AuditReport` model + update `Website` model
4. `AuthenticateAuditRequest` middleware
5. `AuditController` + `routes/api.php` + `bootstrap/app.php`
6. Update `WebsiteController@store` redirect

---

## Verification

```bash
# Run migration
docker compose exec php php artisan migrate

# Test auth flow redirect (check response Location header points to WP admin with api_key)
# Submit the /websites/authorize form and confirm redirect goes to:
# {siteUrl}/wp-admin/admin.php?page=sitepulse&api_key=xxx&status=connected

# Test audit endpoint (replace {api_key} with a real key from websites table)
curl -X POST http://localhost:6080/api/sites/audit \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "{api_key}",
    "audited_at": "2026-05-03T10:00:00Z",
    "health_status": "up",
    "wp_version": "6.5.0",
    "php_version": "8.2.0",
    "mysql_version": "8.0.36",
    "debug_mode": false,
    "cron_status": "enabled",
    "admin_email": "admin@example.com",
    "locale": "en_US",
    "db_size_bytes": 52428800,
    "php_error_count": 0,
    "php_errors": null,
    "ssl_valid": true,
    "ssl_expires_at": "2026-08-01",
    "plugins": [{"name":"WooCommerce","version":"8.0.0","latest_version":"8.1.0","is_active":true,"has_vulnerability":false}],
    "active_theme": {"name":"Astra","version":"4.0.0","latest_version":"4.0.0"},
    "themes": [{"name":"Astra","version":"4.0.0","latest_version":"4.0.0","is_active":true}]
  }'
# → expect 201 {"message":"Audit stored.","report_id":1}

# Verify row created
docker compose exec php php artisan tinker
>>> App\Models\AuditReport::latest()->first()
```

---

# Plan: Uptime Monitoring (Phase 2 — current)

## Context

SitePulse will ping every registered WordPress site's `/wp-json/sitepulse-monitor/v1/heartbeat` endpoint on a schedule. Detect site outages from outside (since a fully-broken WP site can't self-report). For now, build with a **hardcoded 5-min cadence** — paid plans + per-site cadence come later (see "Future: Paid Plans" section).

---

## Architecture Decisions

- **Self-pacing per site**: each `Website` carries a `next_check_at` timestamp. Scheduler runs every minute, picks up sites where `next_check_at <= now()`. Per-site cadence is decided inside the job.
- **Two-strike rule**: only flip to `down` after 2 consecutive failures — kills false positives from network blips. Real detection delay ≈ 10 min at 5-min cadence.
- **Incidents written only on state transitions** — not on every check. Healthy site = 0 incident rows. Outage = 1 row (created at down-flip, resolved at recovery).
- **Non-blocking via queue**: scheduler dispatches `CheckSiteHeartbeat` jobs; one slow site can't block others.
- **No `site_pings` table**: skip the per-check ledger for now. Add only if/when per-minute uptime charts become a feature.
- **Hardcoded 5-min cadence**: simplest path to verify detection works end-to-end. Plan-based cadence comes later.

---

## Flow — Heartbeat Check

```
Laravel scheduler (every minute)         WP plugin (/heartbeat)
─────────────────────────────────────────────────────────────────────
1. CheckDueSites command:
   - Pull Website where next_check_at <= now() AND status = 'active'
   - For each site → dispatch CheckSiteHeartbeat job

2. Job: GET {site.url}/wp-json/sitepulse-monitor/v1/heartbeat
        Header: X-SPM-API-Key: {api_key}                  →
                                                              3. Plugin verifies header
                                                                 against stored api_key
                                                              4. Returns 200 {"ok": true, ...}

5. Job evaluates response:
   - 2xx + ok=true                → success
   - timeout / 5xx / network err  → failure
   - update Website state, write incident on transitions
   - set next_check_at = now() + 5 min
```

---

## Schema

### `websites` — new columns (migration)

```php
$table->timestamp('last_checked_at')->nullable();
$table->timestamp('next_check_at')->nullable()->index();
$table->unsignedTinyInteger('consecutive_failures')->default(0);
$table->string('uptime_status')->default('unknown');   // 'up' | 'down' | 'unknown'
```

### `site_incidents` — new table

```php
$table->id();
$table->foreignId('website_id')->constrained()->cascadeOnDelete();
$table->timestamp('started_at');
$table->timestamp('resolved_at')->nullable();
$table->string('reason')->nullable();          // 'timeout' | 'http_5xx' | 'connection_refused' | 'invalid_response'
$table->unsignedSmallInteger('http_status')->nullable();
$table->timestamps();
$table->index(['website_id', 'started_at']);
```

---

## New Files

| File | Purpose |
|---|---|
| `database/migrations/..._add_uptime_columns_to_websites.php` | Add `last_checked_at`, `next_check_at`, `consecutive_failures`, `uptime_status` |
| `database/migrations/..._create_site_incidents_table.php` | Outage history |
| `app/Models/SiteIncident.php` | Eloquent model |
| `app/Jobs/CheckSiteHeartbeat.php` | Per-site heartbeat job |
| `app/Console/Commands/CheckDueSites.php` | Scheduler entry point — dispatches jobs |

## Modified Files

| File | Change |
|---|---|
| `app/Models/Website.php` | Add `incidents()` relation, cast new columns |
| `routes/console.php` | Schedule `sites:check-due` every minute |

---

## Job Logic — `CheckSiteHeartbeat`

```php
public int $tries = 1;          // failures are expected; don't retry-storm
public int $timeout = 15;        // job-level timeout

public function handle(): void
{
    $response = Http::timeout(10)
        ->withHeaders(['X-SPM-API-Key' => $this->website->api_key])
        ->get(rtrim($this->website->url, '/') . '/wp-json/sitepulse-monitor/v1/heartbeat');

    $isUp = $response->successful() && ($response->json('ok') === true);

    $this->website->last_checked_at = now();

    if ($isUp) {
        $this->handleSuccess();
    } else {
        $this->handleFailure($response);
    }

    $this->website->next_check_at = now()->addMinutes(5);  // hardcoded for now
    $this->website->save();
}
```

### Success path

- Reset `consecutive_failures = 0`
- If status was `'down'`: flip to `'up'`, close open incident (`resolved_at = now()`)
- Else: ensure status is `'up'`

### Failure path (non-2xx, timeout, network error)

- Increment `consecutive_failures`
- If `consecutive_failures >= 2` AND status is not already `'down'`:
  - Flip status to `'down'`
  - Create new `site_incidents` row with `reason` + `http_status`

### Reason classification

- HTTP timeout / connection refused → `'connection_refused'` or `'timeout'`
- 5xx response → `'http_5xx'`
- 2xx but `ok !== true` (plugin gone / wrong response shape) → `'invalid_response'`

---

## Scheduler

```php
// routes/console.php
Schedule::command('sites:check-due')
    ->everyMinute()
    ->withoutOverlapping();
```

`CheckDueSites` command pulls websites with `next_check_at <= now()` (or null), dispatches each to the queue.

---

## Implementation Order

1. Migration: add columns to `websites` + create `site_incidents`
2. `SiteIncident` model + update `Website` model
3. `CheckSiteHeartbeat` job
4. `CheckDueSites` command
5. Schedule entry in `routes/console.php`
6. Verify end-to-end (see below)

---

## Verification

```bash
# Run migration
docker compose exec php php artisan migrate

# Seed a site with next_check_at in the past so it's picked up immediately
docker compose exec php php artisan tinker
>>> $w = App\Models\Website::first();
>>> $w->update(['next_check_at' => now()->subMinute()]);

# Run command manually (instead of waiting for scheduler)
docker compose exec php php artisan sites:check-due

# Run queue worker to process the dispatched job
docker compose exec php php artisan queue:work --once

# Verify state updated
>>> $w->fresh()
# → expect last_checked_at populated, uptime_status = 'up'

# Simulate downtime: stop the WP container, then trigger again
docker compose -f sitepulse-wp/docker-compose.yml stop web
>>> App\Models\Website::first()->update(['next_check_at' => now()->subMinute()]);
docker compose exec php php artisan sites:check-due
docker compose exec php php artisan queue:work --once
# → first failure: consecutive_failures = 1, status still 'up' (or 'unknown')

>>> App\Models\Website::first()->update(['next_check_at' => now()->subMinute()]);
docker compose exec php php artisan sites:check-due
docker compose exec php php artisan queue:work --once
# → second failure: consecutive_failures = 2, status = 'down', incident created

>>> App\Models\SiteIncident::latest()->first()
```

---

# Future: Paid Plans (Phase 3)

These notes capture the design direction for monetization. **Not implementing now** — current monitoring uses hardcoded 5-min cadence.

## Pricing model

Cadence becomes a paid feature. Faster checks = higher tier. Examples:

| Plan | Cadence | Approx price |
|---|---|---|
| Free | 30 min | $0 |
| Basic | 5 min | $10/site/mo |
| Pro | 3 min | $20/site/mo |
| Enterprise | 1 min / 30 sec | custom |

## Schema additions

- `plans` table: `slug`, `name`, `check_interval_minutes`, `price_cents`, `is_active`
- `websites`: add `plan_id`, `subscription_status` (`active` | `past_due` | `canceled`), `plan_renews_at`
- Or a dedicated `subscriptions` table for plan-change history (likely needed for billing audit)

## Per-website vs per-team billing

- **Per-website** (recommended): each site has its own plan. Customer can run their main store on Pro and a staging blog on Free. More billing complexity, more flexibility, more revenue per customer.
- **Per-team**: one plan covers all team sites. Simpler. Less flexible.

## Code changes when paid plans land

- Replace hardcoded `addMinutes(5)` in `CheckSiteHeartbeat` with `$this->website->plan->check_interval_minutes`
- `CheckDueSites` filters `subscription_status === 'active'` (don't monitor lapsed subscriptions)
- On plan upgrade: reset `next_check_at = now()` so faster cadence applies immediately
- Two-strike rule still applies regardless of plan — alerts after 2 consecutive failures, not after first

## Billing infrastructure

- Use Laravel Cashier (Stripe). Don't roll own.
- Webhooks update `subscription_status` on payment failures, cancellations, renewals
- Plan-change UI: hit Stripe → update `Website` → reset `next_check_at`

## Capacity planning

| Customers | Sites/customer | Cadence | Req/sec avg |
|---|---|---|---|
| 100 | 3 | 5 min | ~1 |
| 1,000 | 3 | 5 min | ~10 |
| 1,000 | 3 | 1 min | ~50 |

50 req/sec is fine on one queue worker but plan for horizontal scaling at Enterprise tier (multiple workers, possibly multiple regions for outbound IP diversity).

## Open questions to decide before building

1. Per-website or per-team billing? (Lean per-website.)
2. Will free tier exist? (Recommended for funnel.)
3. Plans in DB or config? (DB if plans should change without deploys.)
4. Fixed cadence tiers or continuous? (Tiers — avoids customers demanding "47-second cadence.")

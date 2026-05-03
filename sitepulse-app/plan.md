# Plan: WordPress Audit Data Storage Pipeline

## Context

SitePulse is a multi-tenant SaaS where WordPress sites send health metrics to a central Laravel app. Currently the `websites` table exists with `url`, `api_key`, and `status` — but there is no storage for audit data yet. This plan builds the full pipeline: API endpoint (authenticated by `api_key`), direct synchronous storage into `audit_reports`, and the model/controller/middleware needed to support it.

---

## Architecture Decision Summary

- **Plugin/theme data**: Stored as categorized JSON columns on `audit_reports`. Each audit is an immutable snapshot. Five categories: `health`, `server`, `security`, `plugins`, `themes` — new fields can be added to any category without a migration.
- **Direct storage**: Controller validates the payload and writes directly to `audit_reports` in one step. No staging table, no queue. Simple and sufficient for this scale.
- **Authentication**: Custom middleware reads `api_key` from route param, resolves `Website`, checks `status === 'active'`. No Sanctum — there is no user session.
- **Immutability**: `AuditReport::boot()` blocks `updating` events — reports are write-once snapshots.

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

---

## Migration Schema

### `audit_reports`

Five categorized JSON columns. Easy to extend any category without a migration.

```php
$table->id();
$table->foreignId('website_id')->constrained()->cascadeOnDelete();
$table->timestamp('audited_at');   // WP plugin's reported time

$table->json('health');     // site up/down, wp/php/mysql versions, cron, debug mode, admin email, locale
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

### Route

```
POST /api/sites/{api_key}/audit
```
- Registered in `routes/api.php` with `AuthenticateAuditRequest` middleware
- Laravel's `api` middleware group applies automatically (stateless, throttle:api, no CSRF)
- Must add `api: __DIR__.'/../routes/api.php'` to `withRouting()` in `bootstrap/app.php`

### Auth middleware flow

1. Read `api_key` from route param
2. `Website::where('api_key', $apiKey)->first()` — 401 if not found
3. Check `status === 'active'` — 403 if disabled
4. Bind `Website` to `$request->attributes` for controller

### Controller flow (`AuditController@store`)

1. Get `$website` from `$request->attributes`
2. Validate payload with `$request->validate([...])`
3. Build the 5 category arrays from validated data
4. `AuditReport::create([...])` — return `201` with the report ID

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
3. `AuditReport` model
4. Update `Website` model (add relations)
5. `AuthenticateAuditRequest` middleware
6. `AuditController` (`app/Http/Controllers/Api/AuditController.php`)
7. `routes/api.php` + `bootstrap/app.php`

---

## Verification

```bash
# Run migration
docker compose exec php php artisan migrate

# Test endpoint with curl (replace {api_key} with a real key from websites table)
curl -X POST http://localhost:6080/api/sites/{api_key}/audit \
  -H "Content-Type: application/json" \
  -d '{
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

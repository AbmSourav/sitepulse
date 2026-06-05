# SitePulse

**[SitePulse](https://sitepulsee.com)** is a SaaS platform for monitoring the health and uptime of any website. Add any URL for plain uptime monitoring, or connect the WordPress plugin to unlock deeper insight — audit history, SSL status, plugin vulnerabilities, database health, and PHP errors — all in one dashboard with instant alerts the moment something goes wrong.

No more manually checking sites. No more finding out a site was down hours after the fact.

> [!NOTE]
> · Hosted on **AWS** <br>
> · Infrastructure provisioned with **Terraform**. Deployed via **GitHub Actions CI/CD**

<br>

## SaaS App Stack

[![PHP](https://img.shields.io/badge/PHP-8.5-777BB4?logo=php&logoColor=white)]()
[![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel&logoColor=white)]()
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white)]()
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)]()
[![Caddy](https://img.shields.io/badge/Caddy-2-1F88C0?logo=caddy&logoColor=white)]()
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)]()
[![Supervisor](https://img.shields.io/badge/Supervisor-4-2B2B2B?logo=supervisord&logoColor=white)]()

[![Terraform](https://img.shields.io/badge/Terraform-1-623CE4?logo=terraform&logoColor=white)]()
[![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=githubactions&logoColor=white)]()
[![AWS Cloud](https://img.shields.io/badge/AWS-Orange?logo=amazonaws&logoColor=white)]()

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)]()
[![Inertia.js](https://img.shields.io/badge/Inertia.js-v3-9553E9?logo=inertia&logoColor=white)]()
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)]()

<br>

## Features

- **Universal uptime monitoring** — add any URL and SitePulse will check it on a per-plan cadence (1–5 min). No plugin required.
- **WordPress deep monitoring** — connect the lightweight plugin to get health snapshots covering plugin vulnerabilities, SSL certificate, database size, server info, and PHP errors. Full audit history stored and queryable.
- **Incident tracking** — every outage is recorded with start time, HTTP status, and failure reason. Resolved automatically on recovery.
- **Instant alerts** — down/up notifications via Email, Slack, Discord, or custom webhooks the moment a state transition is detected.
- **Team collaboration** — invite members, assign roles (Owner / Member / Guest), and share monitoring across a team.
- **Plan-based limits** — Free, Pro, and Enterprise tiers with configurable site limits, check intervals, and notification channel access.

<br>

## How Uptime Monitoring Works

```
System cron (every minute)
  └── sites:check-due command
        └── dispatches CheckSiteHeartbeat job per due site
              ├── Plain mode      →  GET /  (any 2xx = up)
              └── WordPress mode  →  GET /heartbeat  (api_key auth, expects {ok:true},
                                     also detects PHP fatal errors in response body)
```

On **first failure**: incident created, retry in 2 min.  
On **second failure** (confirmed down): alert dispatched to all team notification channels.  
On **recovery**: incident resolved, recovery alert dispatched.

| State | Next check |
|---|---|
| Up | Free: 5 min · Pro: 3 min · Enterprise: 1 min |
| 1st failure | 2 min |
| 2nd+ failure | 9 min |
| 6+ consecutive failures | 19 min |

<br>

## Monorepo Layout

```
sitepulse/
├── sitepulse-app/          # Laravel 13 app — backend API + React/Inertia frontend
└── sitepulse-wp/           # WordPress Docker dev environment
    ├── sitepulse-monitor/  # WP plugin source — tracked in git
    └── wordpress/          # Full WP install — NOT tracked in git
```

`sitepulse-wp/sitepulse-monitor/` is the canonical plugin source. `sitepulse-wp/wordpress/` is gitignored.

<br>

## WordPress Plugin Stack

[![PHP](https://img.shields.io/badge/PHP-8.1-777BB4?logo=php&logoColor=white)]()
[![WordPress](https://img.shields.io/badge/WordPress-6.x-21759B?logo=wordpress&logoColor=white)]()
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white)]()
[![Nginx](https://img.shields.io/badge/Nginx-latest-009639?logo=nginx&logoColor=white)]()
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)]()

<br>

## Notification Channels

Alerts are dispatched on down and recovery events to all active channels configured per team:

| Channel | How |
|---|---|
| **Email** | Blade template via Laravel Mail (Resend in production) |
| **Slack** | Incoming webhook POST |
| **Discord** | Incoming webhook POST |
| **Custom Webhook** | JSON POST with optional HMAC-SHA256 signature (`X-SPM-Signature`) |

If no email channel is configured, alerts fall back to the site owner's account email.

<br>

## Plans

| | Free | Pro | Enterprise |
|---|---|---|---|
| Monitored sites | 3 | Unlimited | Unlimited |
| Check interval | 5 min | 3 min | 1 min |
| Teams | 1 | 1 | Unlimited |
| Notification channels | Email | All | All |

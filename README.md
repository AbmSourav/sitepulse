# Site Pulse

WordPress Site Auditor SaaS with uptime monitoring. A WordPress plugin reports health metrics (plugins, DB size, PHP errors, SSL status); the Laravel app stores audit history, monitors uptime via scheduled heartbeat checks, and renders reports with recommendations. Alerts are sent via email and Slack/Discord webhooks for critical issues (plugin vulnerabilities, SSL expiry, site down).

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

## WordPress Stack

[![PHP](https://img.shields.io/badge/PHP-8.1-777BB4?logo=php&logoColor=white)]()
[![WordPress](https://img.shields.io/badge/WordPress-6.x-21759B?logo=wordpress&logoColor=white)]()
[![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?logo=mysql&logoColor=white)]()
[![Nginx](https://img.shields.io/badge/Nginx-latest-009639?logo=nginx&logoColor=white)]()
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)]()

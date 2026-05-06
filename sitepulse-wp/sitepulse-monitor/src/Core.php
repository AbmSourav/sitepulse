<?php

namespace Sitepulse\SitepulseMonitor;

use Sitepulse\SitepulseMonitor\Services\AdminMenu;
use Sitepulse\SitepulseMonitor\Services\AssetsManager;
use Sitepulse\SitepulseMonitor\Services\AuditReport;
use Sitepulse\SitepulseMonitor\Services\RestApi;

if (! defined('ABSPATH')) exit;

final class Core
{
    public function __construct()
    {
        $this->boot();
    }

    public function boot()
    {
        foreach ($this->services() as $service) {
            (new $service())->register();
        }
    }

    protected function services(): array
    {
        return [
            AssetsManager::class,
            AdminMenu::class,
            RestApi::class,
            AuditReport::class,
        ];
    }
}

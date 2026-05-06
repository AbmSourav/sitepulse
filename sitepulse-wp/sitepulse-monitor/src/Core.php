<?php

namespace Sitepulse\SitepulseMonitor;

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

        ];
    }
}

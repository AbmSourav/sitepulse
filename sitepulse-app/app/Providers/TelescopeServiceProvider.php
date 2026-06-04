<?php

namespace App\Providers;

use Laravel\Telescope\Telescope;
use Laravel\Telescope\TelescopeApplicationServiceProvider;

class TelescopeServiceProvider extends TelescopeApplicationServiceProvider
{
    public function boot(): void
    {
        parent::boot();

        Telescope::auth(fn ($request) => (bool) $request->user('web'));
    }

    public function register(): void
    {
        Telescope::night();
    }

    protected function gate(): void {}
}

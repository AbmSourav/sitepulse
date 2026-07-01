<?php

namespace App\Providers;

use Laravel\Telescope\Telescope;
use Laravel\Telescope\TelescopeApplicationServiceProvider;

class TelescopeServiceProvider extends TelescopeApplicationServiceProvider
{
    public function boot(): void
    {
        parent::boot();

        // Open freely on local; require an authenticated web user elsewhere
        // (e.g. staging — Telescope is registered in any non-production env).
        Telescope::auth(fn ($request) => app()->environment('local') || (bool) $request->user('web'));
    }

    public function register(): void
    {
        Telescope::night();
    }

    protected function gate(): void {}
}

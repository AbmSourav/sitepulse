<?php

use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\SiteController;
use App\Http\Middleware\AuthenticateApiRequest;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/sites/audit', [AuditController::class, 'store'])
        ->middleware(AuthenticateApiRequest::class)
        ->name('api.audit.store');

    Route::post('/websites/disconnect', [SiteController::class, 'disconnect'])
        ->middleware(AuthenticateApiRequest::class)
        ->name('api.site.disconnect');
});

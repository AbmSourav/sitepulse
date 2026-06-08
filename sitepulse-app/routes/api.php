<?php

use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SiteController;
use App\Http\Middleware\AuthenticateApiRequest;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->middleware(AuthenticateApiRequest::class)->group(function () {
    Route::post('/sites/audit', [AuditController::class, 'store'])
        ->name('api.audit.store');

    Route::post('/websites/disconnect', [SiteController::class, 'disconnect'])
        ->name('api.site.disconnect');

    Route::post('/websites/reconnect', [SiteController::class, 'reconnect'])
        ->name('api.site.reconnect');

    Route::post('/incidents', [ReportController::class, 'incidents'])
        ->name('api.incidents.index');

    Route::post('/audit-reports', [ReportController::class, 'auditReports'])
        ->name('api.audit-reports.index');

    Route::post('/website/stats', [ReportController::class, 'stats'])
        ->name('api.website.stats');
});

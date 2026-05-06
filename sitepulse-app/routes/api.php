<?php

use App\Http\Controllers\Api\AuditController;
use App\Http\Middleware\AuthenticateAuditRequest;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/sites/audit', [AuditController::class, 'store'])
        ->middleware(AuthenticateAuditRequest::class)
        ->name('api.audit.store');
});

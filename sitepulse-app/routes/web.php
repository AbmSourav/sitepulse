<?php

use App\Http\Controllers\AuditReportController;
use App\Http\Controllers\Auth\GoogleController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\IncidentController;
use App\Http\Controllers\Teams\TeamInvitationController;
use App\Http\Controllers\WebsiteController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

// Health check endpoint for load balancer and uptime monitoring
Route::get('/up', fn () => response()->json(['status' => 'ok']));

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::get('/auth/google/redirect', [GoogleController::class, 'redirect'])->name('auth.google.redirect');
Route::get('/auth/google/callback', [GoogleController::class, 'callback'])->name('auth.google.callback');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('websites/authorize', [WebsiteController::class, 'create'])->name('websites.authorize');

    Route::post('websites/store', [WebsiteController::class, 'store'])->middleware('plan.limit:maxSites')->name('websites.store');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('websites', [WebsiteController::class, 'index'])->name('websites.index');
    Route::post('websites/monitor', [WebsiteController::class, 'addMonitor'])->middleware('plan.limit:maxSites')->name('websites.monitor');
    Route::get('audit-reports', [AuditReportController::class, 'index'])->name('audit-reports.index');
    Route::get('audit-reports/{auditReport}', [AuditReportController::class, 'show'])->name('audit-reports.show');

    Route::post('websites/update', [WebsiteController::class, 'update'])->name('websites.update');

    Route::get('incidents', [IncidentController::class, 'index'])->name('incidents.index');
});

Route::middleware(['auth'])->group(function () {
    Route::get('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
});

require __DIR__.'/settings.php';

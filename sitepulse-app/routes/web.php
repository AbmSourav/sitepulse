<?php

use App\Http\Controllers\AuditReportController;
use App\Http\Controllers\IncidentController;
use App\Http\Controllers\Teams\TeamInvitationController;
use App\Http\Controllers\WebsiteController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth'])->group(function () {
    Route::get('dashboard', fn () => Inertia::render('dashboard', [
        'emailVerified' => (bool) request()->user()?->email_verified_at,
    ]))->name('dashboard');

    Route::get('websites/authorize', [WebsiteController::class, 'create'])->name('websites.authorize');

    Route::post('websites/store', [WebsiteController::class, 'store'])->name('websites.store');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('websites', [WebsiteController::class, 'index'])->name('websites.index');
    Route::post('websites/monitor', [WebsiteController::class, 'addMonitor'])->name('websites.monitor');
    Route::get('audit-reports', [AuditReportController::class, 'index'])->name('audit-reports.index');
    Route::get('audit-reports/{auditReport}', [AuditReportController::class, 'show'])->name('audit-reports.show');

    Route::post('websites/update', [WebsiteController::class, 'update'])->name('websites.update');

    Route::get('incidents', [IncidentController::class, 'index'])->name('incidents.index');
});

Route::middleware(['auth'])->group(function () {
    Route::get('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
});

require __DIR__.'/settings.php';

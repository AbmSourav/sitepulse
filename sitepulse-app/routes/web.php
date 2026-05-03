<?php

use App\Http\Controllers\Teams\TeamInvitationController;
use App\Http\Controllers\WebsiteController;
use App\Http\Middleware\EnsureTeamMembership;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::prefix('{current_team}')
    ->middleware(['auth', 'verified', EnsureTeamMembership::class])
    ->group(function () {
        Route::inertia('dashboard', 'dashboard')->name('dashboard');
        Route::get('websites', [WebsiteController::class, 'index'])->name('websites.index');
        Route::post('websites/update', [WebsiteController::class, 'update'])->name('websites.update');
    });

Route::middleware(['auth'])->group(function () {
    Route::get('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('websites/authorize', [WebsiteController::class, 'create'])->name('websites.authorize');
    Route::post('websites/store', [WebsiteController::class, 'store'])->name('websites.store');
});

require __DIR__.'/settings.php';

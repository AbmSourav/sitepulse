<?php

use App\Enums\Plan;
use App\Enums\TeamRole;
use App\Models\User;

test('registration screen can be rendered', function () {
    $response = $this->get(route('register'));

    $response->assertOk();
});

test('new users can register', function () {
    $response = $this->post(route('register.store'), [
        'name'                  => 'Test User',
        'email'                 => 'test@example.com',
        'password'              => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard'));
    $this->assertDatabaseHas('users', ['email' => 'test@example.com']);
});

test('registering creates a personal team owned by the user on the free plan', function () {
    $this->post(route('register.store'), [
        'name'                  => 'Team Owner',
        'email'                 => 'owner@example.com',
        'password'              => 'password',
        'password_confirmation' => 'password',
    ]);

    $user = User::where('email', 'owner@example.com')->firstOrFail();

    // A personal team is created and the user belongs to it as Owner.
    $team = $user->personalTeam();
    expect($team)->not->toBeNull();
    expect($user->teams()->where('teams.id', $team->id)->wherePivot('role', TeamRole::Owner->value)->exists())->toBeTrue();

    // New users start on the Free plan.
    expect($user->subscription_detail['plan'])->toBe(Plan::Free->value);
    // toEqual (loose) — JSON round-trip through MySQL may reorder array keys.
    expect($user->planLimits())->toEqual(Plan::Free->limits());
});

test('registration requires name, email and a confirmed password', function () {
    $response = $this->post(route('register.store'), [
        'name'                  => '',
        'email'                 => 'not-an-email',
        'password'              => 'password',
        'password_confirmation' => 'different',
    ]);

    $response->assertSessionHasErrors(['name', 'email', 'password']);
    $this->assertGuest();
});

test('registration rejects a duplicate email', function () {
    User::factory()->create(['email' => 'taken@example.com']);

    $response = $this->post(route('register.store'), [
        'name'                  => 'Second User',
        'email'                 => 'taken@example.com',
        'password'              => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertSessionHasErrors('email');
    $this->assertGuest();
});

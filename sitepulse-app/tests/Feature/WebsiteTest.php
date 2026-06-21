<?php

use App\Jobs\CheckDomainExpiry;
use App\Jobs\FetchSiteAudit;
use App\Models\User;
use App\Models\Website;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;

/*
|--------------------------------------------------------------------------
| index
|--------------------------------------------------------------------------
*/

test('guests cannot view the websites list', function () {
    $this->get(route('websites.index'))->assertRedirect(route('login'));
});

test('unverified users cannot view the websites list', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)
        ->get(route('websites.index'))
        ->assertRedirect(route('verification.notice'));
});

test('the websites list only shows the current team sites', function () {
    $user = User::factory()->create();
    $ownSite = Website::factory()->create([
        'user_id' => $user->id,
        'team_id' => $user->currentTeam->id,
    ]);

    // A website belonging to a different user/team.
    $otherSite = Website::factory()->create();

    $this->actingAs($user)
        ->get(route('websites.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('websites/websites')
            ->has('websites', 1)
            ->where('websites.0.id', $ownSite->id),
        );
});

/*
|--------------------------------------------------------------------------
| store (WP plugin connect flow)
|--------------------------------------------------------------------------
*/

test('a website can be connected via the plugin store flow', function () {
    Queue::fake();

    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('websites.store'), [
        'siteUrl'     => 'https://example.com/wp-admin/admin.php?page=sitepulse-monitor',
        'siteBaseUrl' => 'https://example.com/',
        'teamId'      => $user->team_id,
    ]);

    $response->assertRedirect();

    $website = Website::where('team_id', $user->team_id)->firstOrFail();
    expect($website->api_key)->not->toBeNull();
    expect($website->status)->toBe('connected');
    expect($website->meta_data['siteBaseUrl'])->toBe('https://example.com/');

    Queue::assertPushed(CheckDomainExpiry::class);
    Queue::assertPushed(FetchSiteAudit::class);
});

test('store validates required fields', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('websites.store'), [])
        ->assertSessionHasErrors(['siteUrl', 'siteBaseUrl', 'teamId']);
});

test('store rejects a duplicate url', function () {
    $user = User::factory()->create();
    Website::factory()->create(['url' => 'https://taken.com/wp-admin']);

    $this->actingAs($user)
        ->post(route('websites.store'), [
            'siteUrl'     => 'https://taken.com/wp-admin',
            'siteBaseUrl' => 'https://taken.com/',
            'teamId'      => $user->team_id,
        ])
        ->assertSessionHasErrors('siteUrl');
});

test('a user cannot connect a website to a team that is not theirs', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    $this->actingAs($user)
        ->post(route('websites.store'), [
            'siteUrl'     => 'https://example.com/wp-admin',
            'siteBaseUrl' => 'https://example.com/',
            'teamId'      => $otherUser->team_id,
        ])
        ->assertForbidden();

    $this->assertDatabaseMissing('websites', ['url' => 'https://example.com/wp-admin']);
});

test('free users are blocked from connecting more sites than their plan allows', function () {
    Queue::fake();

    // Free plan allows maxSites = 3.
    $user = User::factory()->create();
    Website::factory()->count(3)->create([
        'user_id' => $user->id,
        'team_id' => $user->team_id,
    ]);

    $response = $this->actingAs($user)->post(route('websites.store'), [
        'siteUrl'     => 'https://fourth.com/wp-admin',
        'siteBaseUrl' => 'https://fourth.com/',
        'teamId'      => $user->team_id,
    ]);

    // EnforceApiPlanLimit redirects back to WordPress instead of creating.
    $response->assertRedirect();
    $this->assertDatabaseMissing('websites', ['url' => 'https://fourth.com/wp-admin']);
    Queue::assertNotPushed(CheckDomainExpiry::class);
});

/*
|--------------------------------------------------------------------------
| addMonitor (plain-URL flow from the dashboard)
|--------------------------------------------------------------------------
*/

test('a plain url website can be added from the dashboard', function () {
    Queue::fake();

    $user = User::factory()->create();

    $response = $this->actingAs($user)->post(route('websites.monitor'), [
        'url' => 'https://plain-site.com',
    ]);

    $response->assertRedirect(route('websites.index'));

    $website = Website::where('url', 'https://plain-site.com')->firstOrFail();
    expect($website->api_key)->toBeNull();
    expect($website->status)->toBe('connected');

    Queue::assertPushed(CheckDomainExpiry::class);
});

test('adding a monitor requires a valid unique url', function () {
    $user = User::factory()->create();
    Website::factory()->create(['url' => 'https://dupe.com']);

    $this->actingAs($user)
        ->post(route('websites.monitor'), ['url' => 'https://dupe.com'])
        ->assertSessionHasErrors('url');
});

/*
|--------------------------------------------------------------------------
| update (connect / disconnect)
|--------------------------------------------------------------------------
*/

test('a website status can be updated by its team', function () {
    $user = User::factory()->create();
    $website = Website::factory()->create([
        'user_id' => $user->id,
        'team_id' => $user->team_id,
    ]);

    $this->actingAs($user)
        ->post(route('websites.update'), [
            'websiteId' => $website->id,
            'status'    => 'disconnected',
        ])
        ->assertOk();

    expect($website->fresh()->status)->toBe('disconnected');
});

test('reconnecting a website refreshes connected_at', function () {
    $user = User::factory()->create();
    $website = Website::factory()->disconnected()->create([
        'user_id'      => $user->id,
        'team_id'      => $user->team_id,
        'connected_at' => now()->subMonth(),
    ]);

    $this->actingAs($user)
        ->post(route('websites.update'), [
            'websiteId' => $website->id,
            'status'    => 'connected',
        ])
        ->assertOk();

    $website->refresh();
    expect($website->status)->toBe('connected');
    expect($website->connected_at->isToday())->toBeTrue();
});

test('a user cannot update a website belonging to another team', function () {
    $user = User::factory()->create();
    $otherSite = Website::factory()->create();

    $this->actingAs($user)
        ->post(route('websites.update'), [
            'websiteId' => $otherSite->id,
            'status'    => 'disconnected',
        ])
        ->assertForbidden();

    expect($otherSite->fresh()->status)->toBe('connected');
});

test('update validates the status value', function () {
    $user = User::factory()->create();
    $website = Website::factory()->create([
        'user_id' => $user->id,
        'team_id' => $user->team_id,
    ]);

    $this->actingAs($user)
        ->post(route('websites.update'), [
            'websiteId' => $website->id,
            'status'    => 'bogus',
        ])
        ->assertSessionHasErrors('status');
});

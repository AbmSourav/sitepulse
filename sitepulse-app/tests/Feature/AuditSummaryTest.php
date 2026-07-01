<?php

use App\Models\AuditReport;
use App\Models\User;
use App\Models\Website;
use App\Services\AuditSummarizer;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

/**
 * Create an audit report belonging to the given user's team.
 */
function reportForUser(User $user, array $attributes = []): AuditReport
{
    $website = Website::factory()->create([
        'user_id' => $user->id,
        'team_id' => $user->currentTeam->id,
    ]);

    return AuditReport::factory()->create([
        'website_id' => $website->id,
        ...$attributes,
    ]);
}

function fakeSummary(): array
{
    return [
        'summary'         => 'The site is broadly healthy with a couple of minor items.',
        'recommendations' => [
            ['title' => 'Enable auto-updates', 'severity' => 'info', 'action' => 'Turn on background updates.'],
        ],
        'model'           => 'claude-sonnet-5',
        'generated_at'    => now()->toIso8601String(),
    ];
}

function withClaudeAi(User $user): User
{
    $user->ai_settings = [
        'provider' => 'claude',
        'apiKey'   => 'sk-ant-test-key',
        'model'    => 'claude-sonnet-5',
    ];
    $user->save();

    return $user;
}

/*
|--------------------------------------------------------------------------
| Auth / authorization
|--------------------------------------------------------------------------
*/

test('guests cannot request an AI summary', function () {
    $report = AuditReport::factory()->create();

    $this->postJson(route('audit-reports.summary', $report))
        ->assertUnauthorized();
});

test('a user cannot summarize a report from another team', function () {
    $user = withClaudeAi(User::factory()->create());
    $otherReport = AuditReport::factory()->create(); // different team

    $this->actingAs($user)
        ->postJson(route('audit-reports.summary', $otherReport))
        ->assertForbidden();
});

/*
|--------------------------------------------------------------------------
| needs_setup
|--------------------------------------------------------------------------
*/

test('a user without a Claude key gets needs_setup', function () {
    $user = User::factory()->create(); // no ai_settings
    $report = reportForUser($user);

    $this->actingAs($user)
        ->postJson(route('audit-reports.summary', $report))
        ->assertOk()
        ->assertJson(['needs_setup' => true]);

    expect($report->fresh()->ai_summary)->toBeNull();
});

/*
|--------------------------------------------------------------------------
| Generation + persistence
|--------------------------------------------------------------------------
*/

test('generating a summary persists it to the report and returns it', function () {
    $user = withClaudeAi(User::factory()->create());
    $report = reportForUser($user);

    $this->mock(AuditSummarizer::class)
        ->shouldReceive('summarize')
        ->once()
        ->andReturn(fakeSummary());

    $this->actingAs($user)
        ->postJson(route('audit-reports.summary', $report))
        ->assertOk()
        ->assertJson(['model' => 'claude-sonnet-5'])
        ->assertJsonPath('recommendations.0.severity', 'info');

    expect($report->fresh()->ai_summary['summary'])
        ->toBe('The site is broadly healthy with a couple of minor items.');
});

test('an AI error is returned as a clean 502', function () {
    $user = withClaudeAi(User::factory()->create());
    $report = reportForUser($user);

    $this->mock(AuditSummarizer::class)
        ->shouldReceive('summarize')
        ->once()
        ->andThrow(new RuntimeException('Invalid Claude API key.'));

    $this->actingAs($user)
        ->postJson(route('audit-reports.summary', $report))
        ->assertStatus(502)
        ->assertJson(['error' => 'Invalid Claude API key.']);

    expect($report->fresh()->ai_summary)->toBeNull();
});

/*
|--------------------------------------------------------------------------
| Immutability guard
|--------------------------------------------------------------------------
*/

test('the immutability guard still blocks non-ai_summary updates', function () {
    $report = AuditReport::factory()->create(['health' => ['status' => 'good']]);

    $report->health = ['status' => 'critical'];
    $report->save();

    // Change was silently rejected by the updating() guard.
    expect($report->fresh()->health['status'])->toBe('good');
});

test('ai_summary can be written once to an existing report', function () {
    $report = AuditReport::factory()->create(['ai_summary' => null]);

    $report->ai_summary = fakeSummary();
    $report->save();

    expect($report->fresh()->ai_summary['model'])->toBe('claude-sonnet-5');
});

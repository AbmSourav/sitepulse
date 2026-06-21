<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Website;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Website>
 */
class WebsiteFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'team_id' => fn (array $attributes) => User::find($attributes['user_id'])?->currentTeam->id
                ?? User::find($attributes['user_id'])?->personalTeam()->id,
            'url'           => fake()->unique()->url(),
            'api_key'       => Str::random(32),
            'status'        => 'connected',
            'connected_at'  => now(),
            'uptime_status' => 'up',
        ];
    }

    /**
     * Site is disconnected.
     */
    public function disconnected(): static
    {
        return $this->state(fn () => ['status' => 'disconnected']);
    }

    /**
     * Plain-URL monitoring mode (added from the SaaS dashboard, no WP plugin).
     */
    public function plainUrl(): static
    {
        return $this->state(fn () => ['api_key' => null]);
    }
}

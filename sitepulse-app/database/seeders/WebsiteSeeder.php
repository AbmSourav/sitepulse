<?php

namespace Database\Seeders;

use App\Models\Team;
use App\Models\User;
use App\Models\Website;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class WebsiteSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::first();
        $team = Team::first();

        if (! $user || ! $team) {
            $this->command->warn('No user or team found. Run DatabaseSeeder first.');
            return;
        }

        $websites = [
            ['url' => 'https://abmsourav.com/welcome', 'status' => 'active'],
            ['url' => 'https://myblog.com', 'status' => 'active'],
            ['url' => 'https://shop.mystore.com', 'status' => 'disabled'],
        ];

        foreach ($websites as $site) {
            Website::firstOrCreate(
                ['url' => $site['url']],
                [
                    'user_id' => $user->id,
                    'team_id' => $team->id,
                    'api_key' => Str::random(32),
                    'status'  => $site['status'],
                ]
            );
        }
    }
}

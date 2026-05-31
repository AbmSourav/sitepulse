<?php

namespace App\Http\Middleware;

use App\Enums\TeamRole;
use App\Models\User;
use App\Models\Website;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class EnforcePlanLimit
{
    public function handle(Request $request, Closure $next, string $limit): mixed
    {
        $user   = $request->user();
        $limits = $user->planLimits();

        match ($limit) {
            'maxSites'             => $this->checkMaxSites($user, $limits['maxSites']),
            'maxTeams'             => $this->checkMaxTeams($user, $limits['maxTeams']),
            'notificationChannels' => $this->checkNotificationChannel($request, $limits['notificationChannels']),
        };

        return $next($request);
    }

    private function checkMaxSites(User $user, int $max): void
    {
        if ($max === -1) {
            return;
        }

        if (Website::where('team_id', $user->currentTeam->id)->count() >= $max) {
            throw ValidationException::withMessages([
                'plan' => "Your plan allows a maximum of {$max} monitored websites.",
            ]);
        }
    }

    private function checkMaxTeams(User $user, int $max): void
    {
        if ($max === -1) {
            return;
        }

        $owned = $user->teams()->wherePivot('role', TeamRole::Owner->value)->count();
        if ($owned >= $max) {
            throw ValidationException::withMessages([
                'plan' => "Your plan allows a maximum of {$max} team.",
            ]);
        }
    }

    private function checkNotificationChannel(Request $request, array $allowed): void
    {
        $type = $request->input('type');
        if (!in_array($type, $allowed, true)) {
            throw ValidationException::withMessages([
                'plan' => 'This channel type is not available on your plan.',
            ]);
        }
    }
}

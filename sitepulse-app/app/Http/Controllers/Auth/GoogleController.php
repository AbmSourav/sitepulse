<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Fortify\CreateNewUser;
use App\Actions\Teams\CreateTeam;
use App\Enums\Plan;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;

class GoogleController extends Controller
{
    public function __construct(private CreateTeam $createTeam) {}

    public function redirect()
    {
        return Socialite::driver('google')->redirect();
    }

    public function callback(CreateNewUser $createNewUser)
    {
        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (InvalidStateException) {
            return redirect()->route('login')->withErrors(['email' => 'Google sign-in failed. Please try again.']);
        }

        $user = User::where('auth_provider', 'google')
            ->where('auth_id', $googleUser->getId())
            ->first();

        if (! $user) {
            $user = User::where('email', $googleUser->getEmail())->first();
        }

        if ($user) {
            if (! $user->auth_id) {
                $user->auth_provider = 'google';
                $user->auth_id       = $googleUser->getId();
            }

            if (! $user->email_verified_at) {
                $user->email_verified_at = now();
            }

            $user->save();
        } else {
            $user = $createNewUser->storeUserAndTeam([
                'name'          => $googleUser->getName() ?? $googleUser->getNickname() ?? 'Google User',
                'email'         => $googleUser->getEmail(),
                'auth_provider' => 'google',
                'auth_id'       => $googleUser->getId(),
                'email_verified_at'   => now(),
                'subscription_detail' => [
                    'plan'   => Plan::Free->value,
                    'label'  => Plan::Free->label(),
                    'limits' => Plan::Free->limits(),
                ],
            ]);
        }

        Auth::login($user, remember: true);

        return redirect(config('fortify.home'));
    }
}

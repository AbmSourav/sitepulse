<?php

namespace App\Models;

use App\Concerns\HasTeams;
use App\Enums\Plan;
use App\Notifications\VerifyEmailNotification;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

#[Fillable(['name', 'email', 'email_verified_at', 'password', 'team_id', 'subscription_detail', 'auth_provider', 'auth_id'])]
#[Hidden(['password', 'remember_token', 'email_verified_at'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, HasTeams, Notifiable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at'   => 'datetime',
            'password'            => 'hashed',
            'subscription_detail' => 'array',
        ];
    }

    public function plan(): Plan
    {
        if (is_array($this->subscription_detail)) {
            return Plan::from($this->subscription_detail['plan']);
        }

        return Plan::Free;
    }

    public function planLimits(): array
    {
        if (is_array($this->subscription_detail)) {
            return $this->subscription_detail['limits'];
        }

        return $this->plan()->limits();
    }

    public function sendEmailVerificationNotification(): void
    {
        $this->notify(new VerifyEmailNotification);
    }
}

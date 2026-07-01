<?php

namespace App\Models;

use App\Casts\AiSettings;
use App\Concerns\HasTeams;
use App\Enums\Plan;
use App\Notifications\VerifyEmailNotification;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Crypt;
use Laravel\Fortify\TwoFactorAuthenticatable;

#[Fillable(['name', 'email', 'email_verified_at', 'password', 'team_id', 'subscription_detail', 'ai_settings', 'auth_provider', 'auth_id'])]
#[Hidden(['password', 'remember_token', 'email_verified_at', 'ai_settings'])]
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
            'ai_settings'         => AiSettings::class,
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

    /**
     * Whether the user has a usable Claude AI configuration (provider, key, model).
     * Presence check on ciphertext — no decryption needed.
     */
    public function hasClaudeAi(): bool
    {
        $settings = $this->ai_settings ?? [];

        return ($settings['provider'] ?? null) === 'claude'
            && ! empty($settings['apiKey'])
            && ! empty($settings['model']);
    }

    /**
     * The decrypted Claude API key. This is the ONLY place plaintext is produced —
     * called just before an SDK request. Returns null when unset or undecryptable
     * (e.g. after an APP_KEY rotation).
     */
    public function aiApiKey(): ?string
    {
        $encrypted = $this->ai_settings['apiKey'] ?? null;

        if (! $encrypted) {
            return null;
        }

        try {
            return Crypt::decryptString($encrypted);
        } catch (DecryptException) {
            return null;
        }
    }
}

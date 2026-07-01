<?php

namespace App\Casts;

use Illuminate\Contracts\Database\Eloquent\CastsAttributes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

/**
 * Casts the `ai_settings` JSON column while encrypting ONLY the `apiKey`
 * sub-key at rest. `provider` and `model` stay plain, readable JSON.
 *
 * Reads return the array with `apiKey` still as ciphertext — decryption is
 * deliberate and happens only in User::aiApiKey(), keeping plaintext off
 * every accidental dump/log/serialize path.
 *
 * @implements CastsAttributes<array<string, mixed>|null, array<string, mixed>|null>
 */
class AiSettings implements CastsAttributes
{
    /**
     * @return array<string, mixed>|null
     */
    public function get(Model $model, string $key, mixed $value, array $attributes): ?array
    {
        if (blank($value)) {
            return null;
        }

        $decoded = json_decode($value, true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @return array<string, mixed>|string|null
     */
    public function set(Model $model, string $key, mixed $value, array $attributes): array|string|null
    {
        if (blank($value)) {
            return null;
        }

        if (! is_array($value)) {
            return $value;
        }

        // Encrypt the apiKey only if it isn't already ciphertext. Merge paths in
        // the controller may re-set a previously stored (already-encrypted) key.
        if (! empty($value['apiKey']) && ! $this->isEncrypted($value['apiKey'])) {
            $value['apiKey'] = Crypt::encryptString($value['apiKey']);
        }

        return [$key => json_encode($value)];
    }

    private function isEncrypted(string $value): bool
    {
        try {
            Crypt::decryptString($value);

            return true;
        } catch (\Illuminate\Contracts\Encryption\DecryptException) {
            return false;
        }
    }
}

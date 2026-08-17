<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default AI Provider
    |--------------------------------------------------------------------------
    |
    | SitePulse only uses Anthropic (Claude) for the AI assistant and audit
    | summaries, so it is the sole configured provider and the default.
    |
    */

    'default' => 'anthropic',

    /*
    |--------------------------------------------------------------------------
    | AI Providers
    |--------------------------------------------------------------------------
    |
    | SitePulse is BYOK: there is no global Anthropic key. Each user stores
    | their own key (encrypted) in `users.ai_settings.apiKey`. The key below
    | stays empty in the environment on purpose — AiAssistantController injects
    | the authenticated user's decrypted key into this config value at runtime,
    | for the current request only, immediately before prompting. See
    | `User::aiApiKey()` (the only plaintext-decrypt call site).
    |
    */

    'providers' => [
        'anthropic' => [
            'driver'  => 'anthropic',
            'key'     => env('ANTHROPIC_API_KEY'), // empty — overridden per-request (BYOK)
            'url'     => env('ANTHROPIC_URL', 'https://api.anthropic.com/v1'),
            'version' => env('ANTHROPIC_VERSION', '2023-06-01'),
        ],
    ],

];

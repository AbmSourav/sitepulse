<?php

namespace App\Http\Controllers;

use App\Ai\Agents\SiteAssistant;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Ai\Enums\Lab;
use Laravel\Ai\Exceptions\InsufficientCreditsException;
use Laravel\Ai\Exceptions\ProviderOverloadedException;
use Laravel\Ai\Exceptions\RateLimitedException;
use Laravel\Ai\Messages\AssistantMessage;
use Laravel\Ai\Messages\Message;
use Laravel\Ai\Messages\UserMessage;
use Throwable;

class AiAssistantController extends Controller
{
    /**
     * The most recent conversation turns (user+assistant messages) the client
     * may replay for context. Bounds token spend on user-controlled history.
     */
    private const MAX_HISTORY_MESSAGES = 10;

    /**
     * Answer one assistant message using the user's own Claude key (BYOK).
     *
     * The assistant is stateless server-side: the client sends the new message
     * plus the recent transcript, and the agent replays that transcript as
     * conversation context. Tool calls (team-scoped) happen inside the SDK loop.
     */
    public function chat(Request $request): JsonResponse
    {
        $data = $request->validate([
            'message'           => ['required', 'string', 'max:2000'],
            'history'           => ['sometimes', 'array', 'max:50'],
            'history.*.role'    => ['required_with:history', 'in:user,assistant'],
            'history.*.content' => ['required_with:history', 'string', 'max:6000'],
        ]);

        $user = $request->user();

        // No key configured (or key undecryptable) -> ask the user to set one up.
        // hasClaudeAi() is a presence check (no decrypt); aiApiKey() may still
        // return null if the stored ciphertext can't be decrypted (APP_KEY rotated).
        if (! $user->hasClaudeAi() || ($apiKey = $user->aiApiKey()) === null) {
            return response()->json(['needs_setup' => true]);
        }

        // BYOK: inject the user's decrypted key into the AI provider config for
        // THIS request only. laravel/ai reads config('ai.providers.anthropic.key')
        // lazily when it first constructs the provider (during prompt()), so this
        // per-request override is what the API call uses. Config is not persisted,
        // so there is no cross-request/cross-user leakage.
        config()->set('ai.providers.anthropic.key', $apiKey);

        try {
            $response = SiteAssistant::make(
                user: $user,
                history: $this->historyMessages($data['history'] ?? []),
            )->prompt(
                $data['message'],
                provider: Lab::Anthropic,
                model: $user->ai_settings['model'],
            );

            return response()->json(['reply' => (string) $response]);
        } catch (Throwable $e) {
            report($e);

            return response()->json(['error' => $this->friendlyError($e)], 502);
        }
    }

    /**
     * Convert the client-supplied transcript into SDK conversation messages,
     * keeping only the most recent turns. History is the user's own prior text
     * (no cross-team risk), but it is validated (role + length) and capped here
     * so a large client payload can't blow up token spend.
     *
     * @param  array<int, array{role: string, content: string}>  $history
     * @return array<int, Message>
     */
    private function historyMessages(array $history): array
    {
        return collect($history)
            ->slice(-self::MAX_HISTORY_MESSAGES)
            ->map(fn (array $m) => $m['role'] === 'assistant'
                ? new AssistantMessage($m['content'])
                : new UserMessage($m['content']))
            ->values()
            ->all();
    }

    /**
     * Map SDK / provider exceptions to clean, user-facing messages. Branches on
     * exception class where the SDK provides one (429/402/503); a raw 401 comes
     * through as an HTTP RequestException (invalid key).
     */
    private function friendlyError(Throwable $e): string
    {
        if ($e instanceof RateLimitedException) {
            return 'Your Claude account is rate limited right now. Please try again in a moment.';
        }

        if ($e instanceof InsufficientCreditsException) {
            return 'Your Claude account has insufficient credits. Add credits in your Anthropic console and try again.';
        }

        if ($e instanceof ProviderOverloadedException) {
            return 'Claude is temporarily overloaded. Please try again shortly.';
        }

        if ($e instanceof RequestException && $e->response?->status() === 401) {
            return 'Your Claude API key was rejected. Check the key saved in your profile settings.';
        }

        return 'The assistant could not complete your request. Please try again.';
    }
}

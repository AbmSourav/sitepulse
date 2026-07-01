<?php

namespace App\Services;

use Anthropic\Client;
use App\Models\AuditReport;
use App\Models\User;
use RuntimeException;

/**
 * Turns a raw AuditReport into a plain-English summary + severity-ranked
 * recommendations using the user's own Claude API key (BYOK).
 */
class AuditSummarizer
{
    private const MAX_TOKENS = 2048;

    /**
     * Generate the structured summary for a report on behalf of a user.
     *
     * @return array{summary: string, recommendations: array<int, array{title: string, severity: string, action: string}>, model: string, generated_at: string}
     *
     * @throws RuntimeException when the user has no usable key, or Claude auth/rate limits.
     */
    public function summarize(User $user, AuditReport $report): array
    {
        $apiKey = $user->aiApiKey();

        if (! $apiKey) {
            throw new RuntimeException('No Claude API key configured.');
        }

        $model = $user->ai_settings['model'] ?? null;

        if (! in_array($model, config('services.anthropic.models'), true)) {
            throw new RuntimeException('Invalid or unconfigured AI model.');
        }

        $client = new Client(apiKey: $apiKey);

        try {
            $message = $client->messages->create(
                model: $model,
                maxTokens: self::MAX_TOKENS,
                system: [
                    [
                        'type'         => 'text',
                        'text'         => $this->systemPrompt(),
                        'cacheControl' => ['type' => 'ephemeral'],
                    ],
                ],
                messages: [
                    ['role' => 'user', 'content' => $this->reportPayload($report)],
                ],
                outputConfig: [
                    'format' => [
                        'type'   => 'json_schema',
                        'schema' => $this->outputSchema(),
                    ],
                ],
            );
        } catch (\Anthropic\Core\Exceptions\AuthenticationException) {
            throw new RuntimeException('Invalid Claude API key.');
        } catch (\Anthropic\Core\Exceptions\RateLimitException) {
            throw new RuntimeException('Claude API rate limit reached. Try again shortly.');
        } catch (\Anthropic\Core\Exceptions\AnthropicException $e) {
            throw new RuntimeException('Claude API request failed: '.$e->getMessage());
        }

        $data = $this->extractJson($message);

        return [
            'summary'         => $data['summary'] ?? '',
            'recommendations' => $data['recommendations'] ?? [],
            'model'           => $model,
            'generated_at'    => now()->toIso8601String(),
        ];
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
        You are a WordPress site-health analyst for SitePulse. You receive a raw
        audit report for a single WordPress site as JSON, covering site health,
        server/PHP state, security, plugins, and themes.

        Produce a concise, non-technical summary a site owner can act on, plus a
        list of prioritized recommendations. Rules:

        - "summary": 2–4 sentences in plain English describing the site's overall
          health. No jargon dumps; explain what matters and why.
        - "recommendations": each item has a short "title", a "severity" of exactly
          one of "critical", "warning", or "info", and an "action" (one or two
          sentences telling the owner what to do). Order by severity, most severe
          first. Only include real, evidenced issues from the report — do not
          invent problems. If the site is healthy, return an empty list or a single
          "info" item confirming it.
        - Base everything strictly on the provided report data.
        PROMPT;
    }

    private function reportPayload(AuditReport $report): string
    {
        $payload = [
            'audited_at' => $report->audited_at?->toIso8601String(),
            'health'     => $report->health,
            'server'     => $report->server,
            'security'   => $report->security,
            'plugins'    => $report->plugins,
            'themes'     => $report->themes,
        ];

        return "Audit report:\n\n".json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    }

    /**
     * @return array<string, mixed>
     */
    private function outputSchema(): array
    {
        return [
            'type'       => 'object',
            'properties' => [
                'summary'         => ['type' => 'string'],
                'recommendations' => [
                    'type'  => 'array',
                    'items' => [
                        'type'       => 'object',
                        'properties' => [
                            'title'    => ['type' => 'string'],
                            'severity' => ['type' => 'string', 'enum' => ['critical', 'warning', 'info']],
                            'action'   => ['type' => 'string'],
                        ],
                        'required'             => ['title', 'severity', 'action'],
                        'additionalProperties' => false,
                    ],
                ],
            ],
            'required'             => ['summary', 'recommendations'],
            'additionalProperties' => false,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function extractJson(mixed $message): array
    {
        foreach ($message->content as $block) {
            if ($block->type === 'text') {
                $decoded = json_decode($block->text, true);

                if (is_array($decoded)) {
                    return $decoded;
                }
            }
        }

        throw new RuntimeException('Claude returned an unreadable response.');
    }
}

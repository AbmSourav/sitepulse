<?php

namespace App\Ai\Agents;

use App\Ai\Tools\CountIncidents;
use App\Ai\Tools\GetLatestAudit;
use App\Ai\Tools\GetSiteStats;
use App\Ai\Tools\ListSites;
use App\Models\User;
use Laravel\Ai\Contracts\Agent;
use Laravel\Ai\Contracts\Conversational;
use Laravel\Ai\Contracts\HasTools;
use Laravel\Ai\Contracts\Tool;
use Laravel\Ai\Messages\Message;
use Laravel\Ai\Promptable;
use Stringable;

/**
 * The SitePulse conversational assistant.
 *
 * Answers natural-language questions about the user's OWN monitored sites by
 * calling read-only, team-scoped tools. The SDK runs the tool-call loop:
 * prompt -> model requests a tool -> tool queries the DB (team-scoped) ->
 * result fed back -> repeat until the model answers.
 *
 * Multi-turn context is client-driven (stateless server): the caller passes the
 * recent transcript as $history, which the SDK replays (via Conversational)
 * before the current prompt so follow-up questions keep context.
 *
 * Instantiate with the authenticated user so every tool is bound to that
 * user's team: SiteAssistant::make(user: $user, history: [...]).
 */
class SiteAssistant implements Agent, Conversational, HasTools
{
    use Promptable;

    /**
     * @param  Message[]  $history  Prior conversation turns replayed for context.
     */
    public function __construct(public User $user, public array $history = []) {}

    public function instructions(): Stringable|string
    {
        return <<<'TXT'
        You are SitePulse's assistant. SitePulse monitors websites for
        uptime and health. It also audit WordPress websites. You help the user understand the uptime, incidents,
        and audit health of THEIR OWN monitored websites.

        Rules:
        - Answer ONLY from tool results. Never invent numbers, dates, or statuses.
        - If a tool reports that no matching site was found, tell the user plainly;
          do not guess which site they meant.
        - When you refer to a site, use the exact URL the tools return.
        - If a question is outside SitePulse's scope (site uptime, incidents,
          audits, domains, SSL, plugins), say briefly that you can only help with
          their monitored sites.
        - Keep answers short, factual, and plain. Prefer concrete figures
          (e.g. "3 incidents in the last 7 days") over vague summaries.
        TXT;
    }

    /**
     * Prior conversation turns, replayed by the SDK before the current prompt.
     *
     * @return Message[]
     */
    public function messages(): iterable
    {
        return $this->history;
    }

    /** @return Tool[] */
    public function tools(): iterable
    {
        return [
            new ListSites($this->user),
            new GetSiteStats($this->user),
            new CountIncidents($this->user),
            new GetLatestAudit($this->user),
        ];
    }
}

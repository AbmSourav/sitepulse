import { chat as chatRoute } from '@/routes/assistant';
import { edit as profileEdit } from '@/routes/profile';
import { Link, usePage } from '@inertiajs/react';
import { Bot, SendHorizonal, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
};

type Status = 'idle' | 'loading' | 'needs_setup';

// How many prior turns to replay as context (server caps this again).
const HISTORY_LIMIT = 10;

/**
 * Read Laravel's XSRF-TOKEN cookie so a raw fetch can send it back as the
 * X-XSRF-TOKEN header (fetch doesn't do this automatically like axios/Inertia).
 */
function xsrfToken(): string {
    return decodeURIComponent(
        document.cookie
            .split('; ')
            .find((c) => c.startsWith('XSRF-TOKEN='))
            ?.split('=')[1] ?? '',
    );
}

export function AiAssistantSheet() {
    const hasAiKey = usePage().props.hasAiKey;
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<Status>('idle');
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Show the setup prompt (and lock the composer) whenever there's no key on
    // load, or the server reported needs_setup mid-session.
    const showSetup = !hasAiKey || status === 'needs_setup';

    // Keep the transcript pinned to the latest message.
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }, [messages, status]);

    async function send() {
        const message = input.trim();
        if (!message || status === 'loading' || showSetup) {
            return;
        }

        // `messages` still holds the transcript BEFORE this turn (the state
        // update below is async), so it is exactly the history to replay. Cap to
        // the last few turns — the server caps again, this just trims the payload.
        const history = messages.slice(-HISTORY_LIMIT);

        setMessages((prev) => [...prev, { role: 'user', content: message }]);
        setInput('');
        setStatus('loading');

        try {
            const res = await fetch(chatRoute().url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-XSRF-TOKEN': xsrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ message, history }),
            });

            const body = await res.json();

            if (body.needs_setup) {
                setStatus('needs_setup');
            } else if (body.error) {
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: body.error },
                ]);
                setStatus('idle');
            } else {
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: body.reply },
                ]);
                setStatus('idle');
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Could not reach the server. Please try again.',
                },
            ]);
            setStatus('idle');
        }
    }

    function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        // Enter sends; Shift+Enter inserts a newline.
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <button
                    type="button"
                    aria-label="Ask the SitePulse assistant"
                    className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <Sparkles className="h-5 w-5" />
                </button>
            </SheetTrigger>

            <SheetContent
                side="right"
                className="w-full gap-0 sm:max-w-lg"
            >
                <SheetHeader className="border-b border-border">
                    <SheetTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-primary" />
                        SitePulse Assistant
                    </SheetTitle>
                    <SheetDescription>
                        Ask about your sites&rsquo; uptime, incidents, and audits.
                    </SheetDescription>
                </SheetHeader>

                {/* Transcript */}
                <div
                    ref={scrollRef}
                    className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
                >
                    {messages.length === 0 && !showSetup && (
                        <div className="mt-4 rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
                            <p className="mb-2 font-medium text-foreground">
                                Try asking:
                            </p>
                            <ul className="space-y-1">
                                <li>&ldquo;How many incidents did abc.com have in the last 7 days?&rdquo;</li>
                                <li>&ldquo;What&rsquo;s the uptime of my sites?&rdquo;</li>
                                <li>&ldquo;When does my domain expire?&rdquo;</li>
                            </ul>
                        </div>
                    )}

                    {messages.map((m, i) => (
                        <div
                            key={i}
                            className={cn(
                                'flex',
                                m.role === 'user' ? 'justify-end' : 'justify-start',
                            )}
                        >
                            <div
                                className={cn(
                                    'max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm',
                                    m.role === 'user'
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-foreground',
                                )}
                            >
                                {m.content}
                            </div>
                        </div>
                    ))}

                    {status === 'loading' && (
                        <div className="flex justify-start">
                            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                                Thinking&hellip;
                            </div>
                        </div>
                    )}

                    {showSetup && (
                        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
                            <p className="mb-2 font-medium text-foreground">
                                Add your Claude API key to use the assistant.
                            </p>
                            <p className="mb-3 text-muted-foreground">
                                The assistant uses your own Anthropic key. Add it in
                                your profile settings to start chatting.
                            </p>
                            <Button asChild size="sm" variant="outline">
                                <Link href={profileEdit().url}>Go to profile settings</Link>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Composer */}
                <div className="border-t border-border p-4">
                    <div className="flex items-end gap-2">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={onKeyDown}
                            rows={1}
                            placeholder={
                                showSetup
                                    ? 'Add your Claude API key to start…'
                                    : 'Ask about your sites…'
                            }
                            disabled={status === 'loading' || showSetup}
                            className="max-h-32 flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <Button
                            type="button"
                            size="icon"
                            onClick={send}
                            disabled={status === 'loading' || showSetup || input.trim() === ''}
                            aria-label="Send"
                        >
                            <SendHorizonal className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

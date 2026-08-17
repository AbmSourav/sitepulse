import { Head, router, usePage } from '@inertiajs/react';
import { Globe } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import PlanLimitDialog from '@/components/plan-limit-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import WebsiteCard from '@/components/websites/website-card';
import WebsiteStats from '@/components/websites/website-stats';
import type { WebsiteStatsProps } from '@/components/websites/website-stats';
import websiteRoutes from '@/routes/websites';

interface UptimeStat {
    uptime_seconds: number;
    total_seconds: number;
    uptime_percentage: number;
    incident_count: number;
    incidents_7_days: number;
    incidents_30_days: number;
}

interface Team {
    id: number;
    name: string;
}

export default function Websites() {
    const { websites, uptime, teams } = usePage<
        {
            websites: WebsiteStatsProps[];
            uptime: Record<number, UptimeStat | null>;
            teams: Team[];
        } & Record<string, unknown>
    >().props;

    const [addSheetOpen, setAddSheetOpen] = useState(false);
    const [selectedWebsite, setSelectedWebsite] =
        useState<WebsiteStatsProps | null>(null);
    const [url, setUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [planError, setPlanError] = useState<string | null>(null);

    function handleAddMonitor(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);

        router.post(
            websiteRoutes.monitor.url(),
            { url },
            {
                onSuccess: () => {
                    toast.success('Monitoring started');
                    setAddSheetOpen(false);
                    setUrl('');
                },
                onError: (errors) => {
                    if (errors.plan) {
                        setPlanError(errors.plan);
                    } else {
                        const first = Object.values(errors)[0];

                        if (first) {
                            toast.error(first as string);
                        }
                    }
                },
                onFinish: () => setSubmitting(false),
            },
        );
    }

    return (
        <>
            <PlanLimitDialog
                message={planError}
                onClose={() => setPlanError(null)}
            />
            <Head title="Websites" />
            <div className="mt-5 flex h-full flex-1 flex-col gap-4 px-12 py-4">
                <div className="flex items-center justify-between">
                    <Button
                        className="cursor-pointer"
                        onClick={() => setAddSheetOpen(true)}
                    >
                        Add Monitoring
                    </Button>
                </div>

                {websites?.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
                        {websites.map((website) => (
                            <WebsiteCard
                                key={website.id}
                                website={website}
                                uptime={uptime[website.id] ?? null}
                                onSelect={setSelectedWebsite}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
                        <Globe className="mb-3 size-10 opacity-40" />
                        <p className="text-gray-500 dark:text-gray-400">
                            <span>No websites yet.</span>
                            <br />
                            Click <strong>Add Monitoring</strong> to get started.
                        </p>
                    </div>
                )}
            </div>

            <WebsiteStats
                website={selectedWebsite}
                uptime={
                    selectedWebsite
                        ? (uptime[selectedWebsite.id] ?? null)
                        : null
                }
                open={selectedWebsite !== null}
                onClose={() => setSelectedWebsite(null)}
            />

            <Sheet open={addSheetOpen} onOpenChange={setAddSheetOpen}>
                <SheetContent className="sm:max-w-lg">
                    <SheetHeader>
                        <SheetTitle>Add Monitoring</SheetTitle>
                    </SheetHeader>

                    <form
                        onSubmit={handleAddMonitor}
                        className="mt-6 flex flex-col gap-5 px-10"
                    >
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="monitor-url">URL</Label>
                            <Input
                                id="monitor-url"
                                type="url"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                required
                            />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="flex-1 cursor-pointer"
                                onClick={() => setAddSheetOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 cursor-pointer"
                                disabled={submitting}
                            >
                                {submitting ? 'Starting…' : 'Start Monitoring'}
                            </Button>
                        </div>
                    </form>
                </SheetContent>
            </Sheet>
        </>
    );
}

Websites.layout = () => ({
    breadcrumbs: [
        {
            title: 'Websites',
            href: websiteRoutes.index.url(),
        },
    ],
});

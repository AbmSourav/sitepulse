import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Bell, Globe, Mail, Plus, Webhook } from 'lucide-react';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { index as notificationsIndex, store, update, destroy } from '@/routes/notifications';

interface ChannelType {
    value: string;
    label: string;
    description: string;
    config_fields: string[];
    allowed: boolean;
}

interface Channel {
    id: number;
    type: string;
    name: string;
    config: Record<string, string>;
    is_active: boolean;
}

const CHANNEL_ICONS: Record<string, React.ElementType> = {
    slack:   Bell,
    discord: Bell,
    email:   Mail,
    webhook: Webhook,
};

const CHANNEL_FIELD_LABELS: Record<string, string> = {
    webhook_url: 'Webhook URL',
    url:         'URL',
    secret:      'Secret (optional)',
    email:       'Email address',
};

function ChannelIcon({ type, className }: { type: string; className?: string }) {
    const Icon = CHANNEL_ICONS[type] ?? Globe;
    return <Icon className={className} />;
}

function ChannelForm({
    channelType,
    initial,
    onCancel,
    onSave,
    onToggle,
    onDelete,
}: {
    channelType: ChannelType;
    initial?: Channel;
    onCancel: () => void;
    onSave: (name: string, config: Record<string, string>) => void;
    onToggle?: () => void;
    onDelete?: () => void;
}) {
    const [name, setName] = useState(initial?.name ?? '');
    const [config, setConfig] = useState<Record<string, string>>(
        Object.fromEntries(channelType.config_fields.map((f) => [f, initial?.config?.[f] ?? '']))
    );

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        onSave(name, config);
    }

    return (
        <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={`My ${channelType.label}`}
                        required
                        className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 bg-white dark:bg-gray-800"
                    />
                </div>

                {channelType.config_fields.map((field) => (
                    <div key={field}>
                        <label className="block text-sm font-medium mb-1">
                            {CHANNEL_FIELD_LABELS[field] ?? field}
                        </label>
                        <input
                            type={field === 'email' ? 'email' : 'text'}
                            value={config[field] ?? ''}
                            onChange={(e) => setConfig((prev) => ({ ...prev, [field]: e.target.value }))}
                            required={field !== 'secret'}
                            placeholder={field === 'webhook_url' ? 'https://hooks.slack.com/...' : undefined}
                            className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-md px-3 py-1.5 bg-white dark:bg-gray-800"
                        />
                    </div>
                ))}

                <div className="flex justify-end gap-2 pt-1">
                    <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" size="sm" className="cursor-pointer">Save</Button>
                </div>
            </form>

            {initial && (onToggle || onDelete) && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-1">
                    {onToggle && (
                        <button
                            type="button"
                            onClick={onToggle}
                            className={`w-full text-left text-sm px-3 py-2 rounded-md cursor-pointer transition-colors ${
                                initial.is_active
                                    ? 'text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                                    : 'text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                        >
                            {initial.is_active ? 'Deactivate channel' : 'Activate channel'}
                        </button>
                    )}
                    {onDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="w-full text-left text-sm px-3 py-2 rounded-md cursor-pointer text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            Remove channel
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

type SheetView =
    | { mode: 'list'; type: ChannelType }
    | { mode: 'form-add'; type: ChannelType }
    | { mode: 'form-edit'; type: ChannelType; channel: Channel };

export default function Notifications() {
    const { channels, availableTypes } = usePage<{
        channels: Channel[];
        availableTypes: ChannelType[];
    } & Record<string, unknown>>().props;
    console.log(channels, availableTypes)

    const [view, setView] = useState<SheetView | null>(null);

    function openType(type: ChannelType) {
        const existing = channels.filter((ch) => ch.type === type.value);
        setView(existing.length > 0
            ? { mode: 'list', type }
            : { mode: 'form-add', type }
        );
    }

    function closeSheet() {
        setView(null);
    }

    function handleSave(name: string, config: Record<string, string>) {
        if (view?.mode === 'form-edit') {
            router.patch(
                update(view.channel.id).url,
                { name, config },
                { preserveScroll: true, onSuccess: closeSheet }
            );
        } else if (view?.mode === 'form-add') {
            router.post(
                store().url,
                { type: view.type.value, name, config },
                { preserveScroll: true, onSuccess: closeSheet }
            );
        }
    }

    function handleToggle(channel: Channel) {
        router.patch(
            update(channel.id).url,
            { is_active: !channel.is_active },
            { preserveScroll: true, onSuccess: closeSheet }
        );
    }

    function handleDelete(channel: Channel) {
        if (!confirm(`Remove "${channel.name}"?`)) return;
        router.delete(destroy(channel.id).url, { preserveScroll: true, onSuccess: closeSheet });
    }

    const sheetTitle = view
        ? view.mode === 'list'
            ? `${view.type.label} channels`
            : view.mode === 'form-edit'
                ? `Edit ${view.type.label} channel`
                : `Setup ${view.type.label} notification`
        : '';

    return (
        <>
            <Head title="Notification Channels" />

            <div className="px-12 py-4 mt-5 space-y-4">
                <Heading
                    variant="small"
                    title="Notification channels"
                    description="Get alerted when a site goes down or recovers"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {availableTypes.map((type) => (
                        <div
                            key={type.value}
                            onClick={() => type.allowed && openType(type)}
                            className={`relative border rounded-lg p-4 flex flex-col gap-2 ${
                                type.allowed
                                    ? 'cursor-pointer border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors'
                                    : 'border-gray-100 dark:border-gray-800 opacity-60'
                            }`}
                        >
                            {!type.allowed && (
                                <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded">
                                    Pro
                                </span>
                            )}
                            {type.allowed && channels.some((ch) => ch.type === type.value && ch.is_active) && (
                                <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded">
                                    Active
                                </span>
                            )}
                            <div className="flex items-center gap-2">
                                <ChannelIcon type={type.value} className="size-4 text-gray-500 dark:text-gray-400" />
                                <span className="text-sm font-medium">{type.label}</span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{type.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            <Sheet open={view !== null} onOpenChange={(o) => { if (!o) closeSheet(); }}>
                <SheetContent className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>{sheetTitle}</SheetTitle>
                    </SheetHeader>

                    <div className="px-7 mt-2">
                        {view?.mode === 'list' && (() => {
                            const typeChannels = channels.filter((ch) => ch.type === view.type.value);

                            return (
                                <div className="space-y-3">
                                    <div className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        {typeChannels.map((channel) => (
                                            <div key={channel.id} className="flex items-center justify-between px-3 py-2.5 gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium truncate">{channel.name}</p>
                                                    <p className="text-xs text-gray-400">
                                                        {channel.is_active ? 'Active' : 'Inactive'}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="shrink-0 cursor-pointer"
                                                    onClick={() => setView({ mode: 'form-edit', type: view.type, channel })}
                                                >
                                                    Edit
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {(view?.mode === 'form-add' || view?.mode === 'form-edit') && (
                            <ChannelForm
                                channelType={view.type}
                                initial={view.mode === 'form-edit' ? view.channel : undefined}
                                onCancel={() => {
                                    const existing = channels.filter((ch) => ch.type === view.type.value);
                                    setView(existing.length > 0
                                        ? { mode: 'list', type: view.type }
                                        : null
                                    );
                                }}
                                onSave={handleSave}
                                onToggle={view.mode === 'form-edit'
                                    ? () => handleToggle(view.channel)
                                    : undefined
                                }
                                onDelete={view.mode === 'form-edit'
                                    ? () => handleDelete(view.channel)
                                    : undefined
                                }
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}

Notifications.layout = () => ({
    breadcrumbs: [{ title: 'Notification Channels', href: notificationsIndex() }],
});

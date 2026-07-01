import { Form, Head, usePage } from '@inertiajs/react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import AppearanceToggleTab from '@/components/appearance-tabs';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/profile';

interface AiSettings {
    provider: string;
    model: string | null;
    hasApiKey: boolean;
}

const AI_MODELS = [
    { value: 'claude-sonnet-5', label: 'Sonnet 5' },
    { value: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
    { value: 'claude-opus-4-8', label: 'Opus 4.8' },
];

export default function Profile({
    mustVerifyEmail,
    status,
    aiSettings,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    aiSettings: AiSettings;
}) {
    const { auth } = usePage().props;

    return (
        <>
            <Head title="Profile settings" />

            <div className="mt-5 flex max-w-2xl flex-col space-y-10 px-12 py-4">
                <div className="mb-[60px]">
                    <Heading
                        variant="small"
                        title="Profile information"
                        description="Update your name and email address"
                    />

                    <Form
                        action={ProfileController.update.url()}
                        method="patch"
                        options={{
                            preserveScroll: true,
                        }}
                        className="space-y-6"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2 mt-6">
                                    <Label htmlFor="name">Name</Label>

                                    <Input
                                        id="name"
                                        className="mt-1 block w-full"
                                        defaultValue={auth.user.name}
                                        name="name"
                                        required
                                        autoComplete="name"
                                        placeholder="Full name"
                                    />

                                    <InputError
                                        className="mt-2"
                                        message={errors.name}
                                    />
                                </div>

                                {/* Claude AI (optional) */}
                                <div className="space-y-4 border-t border-border pt-6">
                                    <div>
                                        <Label className="text-base">
                                            Claude AI (optional)
                                        </Label>
                                        <p className="text-muted-foreground mt-1 text-sm">
                                            Add your own Anthropic API key to
                                            enable AI audit summaries. You'll
                                            need an{' '}
                                            <strong>Anthropic Console</strong>{' '}
                                            account with billing/credits — this
                                            is separate from a Claude.ai (chat)
                                            subscription, and a free Claude.ai
                                            plan does not include API access.
                                            Create a key at{' '}
                                            <a
                                                href="https://platform.claude.com/settings/keys"
                                                target="_blank"
                                                rel="noreferrer"
                                                className="underline"
                                            >
                                                platform.claude.com/settings/keys
                                            </a>
                                            . Your API key is stored encrypted.
                                        </p>
                                    </div>

                                    <input
                                        type="hidden"
                                        name="ai_settings[provider]"
                                        value="claude"
                                    />

                                    <div className="grid gap-2">
                                        <Label htmlFor="ai_api_key">
                                            Anthropic API key
                                        </Label>

                                        <Input
                                            id="ai_api_key"
                                            type="text"
                                            className="pt-1 block w-full text-gray-700"
                                            name="ai_settings[apiKey]"
                                            autoComplete="off"
                                            value={aiSettings.hasApiKey ? 'sk-ant-################' : ''}
                                            placeholder={
                                                aiSettings.hasApiKey
                                                    ? ''
                                                    : 'API key'
                                            }
                                        />

                                        <InputError
                                            className="mt-2"
                                            message={
                                                errors['ai_settings.apiKey']
                                            }
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="ai_model">Model</Label>

                                        <select
                                            id="ai_model"
                                            name="ai_settings[model]"
                                            defaultValue={aiSettings.model ?? ''}
                                            className="border-input bg-background mt-1 block w-full rounded-md border px-3 py-2 text-sm"
                                        >
                                            <option value="" disabled>
                                                Select a model
                                            </option>
                                            {AI_MODELS.map((m) => (
                                                <option
                                                    key={m.value}
                                                    value={m.value}
                                                >
                                                    {m.label}
                                                </option>
                                            ))}
                                        </select>

                                        <InputError
                                            className="mt-2"
                                            message={
                                                errors['ai_settings.model']
                                            }
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Button
                                        className="cursor-pointer"
                                        disabled={processing}
                                        data-test="update-profile-button"
                                    >
                                        Save
                                    </Button>
                                </div>
                            </>
                        )}
                    </Form>
                </div>

                <div className="mb-[80px]">
                    <h2 className="mb-6 font-medium">Appearance settings</h2>
                    <AppearanceToggleTab />
                </div>

                <DeleteUser />
            </div>
        </>
    );
}

Profile.layout = () => ({
    breadcrumbs: [
        {
            title: 'Profile',
            href: edit(),
        },
    ],
});

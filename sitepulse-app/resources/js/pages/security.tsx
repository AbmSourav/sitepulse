import { Head, useForm } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TwoFactorRecoveryCodes from '@/components/two-factor-recovery-codes';
import TwoFactorSetupModal from '@/components/two-factor-setup-modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useTwoFactorAuth } from '@/hooks/use-two-factor-auth';
import { edit } from '@/routes/security';
import { disable, enable } from '@/routes/two-factor';

type Props = {
    canManageTwoFactor?: boolean;
    requiresConfirmation?: boolean;
    twoFactorEnabled?: boolean;
};

export default function Security({
    canManageTwoFactor = false,
    requiresConfirmation = false,
    twoFactorEnabled = false,
}: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, put, processing, errors, reset } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const {
        qrCodeSvg,
        hasSetupData,
        manualSetupKey,
        clearSetupData,
        clearTwoFactorAuthData,
        fetchSetupData,
        recoveryCodesList,
        fetchRecoveryCodes,
    } = useTwoFactorAuth();
    const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
    const prevTwoFactorEnabled = useRef(twoFactorEnabled);

    useEffect(() => {
        if (prevTwoFactorEnabled.current && !twoFactorEnabled) {
            clearTwoFactorAuthData();
        }

        prevTwoFactorEnabled.current = twoFactorEnabled;
    }, [twoFactorEnabled, clearTwoFactorAuthData]);

    function handleSubmit(e: React.SyntheticEvent) {
        e.preventDefault();
        put(SecurityController.update.url(), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errs) => {
                if (errs.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errs.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    }

    return (
        <>
            <Head title="Security settings" />

            <h1 className="sr-only">Security settings</h1>

            <div className="mt-5 max-w-2xl space-y-6 px-12 py-4">
                <Heading
                    variant="small"
                    title="Update password"
                    description="Ensure your account is using a long, random password to stay secure"
                />

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="current_password">
                            Current password
                        </Label>
                        <PasswordInput
                            id="current_password"
                            ref={currentPasswordInput}
                            name="current_password"
                            value={data.current_password}
                            onChange={(e) =>
                                setData('current_password', e.target.value)
                            }
                            className="mt-1 block w-full"
                            autoComplete="current-password"
                            placeholder="Current password"
                        />
                        <InputError message={errors.current_password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">New password</Label>
                        <PasswordInput
                            id="password"
                            ref={passwordInput}
                            name="password"
                            value={data.password}
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                            className="mt-1 block w-full"
                            autoComplete="new-password"
                            placeholder="New password"
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">
                            Confirm password
                        </Label>
                        <PasswordInput
                            id="password_confirmation"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            className="mt-1 block w-full"
                            autoComplete="new-password"
                            placeholder="Confirm password"
                        />
                        <InputError message={errors.password_confirmation} />
                    </div>

                    <div className="flex items-center gap-4">
                        <Button
                            className="cursor-pointer"
                            disabled={processing}
                            data-test="update-password-button"
                        >
                            Save password
                        </Button>
                    </div>
                </form>
            </div>
        </>
    );
}

Security.layout = () => ({
    breadcrumbs: [
        {
            title: 'Security settings',
            href: edit(),
        },
    ],
});

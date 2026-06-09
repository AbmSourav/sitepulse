import { Head, useForm } from '@inertiajs/react';
import { GoogleAuthButton } from '@/components/google-auth-button';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: true as boolean,
    });

    function handleSubmit(e: React.SyntheticEvent) {
        e.preventDefault();
        post(store.url(), {
            onSuccess: () => reset('password'),
        });
    }

    return (
        <>
            <Head title="Log in" />

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            placeholder="email@example.com"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-center">
                            <Label htmlFor="password">Password</Label>
                            {canResetPassword && (
                                <TextLink
                                    href={request()}
                                    className="ml-auto text-sm"
                                    tabIndex={5}
                                >
                                    Forgot password?
                                </TextLink>
                            )}
                        </div>
                        <PasswordInput
                            id="password"
                            required
                            tabIndex={2}
                            autoComplete="current-password"
                            placeholder="Password"
                            value={data.password}
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="flex items-center space-x-3">
                        <Checkbox
                            id="remember"
                            tabIndex={3}
                            checked={data.remember}
                            onCheckedChange={(checked) =>
                                setData('remember', !!checked)
                            }
                        />
                        <Label htmlFor="remember">Remember me</Label>
                    </div>

                    <Button
                        type="submit"
                        className="mt-4 w-full cursor-pointer"
                        tabIndex={4}
                        disabled={processing}
                        data-test="login-button"
                    >
                        {processing && <Spinner />}
                        Log in
                    </Button>
                </div>

                <GoogleAuthButton />

                {canRegister && (
                    <div className="text-center text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <TextLink
                            className="cursor-pointer text-primary"
                            href={register()}
                            tabIndex={5}
                        >
                            Sign up
                        </TextLink>
                    </div>
                )}
            </form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: '',
    description: '',
};

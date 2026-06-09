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

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage().props;
    console.log(usePage());

    return (
        <>
            <Head title="Profile settings" />

            <div className="mt-5 flex max-w-2xl flex-col space-y-10 px-12 py-4">
                <div className="space-y-6">
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
                                <div className="grid gap-2">
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

                <div className="space-y-6">
                    <Heading
                        variant="small"
                        title="Appearance settings"
                        description=""
                    />
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

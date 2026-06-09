import { router } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { useRef, useState } from 'react';
import InputError from '@/components/input-error';
import PlanLimitDialog from '@/components/plan-limit-dialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { store } from '@/routes/teams';

export default function CreateTeamModal({ children }: PropsWithChildren) {
    const [open, setOpen] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [nameError, setNameError] = useState<string | undefined>();
    const [planError, setPlanError] = useState<string | null>(null);
    const nameRef = useRef<HTMLInputElement>(null);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setProcessing(true);
        setNameError(undefined);

        router.post(
            store.url(),
            { name: nameRef.current?.value ?? '' },
            {
                onSuccess: () => setOpen(false),
                onError: (errors) => {
                    if (errors.plan) {
                        setPlanError(errors.plan);
                    } else if (errors.name) {
                        setNameError(errors.name);
                    }
                },
                onFinish: () => setProcessing(false),
            },
        );
    }

    return (
        <>
            <PlanLimitDialog
                message={planError}
                onClose={() => setPlanError(null)}
            />
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>{children}</DialogTrigger>
                <DialogContent>
                    <form
                        key={String(open)}
                        onSubmit={handleSubmit}
                        className="space-y-6"
                    >
                        <DialogHeader>
                            <DialogTitle>Create a new team</DialogTitle>
                            <DialogDescription>
                                Create a new team to collaborate with others.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-2">
                            <Label htmlFor="name">Team name</Label>
                            <Input
                                id="name"
                                name="name"
                                ref={nameRef}
                                data-test="create-team-name"
                                placeholder="My team"
                                required
                            />
                            <InputError message={nameError} />
                        </div>

                        <DialogFooter className="gap-2">
                            <DialogClose asChild>
                                <Button variant="secondary">Cancel</Button>
                            </DialogClose>

                            <Button
                                type="submit"
                                data-test="create-team-submit"
                                disabled={processing}
                            >
                                Create team
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface PlanLimitDialogProps {
    message: string | null;
    onClose: () => void;
}

export default function PlanLimitDialog({
    message,
    onClose,
}: PlanLimitDialogProps) {
    return (
        <Dialog
            open={!!message}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Plan limit reached</DialogTitle>
                    <DialogDescription>{message}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={onClose}>Okay</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

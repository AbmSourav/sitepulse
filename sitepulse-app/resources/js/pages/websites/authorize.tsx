import { router, usePage } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/websites';

export default function WebsiteAuthorize() {
    const [loading, setLoading] = useState(false);
    const { teams, siteUrl } = usePage().props;
    const hostName = new URL(siteUrl ?? '').hostname;

    function handleTeamChange(id: string) {
        setLoading(true);
        router.post(store.url(), {
            teamId: Number(id),
            siteUrl,
        });
    }

    if (loading) {
        return (
            <div className="mt-10 flex h-full flex-1 flex-col items-center overflow-x-auto rounded-xl p-4">
                <Spinner />
            </div>
        );
    }

    return (
        <>
            <Head title="Website Authorize" />
            <div className="mt-5 flex h-full flex-1 flex-col items-center overflow-x-auto rounded-xl p-4">
                <div className="flex flex-col items-center rounded-lg border border-muted px-[8rem] py-[6rem] shadow-lg">
                    <p className="mb-5 text-gray-700">
                        Add your website to audit list
                    </p>

                    <p className="mb-4 text-gray-500">{hostName}</p>
                    <Select onValueChange={handleTeamChange}>
                        <SelectTrigger className="w-64">
                            <SelectValue placeholder="Select a team" />
                        </SelectTrigger>
                        <SelectContent className="text-black">
                            {teams.map((team, index) => (
                                <SelectItem key={index} value={String(team.id)}>
                                    {team.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </>
    );
}

import AppLogoIcon from '@/components/app-logo-icon';

export default function AppLogo({ size = 14 }: { size?: number }) {
    return (
        <>
            <div className={`flex aspect-square size-${size} items-center justify-center rounded-md text-sidebar-primary-foreground`}>
                <AppLogoIcon className={`fill-current text-white dark:text-black`} />
            </div>
            <div className="ml-1 grid flex-1 text-left text-lg">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    SitePulse
                </span>
            </div>
        </>
    );
}

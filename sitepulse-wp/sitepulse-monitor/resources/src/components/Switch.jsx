import { __ } from '@wordpress/i18n'
import { Button } from '@wordpress/components'

const Switch = () => {

    const handleConnect = () => {
        const currentUrl = window.location.href
        const appUrl = new URL(spmAdmin?.appUrl + '/websites/authorize')
        appUrl.searchParams.append('siteUrl', currentUrl)
        console.log('Redirecting to:', appUrl.toString())

        window.location.href = appUrl.toString()
    }

    const handleDisconnect = () => {

    }

    return (
        <div className="spm-configs">
            {!spmAdmin?.connected && (
                <Button
                    onClick={handleConnect}
                    className="spm-configs__save"
                >
                    {__('connect', 'sitepulse-monitor')}
                </Button>
            )}

            {spmAdmin?.connected && (
                <Button
                    onClick={handleDisconnect}
                    className="spm-configs__disconnect"
                >
                    {__('Disconnect', 'sitepulse-monitor')}
                </Button>
            )}
        </div>
    )
}

export default Switch;

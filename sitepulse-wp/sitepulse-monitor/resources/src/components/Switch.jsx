import { __ } from '@wordpress/i18n'
import { Button } from '@wordpress/components'
import apiFetch from '@wordpress/api-fetch';
import { useState } from 'react';

const Switch = () => {
    const [ connected, setConnected ] = useState(spmAdmin?.connected || false);

    const handleConnect = () => {
        const currentUrl = window.location.href
        const appUrl = new URL(spmAdmin?.appUrl + '/websites/authorize')
        appUrl.searchParams.append('siteUrl', currentUrl)
        console.log('Redirecting to:', appUrl.toString())

        window.location.href = appUrl.toString()
    }

    const handleDisconnect = async () => {
        apiFetch({
            path: '/sitepulse-monitor/v1/disconnect',
            method: 'POST',
        }).then((res) => {
            setConnected(false);
            console.log('Disconnected:', res)
        });
    }

    const handleReconnect = async () => {
        apiFetch({
            path: '/sitepulse-monitor/v1/reconnect',
            method: 'POST',
        }).then((res) => {
            setConnected(true);
            console.log('Connected:', res)
        });
    }

    return (
        <div className="spm-configs">
            {console.log('Connected status:', spmAdmin)}
            {!connected && spmAdmin?.hasApiKey !== '1' && (
                <Button
                    onClick={handleConnect}
                    className="spm-configs__save"
                >
                    {__('connect', 'sitepulse-monitor')}
                </Button>
            )}

            {connected && (
                <Button
                    onClick={handleDisconnect}
                    className="spm-configs__disconnect"
                >
                    {__('Disconnect', 'sitepulse-monitor')}
                </Button>
            )}

            {!connected && spmAdmin?.hasApiKey === '1' && (
                <Button
                    onClick={handleReconnect}
                    className="spm-configs__save"
                >
                    {__('Reconnect', 'sitepulse-monitor')}
                </Button>
            )}
        </div>
    )
}

export default Switch;

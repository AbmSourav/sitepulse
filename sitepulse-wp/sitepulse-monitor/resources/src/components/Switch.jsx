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
        appUrl.searchParams.append('siteBaseUrl', spmAdmin?.siteBaseUrl)
        // console.log(appUrl.toString())

        window.location.href = appUrl.toString()
    }

    const handleDisconnect = async () => {
        apiFetch({
            path: '/sitepulse-monitor/v1/disconnect',
            method: 'POST',
        }).then((res) => {
            setConnected(false);
        });
    }

    const handleReconnect = async () => {
        apiFetch({
            path: '/sitepulse-monitor/v1/reconnect',
            method: 'POST',
        }).then((res) => {
            setConnected(true);
        });
    }

    const handleConnection = () => {
        if (!connected && spmAdmin?.hasApiKey !== '1') {
            handleConnect()
        } else if (!connected && spmAdmin?.hasApiKey === '1') {
            handleReconnect()
        } else if (connected && spmAdmin?.hasApiKey === '1') {
            handleDisconnect()
        }
    }

    let buttonLabel = __('Connect', 'sitepulse-monitor')
    let btnClass = 'spm-conn__btn'
    if (connected && spmAdmin?.hasApiKey === '1') {
        buttonLabel = __('Connected', 'sitepulse-monitor')
        btnClass = 'spm-conn__btn spm-connected'
    } else if (!connected && spmAdmin?.hasApiKey === '1') {
        buttonLabel = __('Reconnect', 'sitepulse-monitor')
    }

    return (
        <div className="spm-conn">
            <Button
                onClick={handleConnection}
                className={btnClass}
            >
                {buttonLabel}
            </Button>
        </div>
    )
}

export default Switch;

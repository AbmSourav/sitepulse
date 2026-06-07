import { useEffect, useState } from 'react'
import { Notice } from '@wordpress/components'

import PageHeader from "./PageHeader";

const Layout = ({ children }) => {
    const [notice, setNotice] = useState({ show: false, type: '', message: '' })

    useEffect(() => {
        if (spmAdmin?.notice) {
            setNotice({ show: true, type: spmAdmin.noticeType, message: spmAdmin.notice })

            // remove query-params after page loaded
            const url = new URL(window.location.href)
            url.searchParams.delete('spmNotice')
            url.searchParams.delete('spmNoticeType')
            window.history.replaceState(null, '', url.toString())
        }
    }, [])

    return (
        <div className="spm-layout">
            <PageHeader />

            <div className="spm-content-wrap">
                {notice.show && (
                    <Notice
                        status={notice.type}
                        isDismissible={true}
                        onRemove={() =>
                            setNotice({ show: false, type: '', message: '' })
                        }
                        className="spm-notice"
                    >
                        {notice.message}
                    </Notice>
                )}

                {children}
            </div>
        </div>
    )
};

export default Layout

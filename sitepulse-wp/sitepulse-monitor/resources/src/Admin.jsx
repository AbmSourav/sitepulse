import { useEffect, useState } from 'react'
import {
    ToggleControl,
    Button,
    Notice,
    TabPanel,
    __experimentalNumberControl as NumberControl,
} from '@wordpress/components'
import { __, sprintf } from '@wordpress/i18n'
import Switch from './components/Switch'
import PageHeader from './components/PageHeader'

const Admin = () => {
    const [showPagination, setShowPagination] = useState(1)
    const [postPerPage, setPostPerPage] = useState(5)
    const [cacheEnabled, setCacheEnabled] = useState(1)
    const [cacheTtl, setCacheTtl] = useState(15)
    const [isSubmitting, setisSubmitting] = useState(false)
    const [isClearingCache, setIsClearingCache] = useState(false)
    const [notice, setNotice] = useState({ show: false, type: '', message: '' })
    const [hasMinPHP, setHasMinPHP] = useState(true)

    useEffect(() => {

    }, [])



    if (hasMinPHP === false) {
        return (
            <Notice
                status={notice.type}
                isDismissible={false}
                onRemove={() =>
                    setNotice({ show: false, type: '', message: '' })
                }
                className="mb-4"
            >
                {notice.message}
            </Notice>
        )
    }

    return (
        <>
            <PageHeader />
            {notice.show && (
                <Notice
                    status={notice.type}
                    isDismissible={true}
                    onRemove={() =>
                        setNotice({ show: false, type: '', message: '' })
                    }
                    className="mb-4"
                >
                    {notice.message}
                </Notice>
            )}

            {/* <Switch /> */}
        </>
    )
}

export default Admin

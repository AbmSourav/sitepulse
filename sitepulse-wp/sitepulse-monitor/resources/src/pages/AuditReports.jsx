import { useState, useEffect, useCallback } from '@wordpress/element'
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
} from '@tanstack/react-table'

import Layout from '../components/Layout'
import Sheet from '../components/Sheet'

const formatDate = (value) => {
    const normalized = value.includes('T') ? value : value.replace(' ', 'T') + 'Z'
    return new Date(normalized).toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        timeZone: 'UTC',
    })
}

const columns = [
    {
        accessorKey: 'audited_at',
        header: 'Date',
        cell: ({ getValue }) => formatDate(getValue()),
    },
    {
        id: 'status',
        header: 'Status',
        cell: ({ row }) =>
            row.original.server?.wp_version?.version ? 'UP' : 'DOWN',
    },
    {
        id: 'wp_version',
        header: 'WP Version',
        cell: ({ row }) => row.original.server?.wp_version?.version ?? '—',
    },
    {
        id: 'ssl',
        header: 'SSL',
        cell: ({ row }) => {
            const ssl = row.original.security?.ssl_valid
            if (ssl === true)  return '✓ Valid'
            if (ssl === false) return '✗ Invalid'
            return '—'
        },
    },
]

const formatBytes = (bytes) => {
    if (!bytes) return '—'
    if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`
    return `${(bytes / 1_048_576).toFixed(1)} MB`
}

const AuditReports = () => {
    const [data, setData]             = useState([])
    const [loading, setLoading]       = useState(true)
    const [error, setError]           = useState(null)
    const [selected, setSelected]     = useState(null)
    const [sheetOpen, setSheetOpen]   = useState(false)

    const fetchReports = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const body = new FormData()
            body.append('action', 'spm_get_audit_reports')
            body.append('nonce', spmAdmin.nonce)
            body.append('page', 1)

            const res  = await fetch(spmAdmin.ajaxUrl, { method: 'POST', body })
            const json = await res.json()

            if (!json.success) throw new Error(json.data?.message ?? 'Unknown error')

            setData(json.data?.data ?? [])
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (spmAdmin?.connected) {
            fetchReports()
        }
    }, [])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <Layout>
            <h2 className="spm-page-title">Audit Reports</h2>

            <div className="spm-content">
                {spmAdmin?.connected && loading && <p>Loading audit reports…</p>}

                {!loading && !error && (
                    <div className="spm-table-wrap">
                        <table className="spm-table">
                            <thead>
                                {table.getHeaderGroups().map((hg) => (
                                    <tr key={hg.id}>
                                        {hg.headers.map((header) => (
                                            <th key={header.id}>
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>

                            <tbody>
                                {table.getRowModel().rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={columns.length}>No audit reports found.</td>
                                    </tr>
                                ) : (
                                    table.getRowModel().rows.map((row) => (
                                        <tr
                                            key={row.id}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => { setSelected(row.original); setSheetOpen(true) }}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <td key={cell.id}>
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Sheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                title="Audit Report"
            >
                {selected && (
                    <div className="spm-sheet-sections">
                        <div className="spm-sheet-section">
                            <h4>Server</h4>
                            <div className="spm-sheet-row"><span>WordPress</span><span>{selected.server?.wp_version?.version ?? '—'}</span></div>
                            <div className="spm-sheet-row"><span>PHP</span><span>{selected.server?.php_version?.version ?? '—'}</span></div>
                            <div className="spm-sheet-row"><span>MySQL</span><span>{selected.server?.sql_server?.version ?? '—'}</span></div>
                            <div className="spm-sheet-row"><span>Database size</span><span>{formatBytes(selected.server?.db_size_bytes)}</span></div>
                        </div>

                        <div className="spm-sheet-section">
                            <h4>Security</h4>
                            <div className="spm-sheet-row">
                                <span>SSL</span>
                                <span>
                                    {selected.security?.ssl_valid === true ? '✓ Valid'
                                        : selected.security?.ssl_valid === false ? '✗ Invalid'
                                        : '—'}
                                </span>
                            </div>
                            {selected.security?.ssl_expires_at && (
                                <div className="spm-sheet-row"><span>SSL expires</span><span>{selected.security.ssl_expires_at}</span></div>
                            )}
                        </div>

                        <div className="spm-sheet-section">
                            <h4>Health</h4>
                            <div className="spm-sheet-row"><span>Cron</span><span>{selected.health?.cron_status ?? '—'}</span></div>
                            <div className="spm-sheet-row"><span>Debug mode</span><span>{selected.health?.debug_mode ? 'On' : 'Off'}</span></div>
                            {selected.health?.admin_email && (
                                <div className="spm-sheet-row"><span>Admin email</span><span>{selected.health.admin_email}</span></div>
                            )}
                            {selected.health?.locale && (
                                <div className="spm-sheet-row"><span>Locale</span><span>{selected.health.locale}</span></div>
                            )}
                        </div>

                        <div className="spm-sheet-section">
                            <h4>Plugins <small>({selected.plugins?.total ?? 0} total{(selected.plugins?.outdated ?? 0) > 0 ? `, ${selected.plugins.outdated} outdated` : ''})</small></h4>
                            {(selected.plugins?.items ?? []).filter(plugin => plugin.require_update).map((plugin, i) => (
                                <div key={i} className="spm-sheet-plugin">
                                    <span>{plugin.name}</span>
                                    <span className="spm-sheet-plugin-meta">
                                        {plugin.installed_version} → {plugin.latest_version} ⚠
                                    </span>
                                </div>
                            ))}
                        </div>

                        <div className="spm-sheet-section">
                            <h4>Themes <small>({selected.themes?.total ?? 0} total{(selected.themes?.outdated ?? 0) > 0 ? `, ${selected.themes.outdated} outdated` : ''})</small></h4>
                            {(selected.themes?.items ?? []).filter(theme => theme.require_update).map((theme, i) => (
                                <div key={i} className="spm-sheet-plugin">
                                    <span>{theme.name}</span>
                                    <span className="spm-sheet-plugin-meta">
                                        {theme.installed_version} → {theme.latest_version} ⚠
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </Sheet>
        </Layout>
    )
}

export default AuditReports

import { useState, useEffect, useCallback } from '@wordpress/element'
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
} from '@tanstack/react-table'

import Layout from '../components/Layout'

const formatDate = (value) => {
    const normalized = value.includes('T') ? value : value.replace(' ', 'T') + 'Z'
    const d = new Date(normalized)
    return d.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
    })
}

const formatDuration = (started_at, resolved_at) => {
    if (!resolved_at) return 'Ongoing'

    const ms      = new Date(resolved_at).getTime() - new Date(started_at).getTime()
    const minutes = Math.floor(ms / 60000)
    const hours   = Math.floor(minutes / 60)
    const days    = Math.floor(hours / 24)

    if (days > 0) return `${days}d ${hours % 24}h`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
}

const columns = [
    {
        accessorKey: 'started_at',
        header: 'Started',
        cell: ({ getValue }) => formatDate(getValue()),
    },
    {
        accessorKey: 'resolved_at',
        header: 'Resolved',
        cell: ({ getValue }) => {
            const v = getValue()
            return v ? formatDate(v) : '—'
        },
    },
    {
        id: 'duration',
        header: 'Duration',
        cell: ({ row }) => formatDuration(row.original.started_at, row.original.resolved_at),
    },
    {
        accessorKey: 'reason',
        header: 'Reason',
        cell: ({ getValue }) => getValue() ?? '—',
    },
    {
        accessorKey: 'http_status',
        header: 'HTTP Status',
        cell: ({ getValue }) => getValue() ?? '—',
    },
]

const Incidents = () => {
    const [data, setData]       = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState(null)

    const fetchIncidents = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const body = new FormData()
            body.append('action', 'spm_get_incidents')
            body.append('nonce', spmAdmin.nonce)
            body.append('page', 1)

            const res  = await fetch(spmAdmin.ajaxUrl, { method: 'POST', body })
            const json = await res.json()

            if (!json.success) throw new Error(json.data?.message ?? 'Unknown error')

            console.log('Fetched incidents:', json.data?.data ?? [])

            setData(json.data?.data ?? [])
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (spmAdmin?.connected) {
            fetchIncidents()
        }
    }, [])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    })

    return (
        <Layout>
            <h2 className="spm-page-title">Incidents</h2>

            <div className="spm-content">
                {spmAdmin?.connected && loading && <p>Loading incidents…</p>}

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
                                        <td colSpan={columns.length}>No incidents found.</td>
                                    </tr>
                                ) : (
                                    table.getRowModel().rows.map((row) => (
                                        <tr key={row.id}>
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
        </Layout>
    )
}

export default Incidents

import { useEffect, useState } from '@wordpress/element'
import Layout from '../components/Layout'

const Home = () => {
    const [stats, setStats]     = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState(null)

    useEffect(() => {
        const body = new FormData()
        body.append('action', 'spm_get_stats')
        body.append('nonce', spmAdmin.nonce)

        fetch(spmAdmin.ajaxUrl, { method: 'POST', body })
            .then((res) => res.json())
            .then((json) => {
                if (!json.success) throw new Error(json.data?.message ?? 'Unknown error')
                setStats(json.data)
            })
            .catch((e) => setError(e.message))
            .finally(() => setLoading(false))
    }, [])

    const formatDowntime = (minutes) => {
        if (minutes < 60) return `${minutes}m`
        const h = Math.floor(minutes / 60)
        const m = minutes % 60
        return m > 0 ? `${h}h ${m}m` : `${h}h`
    }

    return (
        <Layout>
            <div className="spm-stats">
                {loading && <p>Loading stats…</p>}

                {stats   && (
                    <div className="spm-stats-grid">
                        <div className="spm-stat-card">
                            <span className="spm-stat-label">7 days Uptime</span>
                            <span className="spm-stat-value">{stats.uptime_7d}%</span>
                        </div>
                        <div className="spm-stat-card">
                            <span className="spm-stat-label">7 days Downtime</span>
                            <span className="spm-stat-value">{formatDowntime(stats.downtime_minutes_7d)}</span>
                        </div>
                        <div className="spm-stat-card">
                            <span className="spm-stat-label">30 days Incidents</span>
                            <span className="spm-stat-value">{stats.incidents_30d}</span>
                        </div>
                        <div className="spm-stat-card">
                            <span className="spm-stat-label">7 days Incidents</span>
                            <span className="spm-stat-value">{stats.incidents_7d}</span>
                        </div>
                        <div className="spm-stat-card">
                            <span className="spm-stat-label">Last checked</span>
                            <span className="spm-stat-value">
                                {stats.last_checked_at
                                    ? `${Math.floor((Date.now() - new Date(stats.last_checked_at).getTime()) / 60000)} minutes ago`
                                    : '—'}
                            </span>
                        </div>
                        <div className="spm-stat-card">
                            <span className="spm-stat-label">Domain expires</span>
                            <span className={`spm-stat-value ${stats.domain_expiring_soon ? 'spm-stat-warning' : ''}`}>
                                {stats.domain_expires_at ?? '—'}
                                {stats.domain_expiring_soon && ' ⚠'}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}

export default Home

import Home from './pages/Home'
import Incidents from './pages/Incidents'
import AuditReports from './pages/AuditReports'

const routeList = [
    { path: 'sitepulse-monitor',      component: Home },
    { path: 'sitepulse-incidents',    component: Incidents },
    { path: 'sitepulse-audit-reports', component: AuditReports },
]

export default function route() {
    const params = new URLSearchParams(window.location.search)
    const page   = params.get('page')

    const match = routeList.find(rotue => rotue.path === page)

    return match ? match.component : Home
}

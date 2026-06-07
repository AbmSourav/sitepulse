import { createRoot } from '@wordpress/element'

import route from './route'
import './style.scss'

console.log('Container found:')
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('#spm-container')

    if (container) {
        const Page = route()
        const root = createRoot(container)
        root.render(<Page />)
    } else {
        console.error('Container #spm-container not found!')
    }
})

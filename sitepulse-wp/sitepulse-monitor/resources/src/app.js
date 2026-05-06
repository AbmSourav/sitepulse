import { createRoot } from '@wordpress/element'

import Admin from './Admin'
import './style.scss'

document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('#spm-container')

    if (container) {
        const root = createRoot(container)
        root.render(<Admin />)
    } else {
        console.error('Container #spm-container not found!')
    }
})

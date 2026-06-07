import { useEffect } from '@wordpress/element'
import { createPortal } from 'react-dom'

const Sheet = ({ open, onClose, title, children }) => {
    useEffect(() => {
        const onKey = (e) => { if (e.key === 'Escape') onClose() }
        if (open) document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open, onClose])

    if (!open) return null

    return createPortal(
        <div className="spm-sheet-overlay" onClick={onClose}>
            <div className="spm-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="spm-sheet-header">
                    <h3 className="spm-sheet-title">{title}</h3>
                    <button className="spm-sheet-close" onClick={onClose}>✕</button>
                </div>
                <div className="spm-sheet-body">{children}</div>
            </div>
        </div>,
        document.body
    )
}

export default Sheet

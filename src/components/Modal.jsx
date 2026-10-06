import { useEffect } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, title, onClose, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className={`modal ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : ''}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Please wait...' : confirmLabel}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  )
}

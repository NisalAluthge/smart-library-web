import { useEffect, useState } from 'react'
import { Ban, CheckCircle2 } from 'lucide-react'
import Modal from './Modal'
import Alert from './Alert'
import { supabase } from '../lib/supabase'
import { DEVICE_ID } from '../lib/config'
import { formatDate, formatMoney, friendlyError } from '../lib/format'
import { useKioskSession } from '../context/KioskSessionContext'

// Borrow flow: enter/select a book code -> checks -> result
export default function BorrowDialog({ open, initialCode = '', onClose, onBorrowed }) {
  const { rfid } = useKioskSession()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (open) {
      setCode(initialCode)
      setError('')
      setResult(null)
      setBusy(false)
    }
  }, [open, initialCode])

  async function submit(e) {
    e.preventDefault()
    if (!code.trim()) {
      setError('Please enter a book code.')
      return
    }
    setBusy(true)
    setError('')
    const { data, error: err } = await supabase.rpc('kiosk_borrow', {
      p_rfid: rfid,
      p_book_code: code.trim(),
      p_device_id: DEVICE_ID,
    })
    setBusy(false)

    if (err) {
      setError(friendlyError(err))
      return
    }
    if (data.ok) {
      setResult(data)
      onBorrowed?.()
    } else if (data.code === 'UNPAID_FINE') {
      setResult(data)
    } else {
      setError(data.message)
    }
  }

  // ---- Success ----
  if (result?.ok) {
    return (
      <Modal
        open={open}
        title="Borrow successful"
        onClose={onClose}
        footer={<button className="btn" onClick={onClose}>Done</button>}
      >
        <div className="result result-success">
          <CheckCircle2 size={56} />
          <h3>{result.title}</h3>
          <p className="muted">Book Code: {result.book_code}</p>
          <div className="result-dates">
            <div>
              <small>Borrowed</small>
              <strong>{formatDate(result.borrowed_at)}</strong>
            </div>
            <div>
              <small>Due</small>
              <strong>{formatDate(result.due_date)}</strong>
            </div>
          </div>
        </div>
      </Modal>
    )
  }

  // ---- Blocked by fine ----
  if (result?.code === 'UNPAID_FINE') {
    return (
      <Modal
        open={open}
        title="BORROWING BLOCKED"
        onClose={onClose}
        footer={<button className="btn" onClick={onClose}>OK</button>}
      >
        <div className="result result-blocked">
          <Ban size={56} />
          <p>You have an unpaid library fine.</p>
          <small className="muted">Outstanding Fine</small>
          <strong className="big-amount">{formatMoney(result.fine_amount)}</strong>
          <p className="muted">Please settle your fine before borrowing another book.</p>
        </div>
      </Modal>
    )
  }

  // ---- Form ----
  return (
    <Modal open={open} title="Borrow a book" onClose={onClose}>
      <form onSubmit={submit} className="form">
        <Alert type="error">{error}</Alert>
        <label className="field">
          <span>Book code</span>
          <input
            className="input input-lg"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. 1001"
            autoFocus
            inputMode="text"
          />
          <small className="muted">The code is printed on the book label.</small>
        </label>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={busy}>
            {busy ? 'Checking...' : 'Borrow'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

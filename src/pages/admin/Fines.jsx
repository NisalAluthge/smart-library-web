import { useCallback, useEffect, useMemo, useState } from 'react'
import { BadgeCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh'
import PageHeader from '../../components/PageHeader'
import SearchBox from '../../components/SearchBox'
import { ConfirmDialog } from '../../components/Modal'
import Loading from '../../components/Loading'
import Alert from '../../components/Alert'
import StatusBadge from '../../components/StatusBadge'
import { formatDate, formatMoney, friendlyError } from '../../lib/format'

export default function Fines() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [toPay, setToPay] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('fines')
      .select(
        'id, amount, fine_status, created_at, paid_at, students(name, student_id), borrowings(book_copies(book_code, books(title)))'
      )
      .order('created_at', { ascending: false })
    if (err) setError(friendlyError(err))
    else setRows(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useRealtimeRefresh(['fines'], load)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((f) => {
      if (filter !== 'ALL' && f.fine_status !== filter) return false
      if (!q) return true
      return [f.students?.name, f.students?.student_id, f.borrowings?.book_copies?.books?.title].some(
        (v) => (v || '').toLowerCase().includes(q)
      )
    })
  }, [rows, query, filter])

  async function markPaid() {
    setBusy(true)
    setError('')
    const { error: err } = await supabase
      .from('fines')
      .update({ fine_status: 'PAID', paid_at: new Date().toISOString() })
      .eq('id', toPay.id)
    setBusy(false)
    setToPay(null)
    if (err) setError(friendlyError(err))
    else {
      setSuccess('Fine marked as paid.')
      load()
    }
  }

  return (
    <div className="stack">
      <PageHeader title="Fines" subtitle="Overdue fines and payments" />
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      <div className="toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="Search student or book" />
        <select
          className="input select-inline"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="ALL">All fines</option>
          <option value="UNPAID">Unpaid</option>
          <option value="PAID">Paid</option>
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student</th><th>Book</th><th>Amount</th><th>Status</th>
                  <th>Created</th><th>Paid</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan="7" className="empty">No fines found.</td></tr>
                )}
                {filtered.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <strong>{f.students?.name}</strong>
                      <br /><small className="muted">{f.students?.student_id}</small>
                    </td>
                    <td>{f.borrowings?.book_copies?.books?.title}</td>
                    <td>{formatMoney(f.amount)}</td>
                    <td><StatusBadge status={f.fine_status} /></td>
                    <td>{formatDate(f.created_at)}</td>
                    <td>{formatDate(f.paid_at)}</td>
                    <td className="row-actions">
                      {f.fine_status === 'UNPAID' && (
                        <button className="btn btn-sm" onClick={() => setToPay(f)}>
                          <BadgeCheck size={15} /> Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!toPay}
        title="Mark fine as paid"
        message={`Confirm that ${toPay?.students?.name} has paid ${formatMoney(toPay?.amount)}?`}
        confirmLabel="Mark as paid"
        busy={busy}
        onConfirm={markPaid}
        onCancel={() => setToPay(null)}
      />
    </div>
  )
}

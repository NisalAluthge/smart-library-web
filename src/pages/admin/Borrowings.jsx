import { useCallback, useEffect, useMemo, useState } from 'react'
import { Undo2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh'
import PageHeader from '../../components/PageHeader'
import SearchBox from '../../components/SearchBox'
import { ConfirmDialog } from '../../components/Modal'
import Loading from '../../components/Loading'
import Alert from '../../components/Alert'
import StatusBadge from '../../components/StatusBadge'
import { formatDate, formatMoney, friendlyError, loanState } from '../../lib/format'

export default function Borrowings() {
  const [rows, setRows] = useState([])
  const [reminderDays, setReminderDays] = useState(3)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [toReturn, setToReturn] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [b, s] = await Promise.all([
      supabase
        .from('borrowings')
        .select(
          'id, borrowed_at, due_date, returned_at, status, students(name, student_id), book_copies(book_code, books(title))'
        )
        .order('borrowed_at', { ascending: false }),
      supabase.from('library_settings').select('reminder_days_before').order('id').limit(1).maybeSingle(),
    ])
    if (b.error) setError(friendlyError(b.error))
    else setRows(b.data)
    if (s.data) setReminderDays(s.data.reminder_days_before)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useRealtimeRefresh(['borrowings'], load)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      const state = loanState(r, reminderDays)
      if (filter === 'BORROWED' && r.status !== 'BORROWED') return false
      if (filter === 'RETURNED' && r.status !== 'RETURNED') return false
      if (filter === 'OVERDUE' && state !== 'OVERDUE') return false
      if (!q) return true
      return [r.students?.name, r.students?.student_id, r.book_copies?.book_code, r.book_copies?.books?.title].some(
        (v) => (v || '').toLowerCase().includes(q)
      )
    })
  }, [rows, query, filter, reminderDays])

  async function doReturn() {
    setBusy(true)
    setError('')
    setSuccess('')
    const { data, error: err } = await supabase.rpc('admin_return_book', {
      p_borrowing_id: toReturn.id,
    })
    setBusy(false)
    setToReturn(null)

    if (err) setError(friendlyError(err))
    else if (!data.ok) setError(data.message)
    else {
      setSuccess(
        data.fine_amount > 0
          ? `Book returned. It was ${data.late_days} day(s) late - a fine of ${formatMoney(data.fine_amount)} was created.`
          : 'Book returned successfully.'
      )
      load()
    }
  }

  return (
    <div className="stack">
      <PageHeader title="Borrowings" subtitle="All borrowing records and returns" />
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      <div className="toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="Search student, book or code" />
        <select
          className="input select-inline"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter"
        >
          <option value="ALL">All records</option>
          <option value="BORROWED">Currently borrowed</option>
          <option value="OVERDUE">Overdue</option>
          <option value="RETURNED">Returned</option>
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
                  <th>Student</th>
                  <th>Book</th>
                  <th>Code</th>
                  <th>Borrowed</th>
                  <th>Due</th>
                  <th>Returned</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan="8" className="empty">No borrowing records.</td></tr>
                )}
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.students?.name}</strong>
                      <br /><small className="muted">{r.students?.student_id}</small>
                    </td>
                    <td>{r.book_copies?.books?.title}</td>
                    <td>{r.book_copies?.book_code}</td>
                    <td>{formatDate(r.borrowed_at)}</td>
                    <td>{formatDate(r.due_date)}</td>
                    <td>{formatDate(r.returned_at)}</td>
                    <td><StatusBadge status={loanState(r, reminderDays)} /></td>
                    <td className="row-actions">
                      {r.status === 'BORROWED' && (
                        <button className="btn btn-sm" onClick={() => setToReturn(r)}>
                          <Undo2 size={15} /> Return
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
        open={!!toReturn}
        title="Process return"
        message={`Mark "${toReturn?.book_copies?.books?.title}" (code ${toReturn?.book_copies?.book_code}) as returned by ${toReturn?.students?.name}? A fine is calculated automatically if it is overdue.`}
        confirmLabel="Confirm return"
        busy={busy}
        onConfirm={doReturn}
        onCancel={() => setToReturn(null)}
      />
    </div>
  )
}

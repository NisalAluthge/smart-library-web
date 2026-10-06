import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import useKioskRpc from '../../hooks/useKioskRpc'
import PageHeader from '../../components/PageHeader'
import Loading from '../../components/Loading'
import Alert from '../../components/Alert'
import StatusBadge from '../../components/StatusBadge'
import { formatDate, loanState } from '../../lib/format'

export default function MyBooks() {
  const { data, loading, error } = useKioskRpc('kiosk_my_borrowings')
  const [reminderDays, setReminderDays] = useState(3)

  useEffect(() => {
    supabase.rpc('kiosk_settings').then(({ data: s }) => {
      if (s?.reminder_days_before != null) setReminderDays(s.reminder_days_before)
    })
  }, [])

  if (loading) return <Loading />

  const rows = data || []
  return (
    <div className="stack">
      <PageHeader title="My Books" subtitle="Books you have borrowed" />
      <Alert type="error">{error}</Alert>
      <div className="card table-card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Book</th>
                <th>Code</th>
                <th>Borrowed</th>
                <th>Due</th>
                <th>Returned</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan="6" className="empty">You have not borrowed any books yet.</td></tr>
              )}
              {rows.map((b) => (
                <tr key={b.id}>
                  <td><strong>{b.title}</strong><br /><small className="muted">{b.author}</small></td>
                  <td>{b.book_code}</td>
                  <td>{formatDate(b.borrowed_at)}</td>
                  <td>{formatDate(b.due_date)}</td>
                  <td>{formatDate(b.returned_at)}</td>
                  <td><StatusBadge status={loanState(b, reminderDays)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { Radio } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh'
import PageHeader from '../../components/PageHeader'
import Loading from '../../components/Loading'
import Alert from '../../components/Alert'
import StatusBadge from '../../components/StatusBadge'
import { formatDateTime, friendlyError } from '../../lib/format'

export default function Activity() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('library_activity')
      .select('id, action, timestamp, device_id, students(name, student_id), book_copies(book_code, books(title))')
      .order('timestamp', { ascending: false })
      .limit(200)
    if (err) setError(friendlyError(err))
    else {
      setError('')
      setRows(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // new rows appear without refreshing the page
  useRealtimeRefresh(['library_activity'], load)

  return (
    <div className="stack">
      <PageHeader title="Library Activity" subtitle="Live log of borrowings and returns">
        <span className="live-pill"><Radio size={15} /> Live</span>
      </PageHeader>
      <Alert type="error">{error}</Alert>

      {loading ? (
        <Loading />
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Time</th><th>Student</th><th>Book</th><th>Action</th><th>Device ID</th></tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan="5" className="empty">No activity yet.</td></tr>
                )}
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td>{formatDateTime(a.timestamp)}</td>
                    <td>
                      <strong>{a.students?.name || '—'}</strong>
                      <br /><small className="muted">{a.students?.student_id}</small>
                    </td>
                    <td>
                      {a.book_copies?.books?.title || '—'}
                      <br /><small className="muted">Code {a.book_copies?.book_code}</small>
                    </td>
                    <td><StatusBadge status={a.action} /></td>
                    <td>{a.device_id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

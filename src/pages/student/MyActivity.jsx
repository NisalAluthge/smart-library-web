import useKioskRpc from '../../hooks/useKioskRpc'
import PageHeader from '../../components/PageHeader'
import Loading from '../../components/Loading'
import Alert from '../../components/Alert'
import StatusBadge from '../../components/StatusBadge'
import { formatDateTime } from '../../lib/format'

export default function MyActivity() {
  const { data, loading, error } = useKioskRpc('kiosk_my_activity')
  if (loading) return <Loading />

  const rows = data || []
  return (
    <div className="stack">
      <PageHeader title="My Activity" subtitle="Your recent library activity" />
      <Alert type="error">{error}</Alert>
      <div className="card table-card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Book</th>
                <th>Code</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan="4" className="empty">No activity yet.</td></tr>
              )}
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>{formatDateTime(a.timestamp)}</td>
                  <td>{a.title || '—'}</td>
                  <td>{a.book_code || '—'}</td>
                  <td><StatusBadge status={a.action} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

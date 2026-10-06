import useKioskRpc from '../../hooks/useKioskRpc'
import PageHeader from '../../components/PageHeader'
import Loading from '../../components/Loading'
import Alert from '../../components/Alert'
import StatusBadge from '../../components/StatusBadge'
import { formatDate, formatMoney } from '../../lib/format'

export default function MyFines() {
  const { data, loading, error } = useKioskRpc('kiosk_my_fines')
  if (loading) return <Loading />

  const rows = data || []
  const unpaid = rows
    .filter((f) => f.fine_status === 'UNPAID')
    .reduce((sum, f) => sum + Number(f.amount), 0)

  return (
    <div className="stack">
      <PageHeader title="My Fines" subtitle="Library fines on your account" />
      <Alert type="error">{error}</Alert>

      {unpaid > 0 ? (
        <Alert type="error">
          Outstanding fine: <strong>{formatMoney(unpaid)}</strong>. Please settle your fine before
          borrowing another book.
        </Alert>
      ) : (
        <Alert type="success">You have no unpaid fines.</Alert>
      )}

      <div className="card table-card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Book</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Paid</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan="5" className="empty">No fines.</td></tr>
              )}
              {rows.map((f) => (
                <tr key={f.id}>
                  <td><strong>{f.title}</strong><br /><small className="muted">Code {f.book_code}</small></td>
                  <td>{formatMoney(f.amount)}</td>
                  <td><StatusBadge status={f.fine_status} /></td>
                  <td>{formatDate(f.created_at)}</td>
                  <td>{formatDate(f.paid_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

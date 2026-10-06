import { useCallback, useEffect, useState } from 'react'
import { Users, BookOpen, Copy, CheckCircle2, ArrowLeftRight, AlertTriangle, Receipt } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh'
import PageHeader from '../../components/PageHeader'
import Loading from '../../components/Loading'
import Alert from '../../components/Alert'
import StatusBadge from '../../components/StatusBadge'
import { formatDateTime, formatMoney, friendlyError } from '../../lib/format'

const count = (q) => q.then(({ count: c, error }) => {
  if (error) throw error
  return c ?? 0
})
const head = { count: 'exact', head: true }

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const [students, books, copies, available, borrowed, overdue, fines, activity] =
        await Promise.all([
          count(supabase.from('students').select('id', head)),
          count(supabase.from('books').select('id', head)),
          count(supabase.from('book_copies').select('id', head)),
          count(supabase.from('book_copies').select('id', head).eq('status', 'AVAILABLE')),
          count(supabase.from('borrowings').select('id', head).eq('status', 'BORROWED')),
          count(
            supabase
              .from('borrowings')
              .select('id', head)
              .eq('status', 'BORROWED')
              .lt('due_date', new Date().toISOString())
          ),
          supabase.from('fines').select('amount').eq('fine_status', 'UNPAID'),
          supabase
            .from('library_activity')
            .select('id, action, timestamp, students(name), book_copies(book_code, books(title))')
            .order('timestamp', { ascending: false })
            .limit(8),
        ])
      if (fines.error) throw fines.error
      if (activity.error) throw activity.error

      setStats({
        students,
        books,
        copies,
        available,
        borrowed,
        overdue,
        unpaidCount: fines.data.length,
        unpaidTotal: fines.data.reduce((s, f) => s + Number(f.amount), 0),
      })
      setRecent(activity.data)
      setError('')
    } catch (err) {
      setError(friendlyError(err))
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // The dashboard updates by itself when something happens at the kiosk
  useRealtimeRefresh(['library_activity', 'borrowings', 'book_copies', 'fines', 'students'], load)

  const cards = stats && [
    { label: 'Total Students', value: stats.students, icon: Users, color: 'blue' },
    { label: 'Total Books', value: stats.books, icon: BookOpen, color: 'indigo' },
    { label: 'Total Copies', value: stats.copies, icon: Copy, color: 'indigo' },
    { label: 'Available Copies', value: stats.available, icon: CheckCircle2, color: 'green' },
    { label: 'Currently Borrowed', value: stats.borrowed, icon: ArrowLeftRight, color: 'blue' },
    { label: 'Overdue Books', value: stats.overdue, icon: AlertTriangle, color: 'red' },
    {
      label: 'Unpaid Fines',
      value: stats.unpaidCount,
      sub: formatMoney(stats.unpaidTotal),
      icon: Receipt,
      color: 'amber',
    },
  ]

  return (
    <div className="stack">
      <PageHeader title="Dashboard" subtitle="Live overview of the library" />
      <Alert type="error">{error}</Alert>

      {!stats && !error ? (
        <Loading />
      ) : (
        stats && (
          <div className="stat-grid">
            {cards.map(({ label, value, sub, icon: Icon, color }) => (
              <div className="card stat-card" key={label}>
                <span className={`stat-icon ${color}`}><Icon size={22} /></span>
                <div>
                  <small>{label}</small>
                  <strong>{value}</strong>
                  {sub && <small className="muted">{sub}</small>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <div className="card">
        <h2>Recent activity</h2>
        <ul className="plain-list">
          {recent.length === 0 && <li className="empty">No activity yet.</li>}
          {recent.map((a) => (
            <li key={a.id}>
              <div>
                <strong>{a.students?.name || 'Unknown student'}</strong>{' '}
                {a.action === 'BORROW' ? 'borrowed' : 'returned'}{' '}
                <strong>{a.book_copies?.books?.title || 'a book'}</strong>
                <small className="muted">{formatDateTime(a.timestamp)}</small>
              </div>
              <StatusBadge status={a.action} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

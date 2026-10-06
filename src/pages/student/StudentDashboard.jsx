import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, BookMarked, Receipt, History, LogOut, Clock, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useKioskSession } from '../../context/KioskSessionContext'
import useKioskRpc from '../../hooks/useKioskRpc'
import Loading from '../../components/Loading'
import Alert from '../../components/Alert'
import StatusBadge from '../../components/StatusBadge'
import { formatDate, formatMoney, loanState } from '../../lib/format'

export default function StudentDashboard() {
  const { student, endSession } = useKioskSession()
  const borrowings = useKioskRpc('kiosk_my_borrowings')
  const fines = useKioskRpc('kiosk_my_fines')
  const [reminderDays, setReminderDays] = useState(3)

  // reminder days come from library_settings (not hard-coded)
  useEffect(() => {
    supabase.rpc('kiosk_settings').then(({ data }) => {
      if (data?.reminder_days_before != null) setReminderDays(data.reminder_days_before)
    })
  }, [])

  if (borrowings.loading || fines.loading) return <Loading />

  const current = (borrowings.data || []).filter((b) => b.status === 'BORROWED')
  const dueSoon = current.filter((b) => ['DUE_SOON', 'OVERDUE'].includes(loanState(b, reminderDays)))
  const unpaid = (fines.data || []).filter((f) => f.fine_status === 'UNPAID')
  const unpaidTotal = unpaid.reduce((sum, f) => sum + Number(f.amount), 0)

  return (
    <div className="stack">
      <div className="card welcome-card">
        <div>
          <p className="muted">Welcome,</p>
          <h1>{student.name}</h1>
        </div>
        <dl className="info-list">
          <div>
            <dt>Student ID</dt>
            <dd>{student.student_id}</dd>
          </div>
          <div>
            <dt>Faculty</dt>
            <dd>{student.faculty || '—'}</dd>
          </div>
        </dl>
      </div>

      <Alert type="error">{borrowings.error || fines.error}</Alert>

      {unpaidTotal > 0 && (
        <div className="fine-banner">
          <AlertTriangle size={24} />
          <div>
            <strong>Outstanding fine: {formatMoney(unpaidTotal)}</strong>
            <p>You cannot borrow books until your fine is paid. Please see the librarian.</p>
          </div>
        </div>
      )}

      <div className="stat-grid">
        <div className="card stat-card">
          <span className="stat-icon blue"><BookMarked size={22} /></span>
          <div>
            <small>Books borrowed</small>
            <strong>{current.length}</strong>
          </div>
        </div>
        <div className="card stat-card">
          <span className="stat-icon amber"><Clock size={22} /></span>
          <div>
            <small>Due soon / overdue</small>
            <strong>{dueSoon.length}</strong>
          </div>
        </div>
        <div className="card stat-card">
          <span className="stat-icon red"><Receipt size={22} /></span>
          <div>
            <small>Outstanding fines</small>
            <strong>{formatMoney(unpaidTotal)}</strong>
          </div>
        </div>
      </div>

      {dueSoon.length > 0 && (
        <div className="card">
          <h2>Books due soon</h2>
          <ul className="plain-list">
            {dueSoon.map((b) => (
              <li key={b.id}>
                <div>
                  <strong>{b.title}</strong>
                  <small className="muted">Code {b.book_code} · Due {formatDate(b.due_date)}</small>
                </div>
                <StatusBadge status={loanState(b, reminderDays)} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="tile-grid">
        <Link to="/student/books" className="tile">
          <Search size={34} /> Search Books
        </Link>
        <Link to="/student/my-books" className="tile">
          <BookMarked size={34} /> My Books
        </Link>
        <Link to="/student/fines" className="tile">
          <Receipt size={34} /> My Fines
        </Link>
        <Link to="/student/activity" className="tile">
          <History size={34} /> My Activity
        </Link>
        <button className="tile tile-finish" onClick={endSession}>
          <LogOut size={34} /> Finish
        </button>
      </div>
    </div>
  )
}

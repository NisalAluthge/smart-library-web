import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { Home, Search, BookMarked, Receipt, History, LogOut, Library, Timer } from 'lucide-react'
import { useKioskSession } from '../context/KioskSessionContext'
import useInactivityTimeout from '../hooks/useInactivityTimeout'
import { INACTIVITY_SECONDS, WARNING_SECONDS } from '../lib/config'

const LINKS = [
  { to: '/student', label: 'Home', icon: Home, end: true },
  { to: '/student/books', label: 'Search Books', icon: Search },
  { to: '/student/my-books', label: 'My Books', icon: BookMarked },
  { to: '/student/fines', label: 'My Fines', icon: Receipt },
  { to: '/student/activity', label: 'My Activity', icon: History },
]

export default function StudentLayout() {
  const { student, rfid, endSession } = useKioskSession()
  const secondsLeft = useInactivityTimeout(INACTIVITY_SECONDS, endSession, rfid)

  // No card tapped -> back to the RFID screen
  if (!student) return <Navigate to="/" replace />

  return (
    <div className="student-shell">
      <header className="student-header">
        <div className="student-brand">
          <Library size={24} />
          <span>Smart Library</span>
        </div>

        <nav className="student-nav">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => `student-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="student-user">
          <span className={`timer ${secondsLeft <= WARNING_SECONDS ? 'timer-warn' : ''}`}>
            <Timer size={15} /> {secondsLeft}s
          </span>
          <button className="btn btn-finish" onClick={endSession}>
            <LogOut size={18} /> Finish
          </button>
        </div>
      </header>

      {secondsLeft <= WARNING_SECONDS && (
        <div className="timeout-banner">
          Session ending in {secondsLeft} seconds. Touch the screen to stay signed in.
        </div>
      )}

      <main className="student-main">
        <Outlet />
      </main>
    </div>
  )
}

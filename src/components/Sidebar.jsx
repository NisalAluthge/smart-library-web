import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Copy,
  ArrowLeftRight,
  Receipt,
  Activity,
  Settings,
  LogOut,
  Library,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const LINKS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/books', label: 'Books', icon: BookOpen },
  { to: '/admin/book-copies', label: 'Book Copies', icon: Copy },
  { to: '/admin/borrowings', label: 'Borrowings', icon: ArrowLeftRight },
  { to: '/admin/fines', label: 'Fines', icon: Receipt },
  { to: '/admin/activity', label: 'Library Activity', icon: Activity },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ open, onClose }) {
  const { signOut } = useAuth()

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Library size={26} />
          <span>Smart Library</span>
        </div>

        <nav className="sidebar-nav">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>

        <button className="sidebar-link sidebar-logout" onClick={signOut}>
          <LogOut size={19} />
          Logout
        </button>
      </aside>
    </>
  )
}

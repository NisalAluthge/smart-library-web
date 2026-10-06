import { Menu, UserCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// Top bar of the admin area
export default function Navbar({ onMenuClick }) {
  const { admin } = useAuth()
  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenuClick} aria-label="Open menu">
        <Menu size={22} />
      </button>
      <div className="topbar-spacer" />
      <div className="topbar-user">
        <UserCircle size={26} />
        <div>
          <strong>{admin?.name || 'Administrator'}</strong>
          <small>{admin?.email}</small>
        </div>
      </div>
    </header>
  )
}

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'

export default function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="admin-shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="admin-content">
        <Navbar onMenuClick={() => setMenuOpen(true)} />
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

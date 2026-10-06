import { Outlet } from 'react-router-dom'
import { Library } from 'lucide-react'

export default function KioskLayout() {
  return (
    <div className="kiosk">
      <header className="kiosk-header">
        <Library size={28} />
        SMART LIBRARY
      </header>

      <main className="kiosk-main">
        <Outlet />
      </main>

      <footer className="kiosk-footer">
        Need help? Please contact the library administrator.
      </footer>
    </div>
  )
}

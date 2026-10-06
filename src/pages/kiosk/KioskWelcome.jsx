import { useState } from 'react'
import { CreditCard, AlertTriangle, Loader2 } from 'lucide-react'
import { useKioskSession } from '../../context/KioskSessionContext'

export default function KioskWelcome() {
  const { status, error, handleScan } = useKioskSession()
  const [testUid, setTestUid] = useState('')

  return (
    <section className="welcome">
      <h1>Welcome to Smart Library</h1>
      <p className="subtitle">Borrow books quickly with your student card</p>

      <div className="rfid-ring">
        <CreditCard size={88} strokeWidth={1.5} />
      </div>

      <h2>TAP YOUR RFID CARD</h2>
      <p className="hint">Place your student RFID card on the reader.</p>

      {status === 'identifying' ? (
        <div className="waiting" role="status">
          <Loader2 size={18} className="spin" /> Reading card...
        </div>
      ) : (
        <div className="waiting" role="status">
          <span className="waiting-dot" /> Waiting for card...
        </div>
      )}

      {error && (
        <div className="kiosk-error" role="alert">
          <AlertTriangle size={22} />
          {error}
        </div>
      )}

      {/* Development helper: only visible when running "npm run dev".
          It does the same thing as a real card tap. Hidden in the production build. */}
      {import.meta.env.DEV && (
        <form
          className="dev-box"
          onSubmit={(e) => {
            e.preventDefault()
            if (testUid.trim()) handleScan(testUid.trim())
          }}
        >
          <small>Dev only: simulate a card tap (type a student's rfid_uid)</small>
          <div>
            <input
              value={testUid}
              onChange={(e) => setTestUid(e.target.value)}
              placeholder="RFID UID"
              aria-label="RFID UID for testing"
            />
            <button type="submit">Simulate tap</button>
          </div>
        </form>
      )}
    </section>
  )
}

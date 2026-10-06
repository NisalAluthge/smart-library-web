import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { KioskSessionProvider } from './context/KioskSessionContext'
import ProtectedRoute from './components/ProtectedRoute'

import KioskLayout from './layouts/KioskLayout'
import StudentLayout from './layouts/StudentLayout'
import AdminLayout from './layouts/AdminLayout'

import KioskWelcome from './pages/kiosk/KioskWelcome'

import StudentDashboard from './pages/student/StudentDashboard'
import StudentBooks from './pages/student/Books'
import MyBooks from './pages/student/MyBooks'
import MyFines from './pages/student/MyFines'
import MyActivity from './pages/student/MyActivity'

import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import Students from './pages/admin/Students'
import AdminBooks from './pages/admin/Books'
import BookCopies from './pages/admin/BookCopies'
import Borrowings from './pages/admin/Borrowings'
import Fines from './pages/admin/Fines'
import Activity from './pages/admin/Activity'
import Settings from './pages/admin/Settings'

function NotFound() {
  return (
    <div className="center-page">
      <div className="card">
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist.</p>
        <Link to="/" className="btn">Back to kiosk</Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <KioskSessionProvider>
          <Routes>
            {/* Kiosk */}
            <Route element={<KioskLayout />}>
              <Route path="/" element={<KioskWelcome />} />
            </Route>

            {/* Student session (after RFID tap) */}
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<StudentDashboard />} />
              <Route path="books" element={<StudentBooks />} />
              <Route path="my-books" element={<MyBooks />} />
              <Route path="fines" element={<MyFines />} />
              <Route path="activity" element={<MyActivity />} />
            </Route>

            {/* Admin */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="students" element={<Students />} />
              <Route path="books" element={<AdminBooks />} />
              <Route path="book-copies" element={<BookCopies />} />
              <Route path="borrowings" element={<Borrowings />} />
              <Route path="fines" element={<Fines />} />
              <Route path="activity" element={<Activity />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </KioskSessionProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

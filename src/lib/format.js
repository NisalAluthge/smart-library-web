export const formatDate = (v) =>
  v
    ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

export const formatDateTime = (v) =>
  v
    ? new Date(v).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

export const formatMoney = (n) =>
  `Rs. ${Number(n || 0).toLocaleString('en-LK', { maximumFractionDigits: 2 })}`

// Returns RETURNED | OVERDUE | DUE_SOON | BORROWED for a borrowing record
export function loanState(borrowing, reminderDays = 3) {
  if (borrowing.status === 'RETURNED') return 'RETURNED'
  const due = new Date(borrowing.due_date)
  const now = new Date()
  if (due < now) return 'OVERDUE'
  const daysLeft = (due - now) / 86400000
  if (daysLeft <= reminderDays) return 'DUE_SOON'
  return 'BORROWED'
}

// Turns technical errors into messages a student/admin can understand
export function friendlyError(err) {
  if (!err) return 'Something went wrong. Please try again.'
  const msg = String(err.message || err)
  if (/failed to fetch|networkerror|network request failed|load failed/i.test(msg)) {
    return 'Unable to connect to the library system. Please try again.'
  }
  if (err.code === '23505') return 'That value already exists. It must be unique.'
  if (err.code === '23503') return 'This record is linked to other data, so the action is not allowed.'
  if (err.code === '42501') return 'You do not have permission to do that.'
  return msg
}

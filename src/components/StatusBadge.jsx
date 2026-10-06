const MAP = {
  AVAILABLE: ['green', 'Available'],
  BORROWED: ['blue', 'Borrowed'],
  DUE_SOON: ['amber', 'Due soon'],
  OVERDUE: ['red', 'Overdue'],
  RETURNED: ['gray', 'Returned'],
  PAID: ['green', 'Paid'],
  UNPAID: ['red', 'Unpaid'],
  BORROW: ['blue', 'Borrow'],
  RETURN: ['green', 'Return'],
}

export default function StatusBadge({ status }) {
  const [color, label] = MAP[status] || ['gray', status]
  return <span className={`badge badge-${color}`}>{label}</span>
}

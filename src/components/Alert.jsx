import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

const ICONS = { error: AlertCircle, success: CheckCircle2, info: Info }

export default function Alert({ type = 'info', children }) {
  if (!children) return null
  const Icon = ICONS[type]
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={20} />
      <div>{children}</div>
    </div>
  )
}

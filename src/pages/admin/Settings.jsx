import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/PageHeader'
import Loading from '../../components/Loading'
import Alert from '../../components/Alert'
import { friendlyError } from '../../lib/format'

const FIELDS = [
  { key: 'loan_period_days', label: 'Loan Period (days)', step: '1' },
  { key: 'fine_per_day', label: 'Fine Per Day (Rs.)', step: '0.01' },
  { key: 'reminder_days_before', label: 'Reminder Days Before Due Date', step: '1' },
  { key: 'maximum_fine', label: 'Maximum Fine (Rs.)', step: '0.01' },
]

export default function Settings() {
  const [id, setId] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    supabase
      .from('library_settings')
      .select('*')
      .order('id')
      .limit(1)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) setError(friendlyError(err))
        else if (!data) setError('No settings row found. Run supabase/setup.sql to create the default row.')
        else {
          setId(data.id)
          setForm(Object.fromEntries(FIELDS.map((f) => [f.key, String(data[f.key])])))
        }
        setLoading(false)
      })
  }, [])

  async function save(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    const values = Object.fromEntries(FIELDS.map((f) => [f.key, Number(form[f.key])]))
    if (Object.values(values).some((v) => Number.isNaN(v) || v < 0)) {
      setError('All values must be numbers that are zero or greater.')
      return
    }
    if (values.loan_period_days < 1) {
      setError('Loan period must be at least 1 day.')
      return
    }
    setSaving(true)
    const { error: err } = await supabase.from('library_settings').update(values).eq('id', id)
    setSaving(false)
    if (err) setError(friendlyError(err))
    else setSuccess('Settings saved. They apply to new borrowings and returns.')
  }

  if (loading) return <Loading />

  return (
    <div className="stack">
      <PageHeader title="Settings" subtitle="Library rules used for borrowing and fines" />
      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      {form && (
        <form className="card form settings-form" onSubmit={save}>
          <div className="form-grid">
            {FIELDS.map((f) => (
              <label className="field" key={f.key}>
                <span>{f.label}</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step={f.step}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  required
                />
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button className="btn" disabled={saving}>
              <Save size={18} /> {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

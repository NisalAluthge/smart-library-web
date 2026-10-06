import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/PageHeader'
import SearchBox from '../../components/SearchBox'
import Modal from '../../components/Modal'
import Loading from '../../components/Loading'
import Alert from '../../components/Alert'
import StatusBadge from '../../components/StatusBadge'
import { formatDate, formatMoney, friendlyError, loanState } from '../../lib/format'

const EMPTY = { student_id: '', name: '', email: '', faculty: '', rfid_uid: '' }

export default function Students() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [query, setQuery] = useState('')

  const [form, setForm] = useState(null) // null = closed
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [details, setDetails] = useState(null)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) setError(friendlyError(err))
    else setRows(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((s) =>
      [s.student_id, s.name, s.email, s.faculty, s.rfid_uid].some((v) =>
        (v || '').toLowerCase().includes(q)
      )
    )
  }, [rows, query])

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY)
    setFormError('')
  }

  function openEdit(s) {
    setEditingId(s.id)
    setForm({
      student_id: s.student_id,
      name: s.name,
      email: s.email,
      faculty: s.faculty || '',
      rfid_uid: s.rfid_uid || '',
    })
    setFormError('')
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    const payload = {
      student_id: form.student_id.trim(),
      name: form.name.trim(),
      email: form.email.trim(),
      faculty: form.faculty.trim() || null,
      rfid_uid: form.rfid_uid.trim() || null,
    }
    const { error: err } = editingId
      ? await supabase.from('students').update(payload).eq('id', editingId)
      : await supabase.from('students').insert(payload)
    setSaving(false)

    if (err) {
      setFormError(
        err.code === '23505'
          ? 'Student ID, email or RFID UID is already used by another student.'
          : friendlyError(err)
      )
      return
    }
    setForm(null)
    setSuccess(editingId ? 'Student updated.' : 'Student added.')
    load()
  }

  async function openDetails(s) {
    setDetails({ student: s, loading: true })
    const [b, f] = await Promise.all([
      supabase
        .from('borrowings')
        .select('id, borrowed_at, due_date, returned_at, status, book_copies(book_code, books(title))')
        .eq('student_id', s.id)
        .order('borrowed_at', { ascending: false }),
      supabase.from('fines').select('amount').eq('student_id', s.id).eq('fine_status', 'UNPAID'),
    ])
    setDetails({
      student: s,
      loading: false,
      borrowings: b.data || [],
      unpaid: (f.data || []).reduce((sum, x) => sum + Number(x.amount), 0),
    })
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <div className="stack">
      <PageHeader title="Students" subtitle="Register students and assign RFID cards">
        <button className="btn" onClick={openAdd}>
          <Plus size={18} /> Add student
        </button>
      </PageHeader>

      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>
      <SearchBox value={query} onChange={setQuery} placeholder="Search students" />

      {loading ? (
        <Loading />
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Faculty</th>
                  <th>RFID UID</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan="6" className="empty">No students found.</td></tr>
                )}
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td>{s.student_id}</td>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.email}</td>
                    <td>{s.faculty || '—'}</td>
                    <td>{s.rfid_uid || <span className="muted">Not assigned</span>}</td>
                    <td className="row-actions">
                      <button className="icon-btn" onClick={() => openDetails(s)} title="View details">
                        <Eye size={18} />
                      </button>
                      <button className="icon-btn" onClick={() => openEdit(s)} title="Edit">
                        <Pencil size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / edit */}
      <Modal
        open={!!form}
        title={editingId ? 'Edit student' : 'Add student'}
        onClose={() => setForm(null)}
      >
        {form && (
          <form className="form" onSubmit={save}>
            <Alert type="error">{formError}</Alert>
            <div className="form-grid">
              <label className="field">
                <span>Student ID *</span>
                <input className="input" value={form.student_id} onChange={set('student_id')} required />
              </label>
              <label className="field">
                <span>Name *</span>
                <input className="input" value={form.name} onChange={set('name')} required />
              </label>
              <label className="field">
                <span>Email *</span>
                <input className="input" type="email" value={form.email} onChange={set('email')} required />
              </label>
              <label className="field">
                <span>Faculty</span>
                <input className="input" value={form.faculty} onChange={set('faculty')} />
              </label>
              <label className="field full">
                <span>RFID UID</span>
                <input
                  className="input"
                  value={form.rfid_uid}
                  onChange={set('rfid_uid')}
                  placeholder="Exactly as sent by the ESP32 (Serial Monitor)"
                />
                <small className="muted">Must be unique. Leave empty if no card is assigned yet.</small>
              </label>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setForm(null)}>
                Cancel
              </button>
              <button className="btn" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Details */}
      <Modal
        open={!!details}
        title="Student details"
        onClose={() => setDetails(null)}
        wide
      >
        {details &&
          (details.loading ? (
            <Loading />
          ) : (
            <div className="stack">
              <dl className="info-list">
                <div><dt>Student ID</dt><dd>{details.student.student_id}</dd></div>
                <div><dt>Name</dt><dd>{details.student.name}</dd></div>
                <div><dt>Email</dt><dd>{details.student.email}</dd></div>
                <div><dt>Faculty</dt><dd>{details.student.faculty || '—'}</dd></div>
                <div><dt>RFID UID</dt><dd>{details.student.rfid_uid || '—'}</dd></div>
                <div><dt>Unpaid fines</dt><dd>{formatMoney(details.unpaid)}</dd></div>
              </dl>
              <h3>Borrowing history</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>Book</th><th>Code</th><th>Borrowed</th><th>Due</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {details.borrowings.length === 0 && (
                      <tr><td colSpan="5" className="empty">No borrowings yet.</td></tr>
                    )}
                    {details.borrowings.map((b) => (
                      <tr key={b.id}>
                        <td>{b.book_copies?.books?.title}</td>
                        <td>{b.book_copies?.book_code}</td>
                        <td>{formatDate(b.borrowed_at)}</td>
                        <td>{formatDate(b.due_date)}</td>
                        <td><StatusBadge status={loanState(b)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
      </Modal>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh'
import PageHeader from '../../components/PageHeader'
import SearchBox from '../../components/SearchBox'
import Modal from '../../components/Modal'
import Loading from '../../components/Loading'
import Alert from '../../components/Alert'
import StatusBadge from '../../components/StatusBadge'
import { friendlyError } from '../../lib/format'

const EMPTY = { book_id: '', book_code: '', shelf: '', status: 'AVAILABLE' }

export default function BookCopies() {
  const [rows, setRows] = useState([])
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const [copies, bookList] = await Promise.all([
      supabase
        .from('book_copies')
        .select('*, books(title, author)')
        .order('book_code'),
      supabase.from('books').select('id, title').order('title'),
    ])
    if (copies.error) setError(friendlyError(copies.error))
    else setRows(copies.data)
    if (!bookList.error) setBooks(bookList.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useRealtimeRefresh(['book_copies'], load)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false
      if (!q) return true
      return [c.book_code, c.shelf, c.books?.title, c.books?.author].some((v) =>
        (v || '').toLowerCase().includes(q)
      )
    })
  }, [rows, query, statusFilter])

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY)
    setFormError('')
  }

  function openEdit(c) {
    setEditingId(c.id)
    setForm({
      book_id: String(c.book_id),
      book_code: c.book_code,
      shelf: c.shelf || '',
      status: c.status,
    })
    setFormError('')
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    const payload = {
      book_id: Number(form.book_id),
      book_code: form.book_code.trim(),
      shelf: form.shelf.trim() || null,
      status: form.status,
    }
    const { error: err } = editingId
      ? await supabase.from('book_copies').update(payload).eq('id', editingId)
      : await supabase.from('book_copies').insert(payload)
    setSaving(false)
    if (err) {
      setFormError(
        err.code === '23505' ? 'This book code already exists. Book codes must be unique.' : friendlyError(err)
      )
      return
    }
    setForm(null)
    setSuccess(editingId ? 'Book copy updated.' : 'Book copy added.')
    load()
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <div className="stack">
      <PageHeader title="Book Copies" subtitle="Physical copies, shelves and availability">
        <button className="btn" onClick={openAdd}>
          <Plus size={18} /> Add copy
        </button>
      </PageHeader>

      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>

      <div className="toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="Search code, title, shelf" />
        <select
          className="input select-inline"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="ALL">All statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="BORROWED">Borrowed</option>
        </select>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Book code</th><th>Book</th><th>Shelf</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan="5" className="empty">No copies found.</td></tr>
                )}
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.book_code}</strong></td>
                    <td>{c.books?.title}<br /><small className="muted">{c.books?.author}</small></td>
                    <td>{c.shelf || '—'}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="row-actions">
                      <button className="icon-btn" onClick={() => openEdit(c)} title="Edit">
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

      <Modal open={!!form} title={editingId ? 'Edit book copy' : 'Add book copy'} onClose={() => setForm(null)}>
        {form && (
          <form className="form" onSubmit={save}>
            <Alert type="error">{formError}</Alert>
            <div className="form-grid">
              <label className="field full">
                <span>Book *</span>
                <select className="input" value={form.book_id} onChange={set('book_id')} required>
                  <option value="">Select a book...</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>{b.title}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Book code *</span>
                <input className="input" value={form.book_code} onChange={set('book_code')} required />
              </label>
              <label className="field">
                <span>Shelf</span>
                <input className="input" value={form.shelf} onChange={set('shelf')} />
              </label>
              <label className="field full">
                <span>Status</span>
                <select className="input" value={form.status} onChange={set('status')}>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="BORROWED">BORROWED</option>
                </select>
                <small className="muted">
                  Status changes automatically on borrow and return. Edit it by hand only to fix a mistake.
                </small>
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
    </div>
  )
}

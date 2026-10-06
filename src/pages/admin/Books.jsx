import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Pencil, Trash2, Eye } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import PageHeader from '../../components/PageHeader'
import SearchBox from '../../components/SearchBox'
import Modal, { ConfirmDialog } from '../../components/Modal'
import Loading from '../../components/Loading'
import Alert from '../../components/Alert'
import StatusBadge from '../../components/StatusBadge'
import { friendlyError } from '../../lib/format'

const EMPTY = { title: '', author: '', isbn: '', category: '', description: '' }

export default function Books() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [query, setQuery] = useState('')

  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [details, setDetails] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('books')
      .select('*, book_copies(id, book_code, shelf, status)')
      .order('title')
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
    return rows.filter((b) =>
      [b.title, b.author, b.isbn, b.category].some((v) => (v || '').toLowerCase().includes(q))
    )
  }, [rows, query])

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY)
    setFormError('')
  }

  function openEdit(b) {
    setEditingId(b.id)
    setForm({
      title: b.title,
      author: b.author,
      isbn: b.isbn || '',
      category: b.category || '',
      description: b.description || '',
    })
    setFormError('')
  }

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setFormError('')
    const payload = {
      title: form.title.trim(),
      author: form.author.trim(),
      isbn: form.isbn.trim() || null,
      category: form.category.trim() || null,
      description: form.description.trim() || null,
    }
    const { error: err } = editingId
      ? await supabase.from('books').update(payload).eq('id', editingId)
      : await supabase.from('books').insert(payload)
    setSaving(false)
    if (err) {
      setFormError(friendlyError(err))
      return
    }
    setForm(null)
    setSuccess(editingId ? 'Book updated.' : 'Book added.')
    load()
  }

  // "Delete where safe": a book that still has copies cannot be deleted
  function askDelete(b) {
    setSuccess('')
    if ((b.book_copies || []).length > 0) {
      setError(
        `"${b.title}" still has ${b.book_copies.length} copy/copies. Remove or reassign the copies first.`
      )
      return
    }
    setError('')
    setToDelete(b)
  }

  async function doDelete() {
    setDeleting(true)
    const { error: err } = await supabase.from('books').delete().eq('id', toDelete.id)
    setDeleting(false)
    setToDelete(null)
    if (err) setError(friendlyError(err))
    else {
      setSuccess('Book deleted.')
      load()
    }
  }

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  return (
    <div className="stack">
      <PageHeader title="Books" subtitle="Manage the book catalogue">
        <button className="btn" onClick={openAdd}>
          <Plus size={18} /> Add book
        </button>
      </PageHeader>

      <Alert type="error">{error}</Alert>
      <Alert type="success">{success}</Alert>
      <SearchBox value={query} onChange={setQuery} placeholder="Search title, author, ISBN or category" />

      {loading ? (
        <Loading />
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>ISBN</th>
                  <th>Category</th>
                  <th>Copies</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan="6" className="empty">No books found.</td></tr>
                )}
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.title}</strong></td>
                    <td>{b.author}</td>
                    <td>{b.isbn || '—'}</td>
                    <td>{b.category || '—'}</td>
                    <td>
                      {b.book_copies.filter((c) => c.status === 'AVAILABLE').length} /{' '}
                      {b.book_copies.length}
                    </td>
                    <td className="row-actions">
                      <button className="icon-btn" onClick={() => setDetails(b)} title="View details">
                        <Eye size={18} />
                      </button>
                      <button className="icon-btn" onClick={() => openEdit(b)} title="Edit">
                        <Pencil size={18} />
                      </button>
                      <button className="icon-btn danger" onClick={() => askDelete(b)} title="Delete">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={!!form} title={editingId ? 'Edit book' : 'Add book'} onClose={() => setForm(null)}>
        {form && (
          <form className="form" onSubmit={save}>
            <Alert type="error">{formError}</Alert>
            <div className="form-grid">
              <label className="field full">
                <span>Title *</span>
                <input className="input" value={form.title} onChange={set('title')} required />
              </label>
              <label className="field">
                <span>Author *</span>
                <input className="input" value={form.author} onChange={set('author')} required />
              </label>
              <label className="field">
                <span>ISBN</span>
                <input className="input" value={form.isbn} onChange={set('isbn')} />
              </label>
              <label className="field full">
                <span>Category</span>
                <input className="input" value={form.category} onChange={set('category')} />
              </label>
              <label className="field full">
                <span>Description</span>
                <textarea className="input" rows="4" value={form.description} onChange={set('description')} />
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

      <Modal open={!!details} title="Book details" onClose={() => setDetails(null)} wide>
        {details && (
          <div className="stack">
            <dl className="info-list">
              <div><dt>Title</dt><dd>{details.title}</dd></div>
              <div><dt>Author</dt><dd>{details.author}</dd></div>
              <div><dt>ISBN</dt><dd>{details.isbn || '—'}</dd></div>
              <div><dt>Category</dt><dd>{details.category || '—'}</dd></div>
            </dl>
            {details.description && <p>{details.description}</p>}
            <h3>Copies</h3>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Book code</th><th>Shelf</th><th>Status</th></tr></thead>
                <tbody>
                  {details.book_copies.length === 0 && (
                    <tr><td colSpan="3" className="empty">No copies yet.</td></tr>
                  )}
                  {details.book_copies.map((c) => (
                    <tr key={c.id}>
                      <td>{c.book_code}</td>
                      <td>{c.shelf || '—'}</td>
                      <td><StatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete book"
        message={`Delete "${toDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  )
}

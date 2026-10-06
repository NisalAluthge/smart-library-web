import { useCallback, useEffect, useState } from 'react'
import { PlusCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { friendlyError } from '../../lib/format'
import useRealtimeRefresh from '../../hooks/useRealtimeRefresh'
import PageHeader from '../../components/PageHeader'
import SearchBox from '../../components/SearchBox'
import BookCard from '../../components/BookCard'
import BorrowDialog from '../../components/BorrowDialog'
import Loading from '../../components/Loading'
import Alert from '../../components/Alert'

export default function Books() {
  const [query, setQuery] = useState('')
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dialog, setDialog] = useState({ open: false, code: '' })

  const load = useCallback(async () => {
    // remove characters that have a special meaning in the search filter
    const q = query.trim().replace(/[%,()*]/g, ' ')
    let req = supabase
      .from('books')
      .select('*, book_copies(id, book_code, shelf, status)')
      .order('title')
      .limit(60)
    if (q) req = req.or(`title.ilike.%${q}%,author.ilike.%${q}%,category.ilike.%${q}%`)

    const { data, error: err } = await req
    if (err) setError(friendlyError(err))
    else {
      setError('')
      setBooks(data)
    }
    setLoading(false)
  }, [query])

  // search shortly after the student stops typing
  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  // availability updates live when anyone borrows/returns
  useRealtimeRefresh(['book_copies'], load)

  return (
    <div className="stack">
      <PageHeader title="Search Books" subtitle="Search by title, author or category">
        <button className="btn" onClick={() => setDialog({ open: true, code: '' })}>
          <PlusCircle size={18} /> Borrow by book code
        </button>
      </PageHeader>

      <SearchBox value={query} onChange={setQuery} placeholder="Search title, author or category" />
      <Alert type="error">{error}</Alert>

      {loading ? (
        <Loading />
      ) : books.length === 0 ? (
        <div className="card empty">No books found.</div>
      ) : (
        <div className="book-grid">
          {books.map((b) => (
            <BookCard key={b.id} book={b} onBorrow={(code) => setDialog({ open: true, code })} />
          ))}
        </div>
      )}

      <BorrowDialog
        open={dialog.open}
        initialCode={dialog.code}
        onClose={() => setDialog({ open: false, code: '' })}
        onBorrowed={load}
      />
    </div>
  )
}

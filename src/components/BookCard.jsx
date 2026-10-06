import { BookOpen, MapPin } from 'lucide-react'
import StatusBadge from './StatusBadge'

// One book in the student search results
export default function BookCard({ book, onBorrow }) {
  const copies = book.book_copies || []
  const available = copies.filter((c) => c.status === 'AVAILABLE')

  return (
    <article className="card book-card">
      <div className="book-card-top">
        <div className="book-icon">
          <BookOpen size={26} />
        </div>
        <div className="book-card-title">
          <h3>{book.title}</h3>
          <p className="muted">{book.author}</p>
        </div>
        <StatusBadge status={available.length > 0 ? 'AVAILABLE' : 'BORROWED'} />
      </div>

      {book.category && <span className="tag">{book.category}</span>}
      {book.description && <p className="book-desc">{book.description}</p>}

      <p className="available-count">
        Available Copies: <strong>{available.length}</strong> of {copies.length}
      </p>

      {available.length > 0 ? (
        <div className="chips">
          {available.map((c) => (
            <button
              key={c.id}
              className="chip"
              onClick={() => onBorrow(c.book_code)}
              title="Borrow this copy"
            >
              <strong>{c.book_code}</strong>
              {c.shelf && (
                <span>
                  <MapPin size={12} /> {c.shelf}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className="muted">All copies are currently borrowed.</p>
      )}
    </article>
  )
}

import { Search } from 'lucide-react'

export default function SearchBox({ value, onChange, placeholder = 'Search...' }) {
  return (
    <label className="search-box">
      <Search size={18} />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </label>
  )
}

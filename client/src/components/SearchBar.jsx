import './SearchBar.css'

export default function SearchBar({ value, onChange, placeholder = 'Search items, categories, owners' }) {
  return (
    <label className="search-bar">
      <span className="sr-only">Search marketplace</span>
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
      <span className="search-icon">🔎</span>
    </label>
  )
}

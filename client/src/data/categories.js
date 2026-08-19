import { LayoutGrid, Book, Monitor, Shirt, Home, Gamepad2, Music, Volleyball, Package } from 'lucide-react'

export const categoryNames = [
  'Books',
  'Electronics',
  'Fashion',
  'Home',
  'Gaming',
  'Music',
  'Sports',
  'Others'
]

export const CATEGORY_NAMES = categoryNames

export const CATEGORY_META = [
  { id: 'all', name: 'All', icon: LayoutGrid, color: '#005C66', lightBg: 'rgba(0, 92, 102, 0.12)' },
  { id: 'books', name: 'Books', icon: Book, color: '#007885', lightBg: 'rgba(0, 120, 133, 0.12)' },
  { id: 'electronics', name: 'Electronics', icon: Monitor, color: '#008C99', lightBg: 'rgba(0, 140, 153, 0.12)' },
  { id: 'fashion', name: 'Fashion', icon: Shirt, color: '#005C66', lightBg: 'rgba(0, 92, 102, 0.12)' },
  { id: 'home', name: 'Home', icon: Home, color: '#007885', lightBg: 'rgba(0, 120, 133, 0.12)' },
  { id: 'gaming', name: 'Gaming', icon: Gamepad2, color: '#008C99', lightBg: 'rgba(0, 140, 153, 0.12)' },
  { id: 'music', name: 'Music', icon: Music, color: '#005C66', lightBg: 'rgba(0, 92, 102, 0.12)' },
  { id: 'sports', name: 'Sports', icon: Volleyball, color: '#007885', lightBg: 'rgba(0, 120, 133, 0.12)' },
  { id: 'others', name: 'Others', icon: Package, color: '#008C99', lightBg: 'rgba(0, 140, 153, 0.12)' },
]

export const CATEGORY_ALL = CATEGORY_META.map((category) => category.name)

export const CATEGORY_NORMALIZATION_MAP = {
  'fashion & accessories': 'Fashion',
  'home & living': 'Home',
  'musical instruments': 'Music',
  'sports & fitness': 'Sports',
}

const CATEGORY_NAMES_LOWER = Object.fromEntries(
  categoryNames.map((name) => [name.toLowerCase(), name])
)

export const normalizeCategory = (value) => {
  if (!value) return ''
  const trimmed = String(value).trim()
  const key = trimmed.toLowerCase()
  if (CATEGORY_NAMES_LOWER[key]) return CATEGORY_NAMES_LOWER[key]
  if (CATEGORY_NORMALIZATION_MAP[key]) return CATEGORY_NORMALIZATION_MAP[key]
  return trimmed
}

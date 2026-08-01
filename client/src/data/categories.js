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
  { id: 'all', name: 'All', icon: LayoutGrid, color: '#3D6E63', lightBg: 'rgba(61, 110, 99, 0.12)' },
  { id: 'books', name: 'Books', icon: Book, color: '#6D28D9', lightBg: 'rgba(109, 40, 217, 0.12)' },
  { id: 'electronics', name: 'Electronics', icon: Monitor, color: '#0F766E', lightBg: 'rgba(15, 118, 110, 0.12)' },
  { id: 'fashion', name: 'Fashion', icon: Shirt, color: '#BE185D', lightBg: 'rgba(190, 24, 93, 0.12)' },
  { id: 'home', name: 'Home', icon: Home, color: '#B45309', lightBg: 'rgba(180, 83, 9, 0.12)' },
  { id: 'gaming', name: 'Gaming', icon: Gamepad2, color: '#2563EB', lightBg: 'rgba(37, 99, 235, 0.12)' },
  { id: 'music', name: 'Music', icon: Music, color: '#0EA5E9', lightBg: 'rgba(14, 165, 233, 0.12)' },
  { id: 'sports', name: 'Sports', icon: Volleyball, color: '#16A34A', lightBg: 'rgba(22, 163, 74, 0.12)' },
  { id: 'others', name: 'Others', icon: Package, color: '#64748B', lightBg: 'rgba(100, 116, 139, 0.12)' },
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

/**
 * skilterCategories.js
 *
 * Single source of truth for Skilter's 8 skill categories.
 * Both the Skilter Explore page (filter/browse) and the My Skills page
 * (category picker when adding a skill) import from here — never hardcode
 * the list in two places.
 *
 * Shape is identical to CATEGORY_META in categories.js so CategoryFilter
 * and any other component that reads CATEGORY_META can accept this array
 * without modification.
 */

import {
  LayoutGrid,
  Music,
  Disc3,
  Palette,
  BookOpen,
  Code2,
  Languages,
  Dumbbell,
  Camera,
} from 'lucide-react'

export const SKILTER_CATEGORY_META = [
  {
    id: 'all',
    name: 'All',
    icon: LayoutGrid,
    color: '#4F46E5',
    lightBg: 'rgba(79, 70, 229, 0.10)',
  },
  {
    id: 'music',
    name: 'Music',
    icon: Music,
    color: '#7C3AED',
    lightBg: 'rgba(124, 58, 237, 0.10)',
  },
  {
    id: 'dance',
    name: 'Dance',
    icon: Disc3,
    color: '#DB2777',
    lightBg: 'rgba(219, 39, 119, 0.10)',
  },
  {
    id: 'art-design',
    name: 'Art & Design',
    icon: Palette,
    color: '#EA580C',
    lightBg: 'rgba(234, 88, 12, 0.10)',
  },
  {
    id: 'study-help',
    name: 'Study Help / Tutoring',
    icon: BookOpen,
    color: '#0891B2',
    lightBg: 'rgba(8, 145, 178, 0.10)',
  },
  {
    id: 'coding-tech',
    name: 'Coding & Tech',
    icon: Code2,
    color: '#16A34A',
    lightBg: 'rgba(22, 163, 74, 0.10)',
  },
  {
    id: 'languages',
    name: 'Languages',
    icon: Languages,
    color: '#D97706',
    lightBg: 'rgba(217, 119, 6, 0.10)',
  },
  {
    id: 'fitness-sports',
    name: 'Fitness & Sports',
    icon: Dumbbell,
    color: '#DC2626',
    lightBg: 'rgba(220, 38, 38, 0.10)',
  },
  {
    id: 'photography-video',
    name: 'Photography & Videography',
    icon: Camera,
    color: '#475569',
    lightBg: 'rgba(71, 85, 105, 0.10)',
  },
]

/** Just the names, for dropdowns / selects / validation */
export const SKILTER_CATEGORY_NAMES = SKILTER_CATEGORY_META
  .filter((c) => c.id !== 'all')
  .map((c) => c.name)

/** Normalise a raw category string to its canonical name */
export function normalizeSkilterCategory(value) {
  if (!value) return ''
  const trimmed = String(value).trim().toLowerCase()
  const match = SKILTER_CATEGORY_META.find(
    (c) => c.name.toLowerCase() === trimmed || c.id === trimmed
  )
  return match ? match.name : String(value).trim()
}

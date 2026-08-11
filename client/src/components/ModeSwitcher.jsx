import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import './ModeSwitcher.css'

const MODES = [
  { key: 'barter', label: 'Barter', mark: '⇄', path: '/explore' },
  { key: 'skillter', label: 'Skillter', mark: '🎓', path: '/skills' },
  { key: 'renter', label: 'Renter', mark: '📦', path: '/rent' },
]

function getCurrentMode(pathname) {
  if (pathname.startsWith('/skills')) return 'skillter'
  if (pathname.startsWith('/rent')) return 'renter'
  return 'barter'
}

export default function ModeSwitcher() {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const currentKey = getCurrentMode(location.pathname)
  const current = MODES.find((m) => m.key === currentKey)
  const others = MODES.filter((m) => m.key !== currentKey)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="mode-switcher" ref={ref}>
      <button
        type="button"
        className="navbar-brand mode-switcher-trigger"
        onClick={() => {
          console.log('logo clicked')
          setOpen((o) => !o)
        }}
      >
        <div className="navbar-mark">{current.mark}</div>
        <p className="navbar-logo">{current.label}</p>
        <ChevronDown size={14} className={open ? 'chevron chevron-open' : 'chevron'} />
      </button>

      {open && (
        <div className="mode-switcher-dropdown">
          {others.map((m) => (
            <button
              key={m.key}
              type="button"
              className="mode-switcher-item"
              onClick={() => {
                navigate(m.path)
                setOpen(false)
              }}
            >
              <span className="mode-switcher-item-mark">
                {m.mark}
              </span>

              <div className="mode-switcher-item-text">
                <div className="mode-switcher-item-title">
                  Switch to {m.label}
                </div>

                <div className="mode-switcher-item-subtitle">
                  Open {m.label}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
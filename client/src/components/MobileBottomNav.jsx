import { motion } from 'framer-motion'
import { ArrowLeftRight, Home, Sparkles } from 'lucide-react'
import './MobileBottomNav.css'

const modes = [
  {
    key: 'Barter',
    label: 'Barter',
    path: '/explore',
    icon: ArrowLeftRight,
  },
  {
    key: 'Renter',
    label: 'Rental',
    path: '/renter',
    icon: Home,
  },
  {
    key: 'Skilter',
    label: 'Skilter',
    path: '/skilter',
    icon: Sparkles,
  },
]

export default function MobileBottomNav({ currentPlatform, onSelectPlatform }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile mode navigation">
      <div className="mobile-bottom-nav-inner">
        {modes.map((mode) => {
          const isActive = currentPlatform === mode.key
          const Icon = mode.icon

          return (
            <motion.button
              key={mode.key}
              type="button"
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectPlatform(mode.key)}
              aria-current={isActive ? 'page' : undefined}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <Icon size={17} className="bottom-nav-icon" />
              <span className="bottom-nav-label">{mode.label}</span>
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active-pill"
                  className="bottom-nav-active-bg"
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}

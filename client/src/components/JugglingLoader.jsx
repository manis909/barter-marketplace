import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingBag, BookOpen, Package, Wine } from 'lucide-react'
import './JugglingLoader.css'

const ITEMS = [
  { icon: Wine, gradient: 'linear-gradient(135deg, #FF8E53 0%, #FF6B4A 100%)' },
  { icon: BookOpen, gradient: 'linear-gradient(135deg, #00A8B5 0%, #005C66 100%)' },
  { icon: Package, gradient: 'linear-gradient(135deg, #34D399 0%, #059669 100%)' },
  { icon: ShoppingBag, gradient: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)' },
]

export default function JugglingLoader({ message = "Getting your barter items ready..." }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % ITEMS.length)
    }, 1300)
    return () => clearInterval(timer)
  }, [])

  const CurrentItem = ITEMS[index]
  const IconComponent = CurrentItem.icon

  return (
    <div className="clean-juggling-screen">
      <div className="clean-juggling-stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.2 }}
            className="clean-item-shell"
          >
            <motion.div
              animate={{
                y: [0, -36, 0],
                rotate: [-12, 12, -12],
              }}
              transition={{
                duration: 0.7,
                repeat: Infinity,
                ease: [0.4, 0, 0.6, 1],
              }}
              className="clean-3d-capsule"
              style={{ background: CurrentItem.gradient }}
            >
              <IconComponent size={34} color="#FFFFFF" strokeWidth={2.2} />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Soft shadow underneath matching reference image */}
        <motion.div
          animate={{
            scaleX: [1, 0.35, 1],
            opacity: [0.25, 0.05, 0.25],
          }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            ease: [0.4, 0, 0.6, 1],
          }}
          className="clean-shadow-oval"
        />
      </div>

      <h3 className="clean-juggling-text">{message}</h3>
    </div>
  )
}

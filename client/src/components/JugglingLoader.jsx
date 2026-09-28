import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import bagLoader from '../assets/bag-loader.png'
import booksLoader from '../assets/books-loader.png'
import './JugglingLoader.css'

const LOADER_ITEMS = [
  { src: bagLoader, alt: 'Handbag Item' },
  { src: booksLoader, alt: 'Books Item' },
]

export default function JugglingLoader({ message = "Getting your barter items ready..." }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % LOADER_ITEMS.length)
    }, 1400)
    return () => clearInterval(timer)
  }, [])

  const currentItem = LOADER_ITEMS[index]

  return (
    <div className="clean-juggling-screen">
      <div className="clean-juggling-stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.6, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: -12 }}
            transition={{ duration: 0.25 }}
            className="clean-item-shell"
          >
            <motion.div
              animate={{
                y: [0, -30, 0],
                rotate: [-8, 8, -8],
              }}
              transition={{
                duration: 0.75,
                repeat: Infinity,
                ease: [0.45, 0, 0.55, 1],
              }}
              className="user-svg-loader-box"
            >
              <img src={currentItem.src} alt={currentItem.alt} className="user-svg-loader-img" />
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Dynamic shadow underneath */}
        <motion.div
          animate={{
            scaleX: [1, 0.4, 1],
            opacity: [0.25, 0.08, 0.25],
          }}
          transition={{
            duration: 0.75,
            repeat: Infinity,
            ease: [0.45, 0, 0.55, 1],
          }}
          className="clean-shadow-oval"
        />
      </div>

      <h3 className="clean-juggling-text">{message}</h3>
    </div>
  )
}

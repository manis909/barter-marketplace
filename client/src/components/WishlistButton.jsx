import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { addWishlist, getWishlist, removeWishlist } from '../services/tradeService'
import './WishlistButton.css'

export default function WishlistButton({ itemId, className = '' }) {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    if (!currentUser || !itemId) {
      setWishlisted(false)
      return () => {
        isMounted = false
      }
    }

    async function syncWishlistStatus() {
      try {
        const response = await getWishlist()
        const wishlistItems = response?.wishlist ?? []
        const isWishlisted = wishlistItems.some((wishlistItem) => {
          const wishlistItemId = wishlistItem?.id ?? wishlistItem?.item_id
          return wishlistItemId === itemId
        })

        if (isMounted) {
          setWishlisted(isWishlisted)
        }
      } catch (err) {
        console.error('Failed to sync wishlist state:', err)
      }
    }

    syncWishlistStatus()

    return () => {
      isMounted = false
    }
  }, [currentUser, itemId])

  async function handleWishlistToggle(e) {
    e.stopPropagation()

    if (!currentUser) {
      navigate('/login')
      return
    }

    if (wishlistLoading) return

    const nextWishlisted = !wishlisted
    setWishlisted(nextWishlisted)
    setWishlistLoading(true)

    try {
      if (nextWishlisted) {
        await addWishlist(itemId)
      } else {
        await removeWishlist(itemId)
      }
    } catch (err) {
      console.error('Wishlist toggle failed:', err)
      setWishlisted(wishlisted)
    } finally {
      setWishlistLoading(false)
    }
  }

  return (
    <button
      type="button"
      className={`glass-wishlist-btn ${wishlisted ? 'wishlisted' : ''} ${className}`.trim()}
      aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      onClick={handleWishlistToggle}
      disabled={wishlistLoading}
    >
      <Heart
        size={18}
        className={`heart-icon ${wishlisted ? 'filled' : ''}`}
      />
    </button>
  )
}

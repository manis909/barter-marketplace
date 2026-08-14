import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { addSkillWishlist, getSkillWishlist, removeSkillWishlist } from '../services/skillWishlistService'
import './WishlistButton.css'

export default function SkillWishlistButton({ skillId, className = '' }) {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  useEffect(() => {
    let isMounted = true

    if (!currentUser || !skillId) {
      setWishlisted(false)
      return () => {
        isMounted = false
      }
    }

    async function syncWishlistStatus() {
      try {
        const response = await getSkillWishlist()
        const wishlistItems = response?.wishlist ?? []
        const isWishlisted = wishlistItems.some((wishlistItem) => {
          const wishlistItemId = wishlistItem?.id ?? wishlistItem?.skill_listing_id
          return wishlistItemId === skillId
        })

        if (isMounted) {
          setWishlisted(isWishlisted)
        }
      } catch (err) {
        console.error('Failed to sync skill wishlist state:', err)
      }
    }

    syncWishlistStatus()

    return () => {
      isMounted = false
    }
  }, [currentUser, skillId])

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
        await addSkillWishlist(skillId)
      } else {
        await removeSkillWishlist(skillId)
      }
    } catch (err) {
      console.error('Skill wishlist toggle failed:', err)
      setWishlisted(wishlisted)
    } finally {
      setWishlistLoading(false)
    }
  }

  return (
    <button
      type="button"
      className={`glass-wishlist-btn ${wishlisted ? 'wishlisted' : ''} ${className}`.trim()}
      aria-label={wishlisted ? 'Remove skill from wishlist' : 'Add skill to wishlist'}
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

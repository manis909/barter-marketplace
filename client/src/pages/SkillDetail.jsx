import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import api from '../services/api'
import './SkillDetail.css'

export default function SkillDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()

  const [skill, setSkill] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [touchStartX, setTouchStartX] = useState(null)

  useEffect(() => {
    if (!id) {
      setError('No skill ID provided.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    setSkill(null)

    api.get(`/skills/${id}`)
      .then((response) => {
        setSkill(response.data.skill)
      })
      .catch((err) => {
        if (err.name !== 'CanceledError') {
          setError('Unable to load skill details right now.')
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id])

  const normalizedSkill = useMemo(() => {
    if (!skill) {
      return null
    }

    return {
      ...skill,
      skill_name: skill.skill_name || 'Untitled Skill',
      description: skill.description || 'No description provided.',
      category: skill.category || 'Uncategorized',
      teacherName: skill.teacher_name || 'Teacher',
      teacherId: skill.teacher_id,
      session_type: skill.session_type || 'one_on_one',
      max_participants: skill.max_participants || 1,
      images: Array.isArray(skill.image_urls) && skill.image_urls.length > 0
        ? skill.image_urls
        : ['https://via.placeholder.com/900x600?text=Skill']
    }
  }, [skill])

  const images = normalizedSkill?.images || []
  const displayImage = selectedImage || images[0]

  useEffect(() => {
    if (images.length > 0) {
      setSelectedImage((current) => (current && images.includes(current) ? current : images[0]))
    }
  }, [images])

  const activeImageIndex = useMemo(() => {
    if (!images.length) {
      return 0
    }

    const currentIndex = images.findIndex((photo) => photo === displayImage)
    return currentIndex >= 0 ? currentIndex : 0
  }, [displayImage, images])

  const showLeftArrow = images.length > 1 && activeImageIndex > 0
  const showRightArrow = images.length > 1 && activeImageIndex < images.length - 1

  function goToPreviousImage() {
    if (!showLeftArrow) {
      return
    }

    setSelectedImage(images[activeImageIndex - 1])
  }

  function goToNextImage() {
    if (!showRightArrow) {
      return
    }

    setSelectedImage(images[activeImageIndex + 1])
  }

  function handleTouchStart(event) {
    setTouchStartX(event.touches[0].clientX)
  }

  function handleTouchEnd(event) {
    if (touchStartX === null) {
      return
    }

    const deltaX = event.changedTouches[0].clientX - touchStartX
    if (deltaX < -50) {
      goToNextImage()
    } else if (deltaX > 50) {
      goToPreviousImage()
    }

    setTouchStartX(null)
  }

  if (loading) {
    return (
      <div className="skill-detail-page">
        <p className="detail-loading">Loading skill details...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="skill-detail-page">
        <p>{error}</p>
      </div>
    )
  }

  if (!normalizedSkill) {
    return (
      <div className="skill-detail-page">
        <p>Skill not found.</p>
      </div>
    )
  }

  const isOwner = currentUser && (currentUser.id === normalizedSkill.teacherId)

  return (
    <div className="skill-detail-page">
      <Link
        to="/skilter/explore"
        aria-label="Back to Skilter Explore"
        className="detail-back"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          borderRadius: '12px'
        }}
      >
        <ArrowLeft size={20} />
      </Link>
      <div className="detail-grid">
        <div className="detail-gallery">
          <div
            className="detail-image-shell"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <img src={displayImage} alt={normalizedSkill.skill_name} className="detail-main-image" />

            {images.length > 1 && (
              <>
                {showLeftArrow && (
                  <button
                    type="button"
                    className="detail-nav-button detail-nav-button-left"
                    onClick={goToPreviousImage}
                    aria-label="View previous image"
                  >
                    &lt;
                  </button>
                )}

                {showRightArrow && (
                  <button
                    type="button"
                    className="detail-nav-button detail-nav-button-right"
                    onClick={goToNextImage}
                    aria-label="View next image"
                  >
                    &gt;
                  </button>
                )}
              </>
            )}
          </div>
          <div className="detail-thumbs">
            {images.map((photo) => (
              <button
                key={photo}
                type="button"
                className={photo === displayImage ? 'thumb-button active' : 'thumb-button'}
                onClick={() => setSelectedImage(photo)}
              >
                <img src={photo} alt={normalizedSkill.skill_name} />
              </button>
            ))}
          </div>
        </div>

        <div className="detail-copy">
          <h1>{normalizedSkill.skill_name}</h1>
          <p className="detail-description">{normalizedSkill.description}</p>
          <div className="detail-info-grid">
            <div>
              <span className="detail-label">Teacher</span>
              <p>{normalizedSkill.teacherName}</p>
            </div>
            <div>
              <span className="detail-label">Category</span>
              <p>{normalizedSkill.category}</p>
            </div>
            <div>
              <span className="detail-label">Session Type</span>
              <p>{normalizedSkill.session_type === 'one_on_one' ? 'One-on-One' : 'Group'}</p>
            </div>
          </div>
          <div className="detail-info-grid">
            <div>
              <span className="detail-label">Price</span>
              <p>
                {normalizedSkill.price_type === 'free' && 'Free'}
                {(normalizedSkill.price_type === 'coins' || normalizedSkill.price_type === 'negotiable') && 
                  normalizedSkill.price && 
                  `₹${Number(normalizedSkill.price).toLocaleString('en-IN')} / ${normalizedSkill.price_unit || 'Session'}`
                }
              </p>
            </div>
            {normalizedSkill.session_type === 'group' && (
              <div>
                <span className="detail-label">Max Participants</span>
                <p>{normalizedSkill.max_participants}</p>
              </div>
            )}
            <div>
              <span className="detail-label">Status</span>
              <p style={{ textTransform: 'capitalize' }}>{normalizedSkill.status || 'Active'}</p>
            </div>
          </div>
          <div className="detail-actions">
            {isOwner ? (
              <p style={{ color: '#57534E', fontWeight: 600 }}>This is your skill listing.</p>
            ) : (
              <button
                type="button"
                className="primary-button detail-action"
                onClick={() => {
                  // Future: Navigate to booking page or open booking modal
                  alert('Booking functionality coming soon!')
                }}
              >
                Book Session
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, ShieldCheck, Tag, User } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import api from '../services/api'
import { createSkillBooking } from '../services/skillBookingService'
import SkillWishlistButton from '../components/SkillWishlistButton'
import VerificationRequiredModal from '../components/VerificationRequiredModal'
import useVerificationStatus from '../hooks/useVerificationStatus'
import SkillProviderBookingModal from '../components/SkillProviderBookingModal'
import './SkillDetail.css'

export default function SkillDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const { verificationStatus, rejectionReason, isVerified, loading: verificationLoading } = useVerificationStatus()
  const [showVerificationModal, setShowVerificationModal] = useState(false)

  const [skill, setSkill] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [touchStartX, setTouchStartX] = useState(null)
  const [booking, setBooking] = useState({ loading: false, error: '', success: false })
  const [showBookingModal, setShowBookingModal] = useState(false)

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
    <>
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
              <SkillWishlistButton skillId={normalizedSkill.id} />

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

            {images.length > 1 && (
              <div className="detail-thumbs">
                {images.map((photo, index) => (
                  <button
                    key={`${photo}-${index}`}
                    type="button"
                    className={photo === displayImage ? 'thumb-button active' : 'thumb-button'}
                    onClick={() => setSelectedImage(photo)}
                    aria-label={`View image ${index + 1}`}
                  >
                    <img src={photo} alt={`${normalizedSkill.skill_name} thumbnail ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="detail-copy">
            <div className="detail-header-card">
              <div className="detail-badges-row">
                <span className="detail-chip detail-chip-category"><Tag size={13} /> {normalizedSkill.category}</span>
                <span className="detail-chip detail-chip-session">
                  {normalizedSkill.session_type === 'one_on_one' ? 'One-on-One' : 'Group'}
                </span>
              </div>

              <div className="detail-title-row">
                <h1>{normalizedSkill.skill_name}</h1>
                {isOwner && <span className="detail-mine-badge">Mine</span>}
              </div>
            </div>

            <div className="detail-description-card">
              <h3>About this session</h3>
              <p className="detail-description">{normalizedSkill.description}</p>
            </div>

            <div className="detail-teacher-card">
              <div className="detail-teacher-avatar"><User size={22} /></div>

              <div className="detail-teacher-meta">
                <div className="detail-teacher-row">
                  <Link to={normalizedSkill.teacherId ? `/profile/${normalizedSkill.teacherId}` : '/profile'}>{normalizedSkill.teacherName}</Link>
                  <span className="detail-verified-badge"><CheckCircle2 size={12} /> Verified</span>
                </div>
                <div className="detail-teacher-rating">
                  <span>Trusted teacher profile</span>
                </div>
              </div>

              <Link className="detail-teacher-link" to={normalizedSkill.teacherId ? `/profile/${normalizedSkill.teacherId}` : '/profile'}>View profile</Link>
            </div>

            <div className="detail-specs-card">
              <h3>Session details</h3>
              <div className="detail-specs-grid">
                <div className="detail-spec-item">
                  <span className="detail-spec-label"><Tag size={13} /> Category</span>
                  <span className="detail-spec-value">{normalizedSkill.category}</span>
                </div>
                <div className="detail-spec-item">
                  <span className="detail-spec-label"><CheckCircle2 size={13} /> Session type</span>
                  <span className="detail-spec-value">{normalizedSkill.session_type === 'one_on_one' ? 'One-on-One' : 'Group'}</span>
                </div>
                <div className="detail-spec-item">
                  <span className="detail-spec-label"><ShieldCheck size={13} /> Price</span>
                  <span className="detail-spec-value">
                    {normalizedSkill.price_type === 'free'
                      ? 'Free'
                      : `₹${Number(normalizedSkill.price || 0).toLocaleString('en-IN')}`}
                  </span>
                </div>
                {normalizedSkill.session_type === 'group' && (
                  <div className="detail-spec-item">
                    <span className="detail-spec-label"><User size={13} /> Max participants</span>
                    <span className="detail-spec-value">{normalizedSkill.max_participants || 1}</span>
                  </div>
                )}
                <div className="detail-spec-item">
                  <span className="detail-spec-label"><CheckCircle2 size={13} /> Status</span>
                  <span className="detail-spec-value">{normalizedSkill.status || 'Active'}</span>
                </div>
              </div>
            </div>

            <div className="detail-actions-card">
              {isOwner ? (
                <p className="detail-owner-note">This is your skill listing.</p>
              ) : (
                <>
                  <button
                    id="btn-book-session"
                    type="button"
                    className="primary-button detail-action"
                    disabled={booking.loading || booking.success}
                    onClick={async () => {
                      if (skill?.source === 'application') {
                        setShowBookingModal(true)
                        return
                      }

                      if (!isVerified && !verificationLoading) {
                        setShowVerificationModal(true)
                        return
                      }

                      setBooking({ loading: true, error: '', success: false })
                      try {
                        await createSkillBooking(normalizedSkill.id)
                        setBooking({ loading: false, error: '', success: true })
                        setTimeout(() => navigate('/skilter/learning'), 1200)
                      } catch (err) {
                        const msg = err?.response?.data?.error || 'Something went wrong. Please try again.'
                        setBooking({ loading: false, error: msg, success: false })
                      }
                    }}
                  >
                    {booking.loading
                      ? 'Booking…'
                      : booking.success
                        ? '✓ Booked! Redirecting…'
                        : 'Book Session'}
                  </button>

                  {booking.error && (
                    <p id="booking-error-msg" className="detail-booking-error">
                      {booking.error}
                    </p>
                  )}
                </>
              )}

              <div className="detail-guarantee"><ShieldCheck size={16} /> Protected by Skilter Safe Session Guarantee</div>
            </div>
          </div>
        </div>

        {showBookingModal && skill?.source === 'application' && (
          <SkillProviderBookingModal
            skill={skill}
            onClose={() => setShowBookingModal(false)}
            onSuccess={() => {
              setTimeout(() => navigate('/skilter/learning'), 1000)
            }}
          />
        )}
      </div>

      {showVerificationModal && (
        <VerificationRequiredModal
          status={verificationStatus}
          rejectionReason={rejectionReason}
          onClose={() => setShowVerificationModal(false)}
        />
      )}
    </>
  )
}

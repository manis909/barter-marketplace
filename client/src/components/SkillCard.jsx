import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User } from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import './SkillCard.css'

export default function SkillCard({ skill }) {
  const { currentUser } = useAuth()

  const image = skill.image_urls?.[0] || 'https://via.placeholder.com/300x220?text=Skill'
  const category = skill.category || 'General'
  const teacherName = skill.teacher_name || 'Teacher'
  const isOwner = currentUser && currentUser.id === skill.teacher_id

  return (
    <motion.article
      className="compact-skill-card"
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 450, damping: 28 }}
    >
      {/* Image Media Container */}
      <div className="card-media-wrapper">
        <div className="card-media-backdrop" style={{ backgroundImage: `url(${image})` }} />
        <img src={image} alt={skill.skill_name} className="card-image" />
      </div>

      {/* Compact Content Density */}
      <div className="card-body">
        {/* Row 1: Category & Session Type Pill Badges */}
        <div className="card-badges-row">
          <span className="pill-badge category-pill">{category}</span>
          <span className="pill-badge session-pill">
            {skill.session_type === 'one_on_one' ? 'One-on-One' : 'Group'}
          </span>
        </div>

        {/* Row 2: 2-Line Truncated Title */}
        <h3 className="card-title" title={skill.skill_name}>
          {skill.skill_name}
        </h3>

        {/* Row 3: Teacher & Price (Single Compact Row) */}
        <div className="card-owner-rating-row">
          <div className="owner-box">
            <User size={12} className="meta-icon" />
            <Link
              to={`/profile/${skill.teacher_id}`}
              onClick={(e) => e.stopPropagation()}
              className="owner-link"
            >
              {teacherName}
            </Link>
          </div>
          {(skill.price_type === 'coins' || skill.price_type === 'negotiable') && skill.price && (
            <div className="price-box">
              ₹{Number(skill.price).toLocaleString('en-IN')}
            </div>
          )}
          {skill.price_type === 'free' && (
            <div className="price-box free">Free</div>
          )}
        </div>

        {/* Row 4: Description Preview */}
        <p className="card-description">
          {skill.description || 'No description provided.'}
        </p>

        {/* Row 5: Clean Equal-Width Buttons */}
        <div className="card-actions-row">
          {isOwner ? (
            <span className="card-status-pill owner-pill full-width">Mine</span>
          ) : (
            <>
              <Link to={`/skilter/skill/${skill.id}`} className="btn-compact btn-compact-secondary">
                View Details
              </Link>
              <button
                type="button"
                className="btn-compact btn-compact-primary"
                onClick={(e) => {
                  e.stopPropagation()
                  // TODO: Member 3 will wire this to their booking flow
                  alert('Booking functionality will be connected by Member 3')
                }}
              >
                Book Session
              </button>
            </>
          )}
        </div>
      </div>
    </motion.article>
  )
}

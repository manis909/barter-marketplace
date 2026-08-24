import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import api from '../services/api'
import { Plus, Search, Edit2, Trash2, GraduationCap } from 'lucide-react'
import AddEditSkillModal from '../components/AddEditSkillModal'
import './MySkillsManagement.css'

export default function MySkillsManagement() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  const [skills, setSkills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('All') // All, Active, Inactive
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSkill, setEditingSkill] = useState(null)

  // Load user's skills
  useEffect(() => {
    if (!currentUser) {
      navigate('/login')
      return
    }

    loadSkills()
  }, [currentUser, navigate])

  async function loadSkills() {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get('/skills/mine')
      setSkills(response.data.skills || [])
    } catch (err) {
      console.error('Error loading skills:', err)
      setError(err.response?.data?.error || err.message || 'Failed to load skills')
    } finally {
      setLoading(false)
    }
  }

  function handleAddSkill() {
    setEditingSkill(null)
    setIsModalOpen(true)
  }

  function handleEditSkill(skill) {
    setEditingSkill(skill)
    setIsModalOpen(true)
  }

  async function handleDeleteSkill(skillId) {
    if (!window.confirm('Are you sure you want to delete this skill listing?')) {
      return
    }

    try {
      await api.delete(`/skills/${skillId}`)
      setSkills(skills.filter(s => s.id !== skillId))
    } catch (err) {
      console.error('Error deleting skill:', err)
      alert(err.response?.data?.error || 'Failed to delete skill')
    }
  }

  function handleModalSuccess() {
    loadSkills() // Refresh the list after add/edit
  }

  // Filter skills based on search and status
  const filteredSkills = skills.filter(skill => {
    // Search filter
    const matchesSearch = !searchQuery ||
      skill.skill_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      skill.category?.toLowerCase().includes(searchQuery.toLowerCase())

    // Status filter
    const matchesStatus =
      activeFilter === 'All' ||
      (activeFilter === 'Active' && skill.status === 'active') ||
      (activeFilter === 'Inactive' && skill.status === 'paused')

    return matchesSearch && matchesStatus
  })

  if (!currentUser) {
    return null // Will redirect to login
  }

  return (
    <section className="my-skills-management-page">
      {/* Green Gradient Banner */}
      <div className="skills-page-banner">
            <button
              type="button"
          className="ml-hero-back"
          onClick={() => navigate('/skilter')}
          aria-label="Go back"
        >
          ←
        </button>
      </div>

      <div className="skills-management-container">
        {/* Header Card */}
        <div className="skills-header-card">
          <div className="skills-header-content">
            <div className="skills-header-left">
              <div className="my-skills-pill">
                <GraduationCap size={16} />
                <span>MY SKILLS</span>
              </div>
              <h1 className="skills-main-heading">Manage your skills</h1>
              <p className="skills-subtitle">Keep your expertise polished, visible, and ready to share.</p>
            </div>
            <button type="button" className="add-skill-button" onClick={handleAddSkill}>
              <Plus size={18} />
              <span>Add Skill</span>
            </button>
          </div>
        </div>

        {/* Search and Filters Section */}
        <div className="skills-controls-card">
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search your skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="filter-pills">
            {['All', 'Active', 'Inactive'].map((filter) => (
              <button
                key={filter}
                type="button"
                className={`filter-pill ${activeFilter === filter ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="skills-loading">
            <p>Loading your skills...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="skills-error">
            <p>Error: {error}</p>
            <button type="button" className="secondary-button" onClick={loadSkills}>
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredSkills.length === 0 && skills.length === 0 && (
          <div className="skills-empty-state">
            <div className="empty-icon">🎓</div>
            <h3>No Skills Yet</h3>
            <p>Share your expertise with learners. Create your first skill listing to get started.</p>
            <button type="button" className="primary-button" onClick={handleAddSkill}>
              <Plus size={18} />
              <span>Add Your First Skill</span>
            </button>
          </div>
        )}

        {/* No Results State (filtered but no matches) */}
        {!loading && !error && filteredSkills.length === 0 && skills.length > 0 && (
          <div className="skills-empty-state">
            <div className="empty-icon">🔍</div>
            <h3>No matching skills</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        )}

        {/* Skills Grid */}
        {!loading && !error && filteredSkills.length > 0 && (
          <div className="skills-grid">
            {filteredSkills.map((skill) => {
              const image = skill.image_urls?.[0] || 'https://via.placeholder.com/300x220?text=Skill'
              return (
                <article key={skill.id} className="compact-skill-card">
                  {/* Image Media Container */}
                  <div className="card-media-wrapper">
                    <div className="card-media-backdrop" style={{ backgroundImage: `url(${image})` }} />
                    <img src={image} alt={skill.skill_name} className="card-image" />
                  </div>

                  {/* Compact Content Density */}
                  <div className="card-body">
                    {/* Row 1: Category & Status Badge */}
                    <div className="card-badges-row">
                      <span className="pill-badge category-pill">{skill.category}</span>
                      <span className={`pill-badge ${skill.status === 'active' ? 'status-active-pill' : 'status-inactive-pill'}`}>
                        {skill.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                      <span className="pill-badge session-pill">
                        {skill.session_type === 'one_on_one' ? 'One-on-One' : 'Group'}
                      </span>
                    </div>

                    {/* Row 2: 2-Line Truncated Title */}
                    <h3 className="card-title" title={skill.skill_name}>
                      {skill.skill_name}
                    </h3>

                    {/* Row 3: Price Info */}
                    <div className="card-owner-rating-row">
                      <div className="price-info">
                        {skill.price_type === 'free' && (
                          <span className="price-box free">Free</span>
                        )}
                        {(skill.price_type === 'coins' || skill.price_type === 'negotiable') && skill.price && (
                          <span className="price-box">
                            ₹{Number(skill.price).toLocaleString('en-IN')}
                            {skill.price_unit && ` / ${skill.price_unit}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Row 4: Description Preview */}
                    <p className="card-description">
                      {skill.description || 'No description provided.'}
                    </p>

                    {/* Row 5: Action Buttons */}
                    <div className="card-actions-row">
                      <button
                        type="button"
                        className="btn-compact btn-compact-secondary"
                        onClick={() => handleEditSkill(skill)}
                        title="Edit skill"
                      >
                        <Edit2 size={14} />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        className="btn-compact btn-compact-danger"
                        onClick={() => handleDeleteSkill(skill.id)}
                        title="Delete skill"
                      >
                        <Trash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Skill Modal */}
      <AddEditSkillModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        editSkill={editingSkill}
      />
    </section>
  )
}

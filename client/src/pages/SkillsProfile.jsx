import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../features/auth/AuthContext';
import VerifiedBadge from '../features/verification/VerifiedBadge';
import './SkillsProfile.css';

// Skill detail pages live at /skilter/skill/:id (confirmed by Member 2).
// Editing is not duplicated here — Edit Profile still goes to /profile,
// which is the single source of truth for editing profile fields.

export default function SkillsProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();

  const isOwnProfile = !userId || userId === currentUser?.id;

  const [viewedUser, setViewedUser] = useState(null);
  const [viewedUserLoading, setViewedUserLoading] = useState(!isOwnProfile);
  const profileData = isOwnProfile ? currentUser : viewedUser;

  const [ratingSummary, setRatingSummary] = useState(null);
  const [skillsTaught, setSkillsTaught] = useState([]);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!isOwnProfile && userId) {
      setViewedUserLoading(true);
      api.get(`/users/${userId}`)
        .then(res => setViewedUser(res.data.user))
        .catch(() => setViewedUser(null))
        .finally(() => setViewedUserLoading(false));
    }
  }, [userId, isOwnProfile]);

  useEffect(() => {
    if (profileData) {
      api.get(`/ratings/user/${profileData.id}`)
        .then(res => setRatingSummary(res.data.summary))
        .catch(() => setRatingSummary(null));

      api.get(`/users/${profileData.id}/skills`)
        .then(res => setSkillsTaught(res.data.skills || []))
        .catch(() => setSkillsTaught([]));
    }
  }, [profileData]);

  function handleCopyLink() {
    const url = `${window.location.origin}/skilter/profile/${profileData.id}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  function formatJoinedDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  if (loading || viewedUserLoading) return <p>Loading...</p>;
  if (!profileData) return isOwnProfile
    ? <p>Please log in to view your profile.</p>
    : <p>This user could not be found.</p>;

  const displayImage = profileData.profile_image;

  return (
    <div className="skills-profile-page">
      <button
        type="button"
        className="profile-back-btn"
        onClick={() => navigate('/skilter/explore')}
        aria-label="Back to Skilter"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="skills-profile-header">
        {displayImage ? (
          <img src={displayImage} alt="Profile" className="profile-photo" />
        ) : (
          <div className="profile-photo profile-photo-placeholder">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}

        <div className="skills-profile-header-info">
          <p className="profile-username">
            {profileData.username}
            {profileData.is_verified && <VerifiedBadge />}
          </p>

          <div className="skills-profile-rating">
            {ratingSummary && ratingSummary.avg_rating != null ? (
              <>
                <span className="profile-stat-number">{Number(ratingSummary.avg_rating).toFixed(1)}</span>
                <span className="profile-stat-label">rating</span>
              </>
            ) : (
              <span className="profile-stat-label profile-no-rating">No ratings</span>
            )}
          </div>

          {profileData.created_at && (
            <p className="profile-joined">Joined {formatJoinedDate(profileData.created_at)}</p>
          )}

          {isOwnProfile && (
            <button type="button" className="edit-profile-btn" onClick={() => navigate('/profile')}>
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {profileData.full_name && <p className="profile-fullname">{profileData.full_name}</p>}

      {profileData.college && <p className="profile-college">{profileData.college}</p>}

      {profileData.bio && <p className="profile-bio">{profileData.bio}</p>}

      <button type="button" className="profile-copy-link" onClick={handleCopyLink}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        {linkCopied ? 'Link copied!' : 'Copy profile link'}
      </button>

      {skillsTaught.length > 0 && (
        <div className="skills-teach-grid">
          <h3>Skills I Teach</h3>
          <div className="skills-teach-grid-inner">
            {skillsTaught.map(skill => (
              <Link to={`/skilter/skill/${skill.id}`} key={skill.id} className="skills-teach-card">
                <img
                  src={
                    Array.isArray(skill.image_urls) && skill.image_urls.length > 0
                      ? skill.image_urls[0]
                      : 'https://placehold.co/300'
                  }
                  alt={skill.skill_name}
                  className="skills-teach-card-image"
                />
                <div className="skills-teach-card-body">
                  <div className="skills-teach-card-top">
                    <span className="profile-skill-name">{skill.skill_name}</span>
                    <span className={`profile-skill-badge profile-skill-badge-${skill.price_type}`}>
                      {skill.price_type === 'free' ? 'Free' : skill.price_type === 'coins' ? 'Coins' : 'Negotiable'}
                    </span>
                  </div>
                  {skill.category && <p className="profile-skill-category">{skill.category}</p>}
                  {skill.description && <p className="profile-skill-description">{skill.description}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
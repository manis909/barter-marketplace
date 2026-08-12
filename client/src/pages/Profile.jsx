import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import api from '../services/api';
import { useAuth } from '../features/auth/AuthContext';
import VerifiedBadge from '../features/verification/VerifiedBadge';
import IdVerification from '../features/verification/IdVerification';
import './Profile.css';

const MAX_IMAGE_SIZE_MB = 5; // raw file, before cropping — cropped output is much smaller
const COLLEGE_OPTIONS = ["ST. ANN'S COLLEGE FOR WOMEN"];

// Crops the selected image to a square using canvas, returns a Blob.
async function getCroppedImageBlob(imageSrc, cropPixels) {
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.9);
  });
}

export default function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser, loading, refreshUser } = useAuth();

  const isOwnProfile = !userId || userId === currentUser?.id;

  const [viewedUser, setViewedUser] = useState(null);
  const [viewedUserLoading, setViewedUserLoading] = useState(!isOwnProfile);

  const profileData = isOwnProfile ? currentUser : viewedUser;

  const [isEditing, setIsEditing] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [bio, setBio] = useState('');
  const [college, setCollege] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [recentReviews, setRecentReviews] = useState([]);
  const [listedItems, setListedItems] = useState([]);
  const [skillsTaught, setSkillsTaught] = useState([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const fileInputRef = useRef(null);
  const bioRef = useRef(null);
  const BIO_MAX_LENGTH = 150;

  // Crop modal state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

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
      setUsername(profileData.username || '');
      setFullName(profileData.full_name || '');
      setProfileImage(profileData.profile_image || '');
      setBio(profileData.bio || '');
      setCollege(profileData.college || '');

      api.get(`/ratings/user/${profileData.id}`)
        .then(res => setRatingSummary(res.data.summary))
        .catch(() => setRatingSummary(null));

      api.get(`/users/${profileData.id}/reviews`)
        .then(res => setRecentReviews(res.data.reviews || []))
        .catch(() => setRecentReviews([]));

      api.get(`/users/${profileData.id}/items`)
        .then(res => setListedItems(res.data.items || []))
        .catch(() => setListedItems([]));

      api.get(`/users/${profileData.id}/skills`)
        .then(res => setSkillsTaught(res.data.skills || []))
        .catch(() => setSkillsTaught([]));
    }
  }, [profileData]);

  // Pull live verification status from the backend instead of relying on
  // the possibly-stale currentUser object, so rejections/approvals show
  // up immediately without needing a fresh login.
  useEffect(() => {
    if (isOwnProfile) {
      api.get('/verification/status')
        .then(res => setVerificationStatus(res.data))
        .catch(() => setVerificationStatus(null));
    }
  }, [isOwnProfile, showVerification]);

  function handlePhotoSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    setError('');

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setError(`Image must be smaller than ${MAX_IMAGE_SIZE_MB}MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);

    // reset the input so selecting the same file again still fires onChange
    e.target.value = '';
  }

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixelsValue) => {
    setCroppedAreaPixels(croppedAreaPixelsValue);
  }, []);

  async function handleConfirmCrop() {
    if (!imageToCrop || !croppedAreaPixels) return;
    setUploading(true);
    setError('');
    setCropModalOpen(false);

    try {
      const croppedBlob = await getCroppedImageBlob(imageToCrop, croppedAreaPixels);

      const formData = new FormData();
      formData.append('photo', croppedBlob, 'profile.jpg');

      const res = await api.post('/users/profile-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProfileImage(res.data.profile_image);
      await refreshUser();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Photo upload failed. Please try again.');
    } finally {
      setUploading(false);
      setImageToCrop(null);
    }
  }

  async function handleRemovePhoto() {
    setUploading(true);
    setError('');
    try {
      await api.delete('/users/profile-photo');
      setProfileImage('');
      await refreshUser();
    } catch (err) {
      setError('Could not remove photo. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaved(false);
    setError('');

    try {
      await api.patch(`/users/${currentUser.id}`, {
        username,
        full_name: fullName,
        profile_image: profileImage,
        bio,
        college,
      });
      setSaved(true);
      await refreshUser();
      setTimeout(() => setIsEditing(false), 600);
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  }

  useEffect(() => {
    if (isEditing && bioRef.current) {
      bioRef.current.style.height = 'auto';
      bioRef.current.style.height = `${bioRef.current.scrollHeight}px`;
    }
  }, [isEditing]);

  function handleBioChange(e) {
    setBio(e.target.value.slice(0, BIO_MAX_LENGTH));
    // Auto-expand: reset height first so it can shrink too, not just grow
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/profile/${profileData.id}`;
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
    <div className="profile-page">
      <button
        type="button"
        className="profile-back-btn"
        onClick={() => {
          if (showVerification) setShowVerification(false);
          else if (isEditing) setIsEditing(false);
          else navigate('/explore');
        }}
        aria-label={showVerification || isEditing ? 'Back to Profile' : 'Back to Explore'}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      {showVerification ? (
        <IdVerification />
      ) : !isEditing ? (
        // ---------- VIEW MODE (Instagram-style) ----------
        <div className="profile-view">
          <div className="profile-header-row">
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

            <div className="profile-header-info">
              <p className="profile-username">
                {profileData.username}
                {profileData.is_verified && <VerifiedBadge />}
              </p>

              <div className="profile-stats-row">
                <div className="profile-stat">
                  <span className="profile-stat-number">{profileData.item_count ?? 0}</span>
                  <span className="profile-stat-label">items</span>
                </div>
                <div className="profile-stat">
                  <span className="profile-stat-number">{profileData.completed_trades ?? 0}</span>
                  <span className="profile-stat-label">trades</span>
                </div>
                <div className="profile-stat">
                  {ratingSummary && ratingSummary.avg_rating != null ? (
                    <>
                      <span className="profile-stat-number">{Number(ratingSummary.avg_rating).toFixed(1)}</span>
                      <span className="profile-stat-label">rating</span>
                    </>
                  ) : (
                    <span className="profile-stat-label profile-no-rating">No ratings</span>
                  )}
                </div>
              </div>

              {profileData.created_at && (
                <p className="profile-joined">Joined {formatJoinedDate(profileData.created_at)}</p>
              )}

              {isOwnProfile && (
                <button type="button" className="edit-profile-btn" onClick={() => setIsEditing(true)}>
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

          {isOwnProfile && verificationStatus?.verification_status === 'rejected' && (
            <>
              <p className="verification-rejected-note">
                Rejected: {verificationStatus.verification_rejection_reason}
              </p>
              <button
                type="button"
                className="profile-copy-link"
                onClick={() => setShowVerification(true)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Resubmit ID Verification
              </button>
            </>
          )}

          {recentReviews.length > 0 && (
            <div className="profile-reviews">
              <h3>Recent reviews</h3>
              {recentReviews.map((r, i) => (
                <div key={i} className="profile-review-item">
                  <div className="profile-review-header">
                    <span className="profile-review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    <span className="profile-review-author">{r.reviewer_username}</span>
                  </div>
                  <p className="profile-review-text">{r.review}</p>
                </div>
              ))}
            </div>
          )}

          {listedItems.length > 0 && (
            <div className="profile-items-grid">
              <h3>Listed Items</h3>
              <div className="profile-items-grid-inner">
                {listedItems.map(item => (
                  <Link to={`/item/${item.id}`} key={item.id} className="profile-item-thumb">
                    <img
                      src={
                        Array.isArray(item.image_urls) && item.image_urls.length > 0
                          ? item.image_urls[0]
                          : 'https://placehold.co/150'
                      }
                      alt={item.title}
                    />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {skillsTaught.length > 0 && (
            <div className="profile-skills-section">
              <h3>Skills I Teach</h3>
              <div className="profile-skills-list">
                {skillsTaught.map(skill => (
                  <div key={skill.id} className="profile-skill-card">
                    <div className="profile-skill-card-top">
                      <span className="profile-skill-name">{skill.skill_name}</span>
                      <span className={`profile-skill-badge profile-skill-badge-${skill.price_type}`}>
                        {skill.price_type === 'free' ? 'Free' : skill.price_type === 'coins' ? 'Coins' : 'Negotiable'}
                      </span>
                    </div>
                    {skill.category && <p className="profile-skill-category">{skill.category}</p>}
                    {skill.description && <p className="profile-skill-description">{skill.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // ---------- EDIT MODE ----------
        <div className="profile-edit">
          <h2>Edit Profile</h2>

          <div className="profile-photo-section">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="profile-photo" />
            ) : (
              <div className="profile-photo profile-photo-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}

            <div className="profile-photo-actions">
              <button type="button" className="profile-photo-edit" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading...' : 'Change Photo'}
              </button>
              {profileImage && (
                <button type="button" className="profile-photo-remove" onClick={handleRemovePhoto} disabled={uploading}>
                  Remove Photo
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
          </div>

          {error && <p className="profile-error">{error}</p>}

          <form onSubmit={handleSave} className="profile-form">
            <label>
              Email
              <input value={currentUser?.email || ''} disabled />
            </label>
            <label>
              Username
              <input value={username} onChange={e => setUsername(e.target.value)} required />
            </label>
            <label>
              Full Name
              <input value={fullName} onChange={e => setFullName(e.target.value)} />
            </label>
            <label>
              College
              <select value={college} onChange={e => setCollege(e.target.value)}>
                <option value="">Select your college</option>
                {COLLEGE_OPTIONS.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
            <label>
              Bio
              <textarea
                ref={bioRef}
                value={bio}
                onChange={handleBioChange}
                maxLength={BIO_MAX_LENGTH}
                rows={1}
              />
              <span className="profile-bio-counter">{bio.length}/{BIO_MAX_LENGTH}</span>
            </label>
            <div className="profile-edit-actions">
              <button type="button" className="profile-cancel" onClick={() => setIsEditing(false)}>
                Cancel
              </button>
              <button type="submit" className="profile-save">Save</button>
            </div>
            {saved && <span className="profile-saved">Saved!</span>}
          </form>
        </div>
      )}

      {cropModalOpen && (
        <div className="crop-modal-backdrop">
          <div className="crop-modal">
            <div className="crop-modal-area">
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={e => setZoom(Number(e.target.value))}
              className="crop-zoom-slider"
            />
            <div className="crop-modal-actions">
              <button type="button" className="profile-cancel" onClick={() => setCropModalOpen(false)}>
                Cancel
              </button>
              <button type="button" className="profile-save" onClick={handleConfirmCrop}>
                Use Photo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
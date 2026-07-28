import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import api from '../services/api';
import { useAuth } from '../features/auth/AuthContext';
import './Profile.css';

const MAX_IMAGE_SIZE_MB = 5; // raw file, before cropping — cropped output is much smaller
const COLLEGE_OPTIONS = ["ST. ANN'S COLLEGE FOR WOMEN"];
const BIO_MAX_LENGTH = 150;

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
  const [linkCopied, setLinkCopied] = useState(false);
  const fileInputRef = useRef(null);
  const bioTextareaRef = useRef(null);

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
    }
  }, [profileData]);

  // Auto-grow the bio textarea to fit its content, no manual resize handle
  useEffect(() => {
    if (bioTextareaRef.current) {
      bioTextareaRef.current.style.height = 'auto';
      bioTextareaRef.current.style.height = `${bioTextareaRef.current.scrollHeight}px`;
    }
  }, [bio, isEditing]);

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

  const BackArrow = ({ onClick, label }) => (
    <button type="button" className="back-arrow-btn" onClick={onClick} aria-label={label}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
    </button>
  );

  return (
    <div className="profile-page">
      {!isEditing ? (
        // ---------- VIEW MODE (Instagram-style horizontal) ----------
        <div className="profile-view">
          <BackArrow onClick={() => navigate('/explore')} label="Back to Explore" />

          <div className="profile-header">
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
              <p className="profile-username">{profileData.username}</p>

              <div className="profile-stats">
                <span><strong>{profileData.item_count ?? 0}</strong> items</span>
                <span><strong>{profileData.completed_trades ?? 0}</strong> trades</span>
                <span>
                  {ratingSummary && ratingSummary.avg_rating != null
                    ? <><strong>★ {Number(ratingSummary.avg_rating).toFixed(1)}</strong> ({ratingSummary.total})</>
                    : 'No ratings'}
                </span>
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

          {(fullName || profileData.college || profileData.bio) && (
            <div className="profile-bio-block">
              {fullName && <p className="profile-fullname">{fullName}</p>}
              {profileData.college && <p className="profile-college">{profileData.college}</p>}
              {profileData.bio && <p className="profile-bio">{profileData.bio}</p>}
            </div>
          )}

          <button type="button" className="profile-copy-link-btn" onClick={handleCopyLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {linkCopied ? 'Link copied!' : 'Copy profile link'}
          </button>

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
        </div>
      ) : (
        // ---------- EDIT MODE ----------
        <div className="profile-edit">
          <BackArrow onClick={() => setIsEditing(false)} label="Back to profile" />

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
              <input value={profileData?.email || ''} disabled className="profile-readonly-input" />
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
                ref={bioTextareaRef}
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, BIO_MAX_LENGTH))}
                maxLength={BIO_MAX_LENGTH}
                rows={1}
                className="profile-bio-textarea"
              />
              <span className="bio-char-count">{bio.length}/{BIO_MAX_LENGTH}</span>
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
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../features/auth/AuthContext';
import './Profile.css';

const MAX_IMAGE_SIZE_MB = 2;
const COLLEGE_OPTIONS = ["ST. ANN'S COLLEGE FOR WOMEN"];

export default function Profile() {
  const { userId } = useParams();
  const { currentUser, loading: authLoading, refreshUser } = useAuth();

  // If a userId is in the URL and it's not the logged-in user's own id,
  // we're viewing someone else's profile — read-only, fetched fresh.
  const isOwnProfile = !userId || (currentUser && userId === currentUser.id);
  const profileIdToLoad = userId || currentUser?.id;

  const [viewedUser, setViewedUser] = useState(null);
  const [viewedUserLoading, setViewedUserLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [bio, setBio] = useState('');
  const [college, setCollege] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [ratingSummary, setRatingSummary] = useState(null);
  const fileInputRef = useRef(null);

  // The user object currently being displayed, regardless of whose profile it is
  const displayUser = isOwnProfile ? currentUser : viewedUser;

  useEffect(() => {
    if (isOwnProfile && currentUser) {
      setFullName(currentUser.full_name || '');
      setProfileImage(currentUser.profile_image || '');
      setBio(currentUser.bio || '');
      setCollege(currentUser.college || '');
    }
  }, [isOwnProfile, currentUser]);

  useEffect(() => {
    if (!isOwnProfile && userId) {
      setViewedUserLoading(true);
      api.get(`/users/${userId}`)
        .then(res => setViewedUser(res.data.user))
        .catch(() => setViewedUser(null))
        .finally(() => setViewedUserLoading(false));
    }
  }, [isOwnProfile, userId]);

  useEffect(() => {
    if (profileIdToLoad) {
      api.get(`/ratings/user/${profileIdToLoad}`)
        .then(res => setRatingSummary(res.data.summary))
        .catch(() => setRatingSummary(null));
    }
  }, [profileIdToLoad]);

  async function handlePhotoSelect(e) {
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

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('photo', file);

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
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaved(false);
    setError('');

    try {
      await api.patch(`/users/${currentUser.id}`, {
        full_name: fullName,
        profile_image: profileImage,
        bio,
        college,
      });
      setSaved(true);
      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  }

  if (isOwnProfile && authLoading) return <p>Loading...</p>;
  if (isOwnProfile && !currentUser) return <p>Please log in to view your profile.</p>;
  if (!isOwnProfile && viewedUserLoading) return <p>Loading profile...</p>;
  if (!isOwnProfile && !viewedUser) return <p>This user couldn't be found.</p>;

  return (
    <div className="profile-page">
      <h2>{isOwnProfile ? 'Profile' : `@${displayUser.username}`}</h2>

      <div className="profile-photo-section">
        {(isOwnProfile ? profileImage : displayUser.profile_image) ? (
          <img
            src={isOwnProfile ? profileImage : displayUser.profile_image}
            alt="Profile"
            className="profile-photo"
          />
        ) : (
          <div className="profile-photo profile-photo-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        )}
        {isOwnProfile && (
          <>
            <button
              type="button"
              className="profile-photo-edit"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Change Photo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              style={{ display: 'none' }}
            />
          </>
        )}
      </div>

      {isOwnProfile && <p className="profile-username">@{displayUser.username}</p>}

      {ratingSummary && ratingSummary.avg_rating != null ? (
        <p>★ {Number(ratingSummary.avg_rating).toFixed(1)} ({ratingSummary.total} review{Number(ratingSummary.total) === 1 ? '' : 's'})</p>
      ) : (
        <p>No ratings yet</p>
      )}

      {error && <p className="profile-error">{error}</p>}

      {isOwnProfile ? (
        <form onSubmit={handleSave} className="profile-form">
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
            <textarea value={bio} onChange={e => setBio(e.target.value)} />
          </label>
          <button type="submit" className="profile-save">Save</button>
          {saved && <span className="profile-saved"> Saved!</span>}
        </form>
      ) : (
        <div className="profile-view-only">
          {displayUser.full_name && <p><strong>Name:</strong> {displayUser.full_name}</p>}
          {displayUser.college && <p><strong>College:</strong> {displayUser.college}</p>}
          {displayUser.bio && <p><strong>Bio:</strong> {displayUser.bio}</p>}
        </div>
      )}
    </div>
  );
}
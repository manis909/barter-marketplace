import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../features/auth/AuthContext';
import './Profile.css';

const MAX_IMAGE_SIZE_MB = 2;

export default function Profile() {
  const { currentUser, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [bio, setBio] = useState('');
  const [college, setCollege] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [ratingSummary, setRatingSummary] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full_name || '');
      setProfileImage(currentUser.profile_image || '');
      setBio(currentUser.bio || '');
      setCollege(currentUser.college || '');

      // Ratings summary comes from Member 4's endpoint, not stored on users
      api.get(`/ratings/user/${currentUser.id}`)
        .then(res => setRatingSummary(res.data.summary))
        .catch(() => setRatingSummary(null));
    }
  }, [currentUser]);

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
      // Upload goes through our own backend now, not directly to
      // Supabase — avoids the RLS/auth mismatch, since the backend
      // uses the service role key after verifying the user via
      // requireAuth.
      const formData = new FormData();
      formData.append('photo', file);

      const res = await api.post('/users/profile-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setProfileImage(res.data.profile_image);
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
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    }
  }

  if (loading) return <p>Loading...</p>;
  if (!currentUser) return <p>Please log in to view your profile.</p>;

  return (
    <div className="profile-page">
      <h2>Profile</h2>

      <div className="profile-photo-section">
        <img
          src={profileImage || 'https://placehold.co/96'}
          alt="Profile"
          className="profile-photo"
        />
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
      </div>

      <p className="profile-username">@{currentUser.username}</p>
      {ratingSummary && ratingSummary.avg_rating != null ? (
        <p>★ {Number(ratingSummary.avg_rating).toFixed(1)} ({ratingSummary.total} review{Number(ratingSummary.total) === 1 ? '' : 's'})</p>
      ) : (
        <p>No ratings yet</p>
      )}

      {error && <p className="profile-error">{error}</p>}

      <form onSubmit={handleSave} className="profile-form">
        <label>
          Full Name
          <input value={fullName} onChange={e => setFullName(e.target.value)} />
        </label>
        <label>
          College
          <input value={college} onChange={e => setCollege(e.target.value)} />
        </label>
        <label>
          Bio
          <textarea value={bio} onChange={e => setBio(e.target.value)} />
        </label>
        <button type="submit" className="profile-save">Save</button>
        {saved && <span className="profile-saved"> Saved!</span>}
      </form>
    </div>
  );
}
import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../features/auth/AuthContext';

export default function Profile() {
  const { currentUser, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [bio, setBio] = useState('');
  const [college, setCollege] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentUser) {
      setFullName(currentUser.full_name || '');
      setProfileImage(currentUser.profile_image || '');
      setBio(currentUser.bio || '');
      setCollege(currentUser.college || '');
    }
  }, [currentUser]);

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
    <div>
      <h2>Profile</h2>
      <img src={profileImage || 'https://placehold.co/96'} alt="avatar" width={96} height={96} />
      <p>@{currentUser.username}</p>
      {/* Rating is derived from the ratings table, not stored on users —
          compute with AVG(rating) once the ratings feature exists */}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSave}>
        <label>
          Full Name
          <input value={fullName} onChange={e => setFullName(e.target.value)} />
        </label>
        <label>
          Profile Image URL
          <input value={profileImage} onChange={e => setProfileImage(e.target.value)} />
        </label>
        <label>
          College
          <input value={college} onChange={e => setCollege(e.target.value)} />
        </label>
        <label>
          Bio
          <textarea value={bio} onChange={e => setBio(e.target.value)} />
        </label>
        <button type="submit">Save</button>
        {saved && <span> Saved!</span>}
      </form>
    </div>
  );
}

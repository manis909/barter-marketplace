import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../features/auth/AuthContext';
import VerifiedBadge from '../features/verification/VerifiedBadge';
import './RentalProfile.css';

// Rental listing detail pages live at /rental/:id (confirmed by Member 2 —
// route not finalized on her end yet, may change later).
// Editing and ID resubmission both navigate to /profile — the single
// source of truth for those forms, not duplicated here.
//
// TODO: "Borrowed" count is not wired up yet — waiting to confirm the
// rental bookings table name/columns with Member 3 (or whoever owns
// the borrow/booking flow). Currently only "Listed" is shown.

export default function RentalProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();

  const isOwnProfile = !userId || userId === currentUser?.id;

  const [viewedUser, setViewedUser] = useState(null);
  const [viewedUserLoading, setViewedUserLoading] = useState(!isOwnProfile);
  const profileData = isOwnProfile ? currentUser : viewedUser;

  const [ratingSummary, setRatingSummary] = useState(null);
  const [rentalListings, setRentalListings] = useState([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);

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

      const rentalsEndpoint = isOwnProfile ? '/rentals/mine' : '/rentals'
      api.get(rentalsEndpoint)
        .then(res => setRentalListings((res.data.rentals || []).filter(listing => listing.owner_id === profileData.id)))
        .catch(() => setRentalListings([]));
    }
  }, [profileData]);

  useEffect(() => {
    if (isOwnProfile) {
      api.get('/verification/status')
        .then(res => setVerificationStatus(res.data))
        .catch(() => setVerificationStatus(null));
    }
  }, [isOwnProfile]);

  function handleCopyLink() {
    const url = `${window.location.origin}/rental/profile/${profileData.id}`;
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
    <div className="rental-profile-page">
      <button
        type="button"
        className="profile-back-btn"
        onClick={() => navigate('/renter')}
        aria-label="Back to Renter"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="rental-profile-header">
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

        <div className="rental-profile-header-info">
          <p className="profile-username">
            {profileData.username}
            {profileData.is_verified && <VerifiedBadge />}
          </p>

          <div className="rental-profile-stats-row">
            <div className="profile-stat">
              <span className="profile-stat-number">{rentalListings.length}</span>
              <span className="profile-stat-label">Listed</span>
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

      {isOwnProfile && verificationStatus?.verification_status === 'rejected' && (
        <>
          <p className="verification-rejected-note">
            Rejected: {verificationStatus.verification_rejection_reason}
          </p>
          <button
            type="button"
            className="profile-copy-link"
            onClick={() => navigate('/profile')}
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

      {rentalListings.length > 0 ? (
        <div className="rental-listings-grid">
          <h3>Items for Rent</h3>
          <div className="rental-listings-grid-inner">
            {rentalListings.map(listing => (
              <Link to={`/rental/${listing.id}`} key={listing.id} className="rental-listing-card">
                <img
                  src={
                    Array.isArray(listing.image_urls) && listing.image_urls.length > 0
                      ? listing.image_urls[0]
                      : 'https://placehold.co/300'
                  }
                  alt={listing.item_name || 'Rental item'}
                  className="rental-listing-card-image"
                />
                <div className="rental-listing-card-body">
                  <span className="rental-listing-title">{listing.item_name || 'Rental item'}</span>
                  <span className="rental-listing-rate">
                    {Number(listing.rate_amount).toLocaleString('en-IN')} / {listing.rate_type === 'hourly' ? 'hour' : 'day'}
                  </span>
                  {listing.category && <p className="rental-listing-category">{listing.category}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className="rental-empty-note">No items listed for rent yet.</p>
      )}
    </div>
  );
}
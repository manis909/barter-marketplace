import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { getMySkillBookings, updateSkillBookingStatus } from '../services/skillBookingService';
import Footer from '../components/Footer';
import './MySkillBookings.css';

export default function MySkillBookingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState({});

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getMySkillBookings();
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load skill bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  async function handleStatusUpdate(bookingId, status) {
    setActionLoading(prev => ({ ...prev, [bookingId]: true }));
    try {
      await updateSkillBookingStatus(bookingId, status);
      await loadBookings();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to update status to ${status}.`);
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  }

  const filteredBookings = bookings.filter(b => {
    const currentUserId = user?.id;
    if (activeFilter === 'teaching') return b.teacher_id === currentUserId;
    if (activeFilter === 'learning') return b.requester_id === currentUserId;
    if (activeFilter === 'pending') return b.status === 'pending';
    if (activeFilter === 'accepted') return b.status === 'accepted';
    if (activeFilter === 'completed') return b.status === 'completed';
    return true;
  });

  return (
    <div className="bookings-container">
      {/* Hero Header */}
      <header className="bookings-hero">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Link to="/explore" style={{ color: '#c6e930', textDecoration: 'none', fontSize: '0.88rem', fontWeight: 600 }}>
            ← Back to Explore
          </Link>
          <h1 className="bookings-hero-title">My Skill Bookings</h1>
          <p className="bookings-hero-sub">
            Track and manage your teaching and learning sessions across campus.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="bookings-main">
        {/* Filter Bar */}
        <div className="bookings-filters">
          {[
            { id: 'all', label: 'All Sessions' },
            { id: 'teaching', label: 'Teaching (Received)' },
            { id: 'learning', label: 'Learning (Sent)' },
            { id: 'pending', label: 'Pending' },
            { id: 'accepted', label: 'Accepted' },
            { id: 'completed', label: 'Completed' },
          ].map(f => (
            <button
              key={f.id}
              className={`bookings-filter-chip ${activeFilter === f.id ? 'active' : ''}`}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && <div className="book-skill-error" style={{ marginBottom: '20px' }}>{error}</div>}

        {loading ? (
          <div className="bookings-grid">
            {[1, 2, 3].map(n => (
              <div key={n} className="booking-card" style={{ height: '220px', background: '#e5e2d8', opacity: 0.6 }} />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bookings-empty">
            <div className="bookings-empty-icon">🎓</div>
            <h3 className="bookings-empty-title">No bookings found</h3>
            <p className="bookings-empty-desc">
              {activeFilter === 'all'
                ? "You haven't requested or received any skill session bookings yet."
                : `No bookings matching the "${activeFilter}" filter.`}
            </p>
            <Link to="/explore" className="bookings-empty-btn">
              Explore Platform
            </Link>
          </div>
        ) : (
          <div className="bookings-grid">
            {filteredBookings.map(b => {
              const isTeacher = b.teacher_id === user?.id;
              const otherUsername = isTeacher ? b.requester_username : b.teacher_username;
              const otherName = isTeacher ? b.requester_name : b.teacher_name;
              const otherImage = isTeacher ? b.requester_profile_image : b.teacher_profile_image;
              const isBusy = actionLoading[b.id];

              return (
                <div key={b.id} className="booking-card">
                  <div>
                    <div className="booking-card-top">
                      <span className={`booking-role-badge ${isTeacher ? 'role-teacher' : 'role-learner'}`}>
                        {isTeacher ? 'Teacher' : 'Learner'}
                      </span>
                      <span className={`booking-status-badge status-${b.status}`}>
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </span>
                    </div>

                    <h3 className="booking-skill-title">{b.skill_name}</h3>
                    {b.skill_category && (
                      <span className="booking-skill-cat">{b.skill_category}</span>
                    )}

                    {/* Participant Details */}
                    <div className="booking-users-row">
                      {otherImage ? (
                        <img src={otherImage} alt={otherUsername} className="booking-avatar" />
                      ) : (
                        <div className="booking-avatar-placeholder">
                          {(otherUsername || 'U').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="booking-user-details">
                        <span className="booking-user-name">
                          {isTeacher ? 'Student:' : 'Teacher:'} {otherName || `@${otherUsername}`}
                        </span>
                        <span className="booking-user-handle">@{otherUsername}</span>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="booking-meta-row">
                      {b.scheduled_time && (
                        <span>📅 <strong>Scheduled:</strong> {new Date(b.scheduled_time).toLocaleString()}</span>
                      )}
                      <span>🕒 <strong>Requested:</strong> {new Date(b.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="booking-actions">
                    {b.status === 'pending' && isTeacher && (
                      <>
                        <button
                          className="booking-btn-accept"
                          onClick={() => handleStatusUpdate(b.id, 'accepted')}
                          disabled={isBusy}
                        >
                          {isBusy ? '...' : 'Accept'}
                        </button>
                        <button
                          className="booking-btn-decline"
                          onClick={() => handleStatusUpdate(b.id, 'declined')}
                          disabled={isBusy}
                        >
                          Decline
                        </button>
                      </>
                    )}

                    {b.status === 'pending' && !isTeacher && (
                      <button
                        className="booking-btn-cancel"
                        onClick={() => handleStatusUpdate(b.id, 'cancelled')}
                        disabled={isBusy}
                      >
                        Cancel Request
                      </button>
                    )}

                    {b.status === 'accepted' && (
                      <>
                        <button
                          className="booking-btn-complete"
                          onClick={() => handleStatusUpdate(b.id, 'completed')}
                          disabled={isBusy}
                        >
                          Mark Completed
                        </button>
                        <button
                          className="booking-btn-cancel"
                          onClick={() => handleStatusUpdate(b.id, 'cancelled')}
                          disabled={isBusy}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { getMyTeachingBookings, updateSkillBookingStatus } from '../services/skillBookingService';
import Footer from '../components/Footer';

const BARTER_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

:root {
  --dark: #0f3d2e;
  --green: #1b4d3e;
  --light-green: #2f6b52;
  --lime: #c6e930;
  --cream: #f7f5ee;
  --paper: #ffffff;
  --ink: #10241c;
  --muted: #647167;
  --line: rgba(15,61,46,0.12);
  --peach: #fbe8dd;
  --peach-ink: #8a4a2a;
  --sky: #e3eefc;
  --sky-ink: #2a5285;
}

.myteaching-container {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  background: var(--cream);
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  color: var(--ink);
}

.hero {
  background: linear-gradient(135deg, var(--dark) 0%, var(--green) 42%, var(--light-green) 78%, #4f8a67 100%);
  padding: 40px 24px 80px;
  position: relative;
  overflow: hidden;
}

.hero-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  border: 1.5px solid rgba(255,255,255,0.28);
  background: rgba(255,255,255,0.14);
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background 0.18s;
  text-decoration: none;
}

.hero-back:hover {
  background: rgba(255,255,255,0.26);
}

.title-card {
  background: var(--paper);
  margin: -40px 16px 0;
  border-radius: 22px;
  padding: 24px 22px;
  position: relative;
  z-index: 2;
  box-shadow: 0 12px 30px rgba(15,61,46,0.10);
}

@media (min-width: 768px) {
  .title-card {
    margin: -44px 32px 0;
    padding: 28px 32px;
    border-radius: 26px;
  }
}

.title-card h1 {
  font-family: 'Fraunces', serif;
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--dark);
}

.section-label {
  margin: 28px 16px 12px;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--muted);
  text-transform: uppercase;
  font-weight: 600;
}

@media (min-width: 768px) {
  .section-label { margin: 32px 32px 14px; }
}

.listing-card {
  background: var(--paper);
  border-radius: 22px;
  border: 1.5px solid var(--line);
  box-shadow: 0 4px 16px rgba(15,61,46,0.06);
  margin: 0 16px 24px;
  padding: 24px;
}

@media (min-width: 768px) {
  .listing-card {
    margin: 0 32px 28px;
    padding: 28px;
  }
}

.listing-header {
  border-bottom: 1.5px solid var(--line);
  padding-bottom: 16px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 12px;
}

.listing-title {
  font-family: 'Fraunces', serif;
  font-size: 22px;
  font-weight: 700;
  color: var(--dark);
  margin: 0 0 6px 0;
}

.listing-meta {
  font-size: 12px;
  color: var(--muted);
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.spots-badge {
  font-family: 'IBM Plex Mono', monospace;
  background: var(--dark);
  color: var(--lime);
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
}

.learner-requests {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.learner-row {
  background: rgba(15,61,46,0.02);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 14px;
}

@media (min-width: 768px) {
  .learner-row {
    flex-direction: row;
    align-items: center;
  }
}

.learner-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--dark);
  color: var(--lime);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 15px;
}

.actions-row {
  display: flex;
  gap: 8px;
}

.badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 10px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
}

.badge-pending { background: #fef3c7; color: #92400e; }
.badge-accepted { background: #d1fae5; color: #065f46; }
.badge-declined { background: #fee2e2; color: #991b1b; }
.badge-completed { background: #e0f2fe; color: #075985; }
.badge-cancelled { background: #f3f4f6; color: #4b5563; }

.btn-accept {
  background: var(--dark);
  color: var(--lime);
  border: none;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-accept:hover { opacity: 0.9; }

.btn-decline {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-decline:hover { background: #fecaca; }

.btn-complete {
  background: #2563eb;
  color: #fff;
  border: none;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 700;
  border-radius: 10px;
  cursor: pointer;
}
.btn-complete:hover { opacity: 0.9; }
`;

export default function MyTeaching() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const fetchTeaching = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMyTeachingBookings();
      setListings(data.listings || []);
      setBookings(data.bookings || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load teaching bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { setLoading(false); return; }
    fetchTeaching();
  }, [authLoading, currentUser, fetchTeaching]);

  const handleStatusUpdate = async (bookingId, status) => {
    setActionLoading(prev => ({ ...prev, [bookingId]: true }));
    try {
      await updateSkillBookingStatus(bookingId, status);
      await fetchTeaching();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to update status to ${status}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ background: '#f7f5ee', minHeight: '100vh', width: '100%', padding: 40, textAlign: 'center' }}>
        <style>{BARTER_CSS}</style>
        <p>Loading your teaching sessions...</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh', width: '100%' }}>
      <div className="myteaching-container">
        <style>{BARTER_CSS}</style>

        <div className="hero">
          <button type="button" className="hero-back" onClick={() => navigate(-1)} aria-label="Go back">←</button>
        </div>

        <div className="title-card">
          <h1>My Teaching</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>
            Manage requests and capacity for the skills you teach.
          </p>
        </div>

        <div className="section-label">Your Listings & Requests</div>

        {listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 22, margin: '0 16px 24px', border: '1px dashed var(--line)' }}>
            <p style={{ color: 'var(--muted)', margin: '0 0 16px' }}>You haven't posted any skill listings yet.</p>
            <Link to="/explore" style={{ padding: '10px 20px', background: 'var(--dark)', color: 'var(--lime)', textDecoration: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14 }}>
              Explore Platform
            </Link>
          </div>
        ) : (
          listings.map(listing => {
            const listingBookings = bookings.filter(b => b.skill_listing_id === listing.id);

            return (
              <div key={listing.id} className="listing-card">
                <div className="listing-header">
                  <div>
                    <h3 className="listing-title">{listing.skill_name}</h3>
                    <div className="listing-meta">
                      {listing.category && <span>📁 {listing.category}</span>}
                      <span>👥 Type: {listing.session_type === 'group' ? 'Group Session' : '1-on-1'}</span>
                    </div>
                  </div>
                  <div className="spots-badge">
                    {listing.accepted_count} / {listing.max_participants} Spots Filled
                  </div>
                </div>

                <div className="learner-requests">
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>
                    Learner Requests ({listingBookings.length})
                  </h4>

                  {listingBookings.length === 0 ? (
                    <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0 0', italic: 'true' }}>
                      No requests received for this listing yet.
                    </p>
                  ) : (
                    listingBookings.map(b => {
                      const isBusy = actionLoading[b.id];
                      return (
                        <div key={b.id} className="learner-row">
                          <div className="learner-info">
                            <div className="avatar">
                              {(b.learner_username || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>
                                {b.learner_name || `@${b.learner_username}`}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                                Requested on {new Date(b.created_at).toLocaleDateString()}
                              </div>
                              {b.scheduled_time && (
                                <div style={{ fontSize: 12, color: 'var(--light-green)', fontWeight: 500, marginTop: 2 }}>
                                  📅 Scheduled: {new Date(b.scheduled_time).toLocaleString()}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span className={`badge badge-${b.status}`}>{b.status}</span>
                            
                            {b.status === 'pending' && (
                              <div className="actions-row">
                                <button
                                  className="btn-accept"
                                  onClick={() => handleStatusUpdate(b.id, 'accepted')}
                                  disabled={isBusy || (listing.accepted_count >= listing.max_participants)}
                                >
                                  {isBusy ? '...' : 'Accept'}
                                </button>
                                <button
                                  className="btn-decline"
                                  onClick={() => handleStatusUpdate(b.id, 'declined')}
                                  disabled={isBusy}
                                >
                                  Decline
                                </button>
                              </div>
                            )}

                            {b.status === 'accepted' && (
                              <div className="actions-row">
                                <button
                                  className="btn-complete"
                                  onClick={() => handleStatusUpdate(b.id, 'completed')}
                                  disabled={isBusy}
                                >
                                  {isBusy ? '...' : 'Complete'}
                                </button>
                                <button
                                  className="btn-decline"
                                  onClick={() => handleStatusUpdate(b.id, 'cancelled')}
                                  disabled={isBusy}
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      <Footer />
    </div>
  );
}

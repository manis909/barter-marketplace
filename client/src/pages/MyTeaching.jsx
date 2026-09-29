import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { getMyTeachingBookings, updateSkillBookingStatus } from '../services/skillBookingService';
import Footer from '../components/Footer';
import RatingForm from '../features/ratings/RatingForm';
import api from '../services/api';

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

/* ── Top bar (Apple × Duolingo — no green headboard) ── */
.page-top-bar {
  padding: 24px 20px 0;
}
@media (min-width: 768px) {
  .page-top-bar { padding: 32px 36px 0; }
}

.page-back-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border-radius: 999px;
  border: 1px solid rgba(15,61,46,0.15);
  background: #ffffff;
  color: var(--dark);
  cursor: pointer;
  transition: all 0.15s ease;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.page-back-btn:hover {
  background: #f0f4f1;
  border-color: rgba(15,61,46,0.25);
}

.title-card {
  background: var(--paper);
  margin: 16px 16px 0;
  border-radius: 22px;
  padding: 24px 22px;
  position: relative;
  z-index: 2;
  border: 1px solid rgba(15,61,46,0.08);
  box-shadow: 0 4px 20px rgba(15,61,46,0.05);
}

@media (min-width: 768px) {
  .title-card {
    margin: 18px 32px 0;
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

/* ════════════════════════════════════════════════════════════
   MOBILE COMPACT  ≤ 520px  —  desktop unchanged
   ════════════════════════════════════════════════════════════ */
@media (max-width: 520px) {

  /* 1. Header */
  .page-top-bar { display: none; }

  .title-card {
    margin: 0 !important;
    border-radius: 0 !important;
    border-left: none; border-right: none; border-top: none;
    padding: 10px 14px !important;
    min-height: 56px;
    position: sticky; top: 0; z-index: 50;
    box-shadow: 0 1px 4px rgba(15,61,46,0.07);
  }
  .title-card h1 { font-size: 20px !important; margin: 0 0 2px !important; }
  .title-card p  { font-size: 12px !important; margin: 0 !important; }

  /* 2. Section label */
  .section-label { margin: 10px 12px 8px !important; font-size: 11px; }

  /* 3. Listing card: tighter */
  .listing-card {
    margin: 0 10px 14px !important;
    padding: 16px 14px !important;
    border-radius: 16px !important;
  }

  .listing-header {
    padding-bottom: 12px;
    margin-bottom: 14px;
    gap: 8px;
  }

  /* Skill thumb in listing header */
  .listing-header img[style*="width: 56px"],
  .listing-header img[style*="width:56px"] {
    width: 42px !important;
    height: 42px !important;
  }

  .listing-title { font-size: 17px !important; }
  .listing-meta  { font-size: 11px; gap: 8px; }
  .spots-badge   { font-size: 11px; padding: 4px 9px; }

  /* 4. Learner rows: keep stacked (already column on mobile), tighter */
  .learner-row {
    padding: 12px;
    border-radius: 12px;
    gap: 10px;
  }
  .learner-requests { gap: 10px; }

  .avatar { width: 34px; height: 34px; font-size: 13px; }

  /* Learner name + date */
  .learner-info > div > div:first-child { font-size: 13px; }
  .learner-info > div > div:nth-child(2) { font-size: 11px; }

  /* 5. Action buttons */
  .actions-row { gap: 6px; flex-wrap: wrap; }
  .btn-accept,
  .btn-decline,
  .btn-complete {
    padding: 7px 12px;
    font-size: 12px;
    border-radius: 9px;
  }
}
`;

export default function MyTeaching() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(false);

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

    // Load subscription status in parallel (non-blocking)
    try {
      const subRes = await api.get('/tutor-subscription/mine');
      setSubscription(subRes.data);
    } catch {
      // Not critical — subscription banner is optional
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

        <div className="page-top-bar">
          <button type="button" className="page-back-btn" onClick={() => navigate(-1)} aria-label="Go back">← Back</button>
        </div>

        <div className="title-card">
          <h1>My Teaching</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>
            Manage requests and capacity for the skills you teach.
          </p>
        </div>

        {/* ── Subscription status banner ── */}
        {subscription && (
          <div style={{
            margin: '14px 16px 0',
            padding: '12px 16px',
            borderRadius: 12,
            background: subscription.is_active ? '#f0fdf4' : '#fefce8',
            border: `1px solid ${subscription.is_active ? '#bbf7d0' : '#fde68a'}`,
            fontSize: 13,
          }}>
            {subscription.is_active ? (
              <span style={{ color: '#15803d', fontWeight: 600 }}>
                ✅ Unlimited plan active — 5% platform fee.{' '}
                Expires {new Date(subscription.subscription?.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.
              </span>
            ) : subscription.subscription?.payment_status === 'pending_verification' ? (
              <span style={{ color: '#92400e', fontWeight: 600 }}>
                ⏳ Plan payment submitted — awaiting admin verification.
              </span>
            ) : (
              <span style={{ color: '#92400e', fontWeight: 600 }}>
                You're on the standard plan (15% / 10% fee).{' '}
                <button
                  type="button"
                  style={{
                    background: 'none', border: '1px solid #d97706', borderRadius: 6,
                    padding: '2px 10px', fontSize: 12, fontWeight: 700,
                    color: '#92400e', cursor: 'pointer', marginLeft: 6,
                  }}
                  onClick={async () => {
                    if (subLoading) return;
                    setSubLoading(true);
                    try {
                      await api.post('/tutor-subscription');
                      const res = await api.get('/tutor-subscription/mine');
                      setSubscription(res.data);
                      alert('Subscription created! Upload your payment screenshot to activate the plan.');
                    } catch (e) {
                      alert(e.response?.data?.error || 'Could not create subscription.');
                    } finally {
                      setSubLoading(false);
                    }
                  }}
                  disabled={subLoading}
                >
                  {subLoading ? '…' : 'Get Unlimited (₹149/month)'}
                </button>
              </span>
            )}
          </div>
        )}

        <div className="section-label">Your Listings & Requests</div>

        {listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 22, margin: '0 16px 24px', border: '1px dashed var(--line)' }}>
            <p style={{ color: 'var(--muted)', margin: '0 0 16px' }}>You haven't posted any skill listings yet.</p>
            <Link to="/skilter/skills" style={{ padding: '10px 20px', background: 'var(--dark)', color: 'var(--lime)', textDecoration: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14 }}>
              My Skills
            </Link>
          </div>
        ) : (
          listings.map(listing => {
            const listingBookings = bookings.filter(b => b.skill_listing_id === listing.id);

            return (
              <div key={listing.id} className="listing-card">
                <div className="listing-header">
                  <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <img
                      src={
                        Array.isArray(listing.image_urls) && listing.image_urls[0]
                          ? listing.image_urls[0]
                          : 'https://via.placeholder.com/56x56?text=Skill'
                      }
                      alt={listing.skill_name}
                      style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--line)' }}
                      onError={e => { e.currentTarget.src = 'https://via.placeholder.com/56x56?text=Skill'; }}
                    />
                    <div>
                      <h3 className="listing-title">{listing.skill_name}</h3>
                      <div className="listing-meta">
                        {listing.category && <span>📁 {listing.category}</span>}
                        <span>👥 Type: {listing.session_type === 'group' ? 'Group Session' : '1-on-1'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="spots-badge" style={{ background: 'var(--peach)', color: 'var(--peach-ink)' }}>
                    {listing.accepted_count} / {listing.max_participants} Spots Paid ({listing.spots_left > 0 ? `${listing.spots_left} left` : 'Full'})
                  </div>
                </div>

                <div className="learner-requests">
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--muted)' }}>
                    Learner Bookings & Reservations ({listingBookings.length})
                  </h4>

                  {listingBookings.length === 0 ? (
                    <p style={{ color: 'var(--muted)', fontSize: 13, margin: '4px 0 0 0', fontStyle: 'italic' }}>
                      No requests received for this listing yet.
                    </p>
                  ) : (
                    listingBookings.map(b => {
                      const isBusy = actionLoading[b.id];
                      const isUnpaid = b.payment_status === 'unpaid';
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
                              {/* Fee/payout chip — tutor-only, shown when snapshotted */}
                              {b.tutor_payout_amount != null && (
                                <div style={{
                                  fontSize: 11, marginTop: 4, display: 'inline-flex',
                                  gap: 6, flexWrap: 'wrap',
                                }}>
                                  <span style={{
                                    background: 'rgba(21,128,61,0.10)', color: '#15803d',
                                    padding: '2px 7px', borderRadius: 6, fontWeight: 600,
                                  }}>
                                    → ₹{Number(b.tutor_payout_amount).toLocaleString('en-IN')} your payout
                                  </span>
                                  <span style={{
                                    background: 'rgba(180,83,9,0.08)', color: '#b45309',
                                    padding: '2px 7px', borderRadius: 6,
                                  }}>
                                    − ₹{Number(b.fee_amount).toLocaleString('en-IN')} fee
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span className={`badge badge-${isUnpaid && b.status === 'pending' ? 'pending' : b.status}`}>
                              {isUnpaid && b.status === 'pending' ? 'reserved (unpaid)' : b.status}
                            </span>
                            
                            {b.status === 'pending' && isUnpaid && (
                              <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                                Waiting for learner payment
                              </span>
                            )}

                            {b.status === 'accepted' && (
                              <div className="actions-row">
                                <Link
                                  to={`/skilter/chat/${b.id}`}
                                  style={{
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    borderRadius: '10px',
                                    textDecoration: 'none',
                                    background: 'var(--dark)',
                                    color: 'var(--lime)',
                                    display: 'inline-flex',
                                    alignItems: 'center'
                                  }}
                                >
                                  💬 Chat
                                </Link>
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
                            {b.status === 'completed' && (
                              <RatingForm
                                skillBookingId={b.id}
                                revieweeId={b.requester_id}
                              />
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

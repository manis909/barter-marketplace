import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { getMySkillBookings, updateSkillBookingStatus } from '../services/skillBookingService';
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

@keyframes shimmer {
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
}

.skeleton {
  background: linear-gradient(90deg, var(--line) 25%, rgba(15,61,46,0.06) 50%, var(--line) 75%);
  background-size: 600px 100%;
  animation: shimmer 1.4s infinite linear;
  border-radius: 8px;
}

.mylearning-container {
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

.segment {
  display: flex;
  margin: 28px 16px 4px;
  background: rgba(15,61,46,0.06);
  border-radius: 12px;
  padding: 4px;
}

@media (min-width: 768px) {
  .segment {
    margin: 32px 32px 4px;
  }
}

.segment button {
  flex: 1;
  border: none;
  background: transparent;
  padding: 10px 0;
  font-family: 'Inter';
  font-weight: 600;
  font-size: 13.5px;
  color: var(--muted);
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.segment button.on {
  background: var(--dark);
  color: #fff;
}

.section-label {
  margin: 20px 16px 10px;
  font-size: 12px;
  letter-spacing: 0.06em;
  color: var(--muted);
  text-transform: uppercase;
  font-weight: 600;
}

@media (min-width: 768px) {
  .section-label { margin: 24px 32px 12px; }
}

.cards-grid {
  padding: 0 16px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: start;
}

@media (min-width: 768px) {
  .cards-grid {
    padding: 0 32px;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }
}

@media (min-width: 1400px) {
  .cards-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Ticket/Card style */
.ticket-card {
  background: var(--paper);
  border-radius: 20px;
  border: 1px solid var(--line);
  box-shadow: 0 2px 8px rgba(15,61,46,0.04);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ticket-header {
  padding: 16px 20px;
  background: rgba(15,61,46,0.02);
  border-bottom: 1.5px dashed var(--line);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Circular notches at the ticket perforation line */
.ticket-header::before,
.ticket-header::after {
  content: '';
  position: absolute;
  bottom: -7px;
  width: 14px;
  height: 14px;
  background: var(--cream);
  border-radius: 50%;
  border: 1px solid var(--line);
  z-index: 2;
}

.ticket-header::before {
  left: -8px;
}

.ticket-header::after {
  right: -8px;
}

.ticket-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex-grow: 1;
}

.ticket-actions {
  margin-top: auto;
  padding: 16px 20px;
  border-top: 1px solid var(--line);
  background: rgba(15,61,46,0.01);
  display: flex;
  gap: 10px;
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

.btn-primary {
  background: var(--dark);
  color: #fff;
  border: none;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-primary:hover { opacity: 0.9; }

.btn-secondary {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--line);
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-secondary:hover { background: rgba(15,61,46,0.03); color: var(--dark); }
`;

export default function MyLearning() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [actionLoading, setActionLoading] = useState({});

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getMySkillBookings();
      // Filter where I am learner
      const mySent = (data.bookings || []).filter(b => b.requester_id === currentUser?.id);
      setBookings(mySent);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { setLoading(false); return; }
    fetchBookings();
  }, [authLoading, currentUser, fetchBookings]);

  const handleCancel = async (bookingId) => {
    setActionLoading(prev => ({ ...prev, [bookingId]: true }));
    try {
      await updateSkillBookingStatus(bookingId, 'cancelled');
      await fetchBookings();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel booking.');
    } finally {
      setActionLoading(prev => ({ ...prev, [bookingId]: false }));
    }
  };

  const activeBookings = bookings.filter(b => b.status === 'pending' || b.status === 'accepted');
  const pastBookings = bookings.filter(b => b.status === 'completed' || b.status === 'declined' || b.status === 'cancelled');

  if (authLoading || loading) {
    return (
      <div style={{ background: '#f7f5ee', minHeight: '100vh', width: '100%', padding: 40, textAlign: 'center' }}>
        <style>{BARTER_CSS}</style>
        <p>Loading your learning sessions...</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh', width: '100%' }}>
      <div className="mylearning-container">
        <style>{BARTER_CSS}</style>

        <div className="hero">
          <button type="button" className="hero-back" onClick={() => navigate(-1)} aria-label="Go back">←</button>
        </div>

        <div className="title-card">
          <h1>My Learning</h1>
          <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>
            Sessions you have requested or booked to learn from others.
          </p>
        </div>

        <div className="segment">
          <button
            type="button"
            className={activeTab === 'active' ? 'on' : ''}
            onClick={() => setActiveTab('active')}
          >
            Active ({activeBookings.length})
          </button>
          <button
            type="button"
            className={activeTab === 'history' ? 'on' : ''}
            onClick={() => setActiveTab('history')}
          >
            History ({pastBookings.length})
          </button>
        </div>

        <div className="section-label">
          {activeTab === 'active' ? 'Active Sessions' : 'Past Sessions'}
        </div>

        <div className="cards-grid">
          {(activeTab === 'active' ? activeBookings : pastBookings).length === 0 ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', background: '#fff', borderRadius: 20, border: '1px dashed var(--line)' }}>
              <p style={{ color: 'var(--muted)', margin: 0 }}>No sessions found here.</p>
            </div>
          ) : (
            (activeTab === 'active' ? activeBookings : pastBookings).map(b => (
              <div key={b.id} className="ticket-card">
                <div className="ticket-header">
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--dark)' }}>
                    Session with @{b.teacher_username}
                  </span>
                  <span className={`badge badge-${b.status}`}>{b.status}</span>
                </div>
                <div className="ticket-body">
                  <h3 style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: 18, color: 'var(--dark)' }}>
                    {b.skill_name}
                  </h3>
                  {b.skill_category && (
                    <div>
                      <span style={{ fontSize: 11, background: 'rgba(15,61,46,0.06)', padding: '2px 8px', borderRadius: 4, fontWeight: 600, color: 'var(--light-green)' }}>
                        {b.skill_category}
                      </span>
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {b.scheduled_time && (
                      <span>📅 <strong>Scheduled:</strong> {new Date(b.scheduled_time).toLocaleString()}</span>
                    )}
                    <span>🕒 <strong>Requested:</strong> {new Date(b.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                {activeTab === 'active' && (
                  <div className="ticket-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => handleCancel(b.id)}
                      disabled={actionLoading[b.id]}
                    >
                      {actionLoading[b.id] ? '...' : 'Cancel Request'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

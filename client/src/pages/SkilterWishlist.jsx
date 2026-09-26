import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Sparkles, ArrowLeft, Trash2, Tag, User, BookOpen, ChevronRight, CheckCircle2 } from 'lucide-react';
import { getSkillWishlist, removeSkillWishlist, addSkillWishlist } from '../services/skillWishlistService';
import { createSkillBooking } from '../services/skillBookingService';
import { getErrorMessage } from '../utils/helpers';
import { useAuth } from '../features/auth/AuthContext';
import Footer from '../components/Footer';

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');

.sw-page {
  min-height: 100vh;
  background: #f8f7f2;
  color: #10241c;
  font-family: 'Inter', sans-serif;
  padding: 32px 20px 64px;
}
.sw-container {
  max-width: 960px;
  margin: 0 auto;
}
.sw-back {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(15,61,46,0.15);
  background: #ffffff;
  color: #0f3d2e;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  margin-bottom: 24px;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.sw-back:hover {
  background: #f0f4f1;
  border-color: rgba(15,61,46,0.25);
}
.sw-header {
  margin-bottom: 28px;
}
.sw-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.sw-title {
  font-family: 'Fraunces', serif;
  font-size: 32px;
  font-weight: 700;
  color: #0f3d2e;
  margin: 0;
  letter-spacing: -0.02em;
}
.sw-count-badge {
  font-size: 13px;
  font-weight: 700;
  background: rgba(198,233,48,0.25);
  color: #0f3d2e;
  border: 1px solid rgba(198,233,48,0.6);
  padding: 4px 12px;
  border-radius: 999px;
}
.sw-subtitle {
  font-size: 14.5px;
  color: #5d7067;
  margin: 8px 0 0;
  max-width: 580px;
  line-height: 1.5;
}

.sw-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.sw-card {
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid rgba(15,61,46,0.08);
  box-shadow: 0 4px 16px rgba(15,61,46,0.04);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.sw-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 24px rgba(15,61,46,0.08);
}
.sw-card-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #f4f3ed;
  overflow: hidden;
  display: grid;
  place-items: center;
}
.sw-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sw-remove-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(0,0,0,0.08);
  background: #ffffff;
  color: #ef4444;
  display: grid;
  place-items: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
  transition: all 0.15s;
}
.sw-remove-btn:hover {
  background: #fef2f2;
  transform: scale(1.08);
}
.sw-card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 10px;
}
.sw-card-badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.sw-category-badge {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(15,61,46,0.08);
  color: #0f3d2e;
}
.sw-session-badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
}
.sw-card-title {
  font-family: 'Fraunces', serif;
  font-size: 17px;
  font-weight: 700;
  color: #10241c;
  margin: 0;
  line-height: 1.3;
}
.sw-card-teacher {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: #647167;
}
.sw-card-rate {
  margin-top: auto;
  font-size: 16px;
  font-weight: 800;
  color: #0f3d2e;
}
.sw-card-rate small {
  font-size: 12px;
  font-weight: 600;
  color: #647167;
}
.sw-card-actions {
  display: flex;
  gap: 8px;
  padding-top: 4px;
}
.sw-book-btn {
  flex: 1;
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  border: 0;
  background: #0f3d2e;
  color: #ffffff;
  font-size: 13.5px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: background 0.15s;
}
.sw-book-btn:hover {
  background: #1b4d3e;
}
.sw-view-btn {
  height: 38px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid rgba(15,61,46,0.15);
  background: #ffffff;
  color: #0f3d2e;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
}
.sw-view-btn:hover {
  background: #f0f4f1;
}

.sw-empty {
  text-align: center;
  padding: 64px 20px;
  background: #ffffff;
  border-radius: 24px;
  border: 1px solid rgba(15,61,46,0.08);
  box-shadow: 0 4px 20px rgba(15,61,46,0.04);
}
.sw-empty-icon {
  width: 60px;
  height: 60px;
  border-radius: 20px;
  background: rgba(15,61,46,0.06);
  color: #0f3d2e;
  display: grid;
  place-items: center;
  margin: 0 auto 18px;
}
.sw-empty h3 {
  font-family: 'Fraunces', serif;
  font-size: 22px;
  color: #0f3d2e;
  margin: 0 0 8px;
}
.sw-empty p {
  font-size: 14px;
  color: #647167;
  max-width: 360px;
  margin: 0 auto 22px;
  line-height: 1.5;
}
.sw-explore-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 14px;
  background: #c6e930;
  color: #0f3d2e;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 6px 18px rgba(198,233,48,0.35);
  transition: transform 0.15s;
}
.sw-explore-btn:hover {
  transform: translateY(-2px);
}

.sw-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: #0f3d2e;
  color: #ffffff;
  padding: 10px 20px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 10px 30px rgba(15,61,46,0.25);
  z-index: 1300;
  font-size: 14px;
  font-weight: 500;
}
.sw-toast-undo {
  background: #c6e930;
  color: #0f3d2e;
  border: none;
  border-radius: 16px;
  padding: 3px 12px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
`;

export default function SkilterWishlist() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [wishlist, setWishlist]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [removedToast, setRemovedToast] = useState(null);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSkillWishlist();
      setWishlist(data.wishlist ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { setLoading(false); return; }
    fetchWishlist();
  }, [authLoading, currentUser, fetchWishlist]);

  const handleRemove = useCallback(async (skillId) => {
    const itemToRemove = wishlist.find(i => i.id === skillId);
    await removeSkillWishlist(skillId);
    setWishlist(prev => prev.filter(item => item.id !== skillId));
    if (itemToRemove) {
      setRemovedToast(itemToRemove);
    }
  }, [wishlist]);

  const handleUndo = useCallback(async () => {
    if (!removedToast) return;
    try {
      await addSkillWishlist(removedToast.id);
      setWishlist(prev => [removedToast, ...prev]);
    } catch (err) {
      console.error('Failed to undo skill wishlist removal:', err);
    } finally {
      setRemovedToast(null);
    }
  }, [removedToast]);

  useEffect(() => {
    if (!removedToast) return;
    const timer = setTimeout(() => setRemovedToast(null), 6000);
    return () => clearTimeout(timer);
  }, [removedToast]);

  return (
    <>
      <style>{CSS}</style>
      <div className="sw-page">
        <div className="sw-container">
          <Link to="/skilter/explore" className="sw-back">
            <ArrowLeft size={15} /> Back to Skilter
          </Link>

          <header className="sw-header">
            <div className="sw-title-row">
              <h1 className="sw-title">Skills Wishlist</h1>
              {wishlist.length > 0 && (
                <span className="sw-count-badge">
                  {wishlist.length} {wishlist.length === 1 ? 'skill' : 'skills'}
                </span>
              )}
            </div>
            <p className="sw-subtitle">
              Saved sessions and mentors you'd like to learn from or swap skills with.
            </p>
          </header>

          {!authLoading && !currentUser ? (
            <div className="sw-empty">
              <div className="sw-empty-icon">🔐</div>
              <h3>You're not logged in</h3>
              <p>Please log in to view and manage your skill wishlist.</p>
              <Link to="/login" className="sw-explore-btn">
                Log In <ChevronRight size={16} />
              </Link>
            </div>
          ) : loading ? (
            <p style={{ color: '#5d7067', fontSize: 14 }}>Loading saved skills…</p>
          ) : error ? (
            <div className="sw-empty">
              <h3>Could not load wishlist</h3>
              <p>{error}</p>
              <button
                type="button"
                onClick={fetchWishlist}
                className="sw-explore-btn"
                style={{ cursor: 'pointer', border: 0 }}
              >
                Try Again
              </button>
            </div>
          ) : wishlist.length === 0 ? (
            <div className="sw-empty">
              <div className="sw-empty-icon">
                <Heart size={28} />
              </div>
              <h3>Your skill wishlist is empty</h3>
              <p>Explore mentors and workshops on Skilter to save them for later.</p>
              <Link to="/skilter/explore" className="sw-explore-btn">
                Explore Skills <ChevronRight size={16} />
              </Link>
            </div>
          ) : (
            <div className="sw-grid">
              {wishlist.map(skill => (
                <SkillWishlistCard
                  key={skill.wishlist_id || skill.id}
                  skill={skill}
                  onRemove={() => handleRemove(skill.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {removedToast && (
        <div className="sw-toast" role="status" aria-live="polite">
          <span>✓ Removed <strong>{removedToast.skill_name || removedToast.title}</strong> from wishlist</span>
          <button type="button" onClick={handleUndo} className="sw-toast-undo">
            Undo
          </button>
        </div>
      )}
      <Footer />
    </>
  );
}

function SkillWishlistCard({ skill, onRemove }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [booking, setBooking] = useState({ loading: false, error: '', success: false });

  const image = Array.isArray(skill.photo_urls) && skill.photo_urls.length
    ? skill.photo_urls[0]
    : Array.isArray(skill.image_urls) && skill.image_urls.length
    ? skill.image_urls[0]
    : skill.image_url || '';

  const skillName = skill.skill_name || skill.title || 'Skill Session';
  const priceDisplay = skill.price_type === 'free' || !skill.price
    ? 'Free'
    : `₹${Number(skill.price).toLocaleString('en-IN')}`;

  async function handleBook() {
    if (!currentUser) { navigate('/login'); return; }
    setBooking({ loading: true, error: '', success: false });
    try {
      await createSkillBooking(skill.id);
      setBooking({ loading: false, error: '', success: true });
      setTimeout(() => navigate('/skilter/learning'), 1200);
    } catch (err) {
      setBooking({ loading: false, error: getErrorMessage(err), success: false });
    }
  }

  return (
    <article className="sw-card">
      <div className="sw-card-media">
        {image ? (
          <img src={image} alt={skillName} className="sw-card-img" />
        ) : (
          <BookOpen size={40} color="#7a8c84" />
        )}
        <button
          type="button"
          className="sw-remove-btn"
          onClick={onRemove}
          aria-label="Remove from wishlist"
          title="Remove from wishlist"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="sw-card-body">
        <div className="sw-card-badges">
          <span className="sw-category-badge">{skill.category || 'Skill'}</span>
          {skill.session_type && (
            <span className="sw-session-badge">
              {skill.session_type === 'one_on_one' ? '1-on-1' : 'Group'}
            </span>
          )}
        </div>

        <h2 className="sw-card-title">{skillName}</h2>

        <div className="sw-card-teacher">
          <User size={13} />
          <span>{skill.teacher_name || skill.teacher_username || 'Mentor'}</span>
        </div>

        <div className="sw-card-rate">
          {priceDisplay}
          {skill.price_type !== 'free' && skill.price && (
            <small> / session</small>
          )}
        </div>

        {booking.error && (
          <p style={{ color: '#dc2626', fontSize: 12, margin: '2px 0 0' }}>{booking.error}</p>
        )}

        <div className="sw-card-actions">
          <button
            type="button"
            className="sw-book-btn"
            onClick={handleBook}
            disabled={booking.loading || booking.success}
          >
            {booking.loading ? 'Booking…' : booking.success ? '✓ Booked!' : 'Book Session'}
          </button>
          <Link to={`/skilter/skills/${skill.id}`} className="sw-view-btn">
            View
          </Link>
        </div>
      </div>
    </article>
  );
}

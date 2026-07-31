import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import TradeCard from '../features/trades/TradeCard';
import { getMyTrades, acceptTrade, declineTrade } from '../services/tradeService';
import { getErrorMessage } from '../utils/helpers';
import { TRADE_STATUS } from '../utils/constants';
import { useAuth } from '../features/auth/AuthContext';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ── Shared design system — identical to MyTrades ──────────────────────────
const BARTER_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');

:root {
  --dark: #0f3d2e;
  --green: #1b4d3e;
  --light-green: #2f6b52;
  --lime: #c6e930;
  --lime-hover: #b3d426;
  --cream: #f7f5ee;
  --paper: #ffffff;
  --ink: #10241c;
  --muted: #647167;
  --line: rgba(15,61,46,0.12);
  --radius: 20px;
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

.tr-container {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  background: var(--cream);
  min-height: 100vh;
  font-family: 'Inter', sans-serif;
  color: var(--ink);
}
@media (max-width: 1260px) {
  .tr-container { box-shadow: 0 0 60px rgba(15,61,46,0.08); }
}

.hero {
  background: linear-gradient(135deg, var(--dark) 0%, var(--green) 42%, var(--light-green) 78%, #4f8a67 100%);
  padding: 40px 24px 80px;
  position: relative;
  overflow: hidden;
}
@media (min-width: 768px) {
  .hero { padding: 52px 40px 90px; }
}
.hero::after {
  content: "";
  position: absolute;
  right: -40px; top: -60px;
  width: 220px; height: 220px;
  border-radius: 50%;
  background: var(--lime);
  opacity: 0.14;
}
.hero-back {
  display: inline-flex;
  align-items: center; justify-content: center;
  width: 38px; height: 38px;
  border-radius: 12px;
  border: 1.5px solid rgba(255,255,255,0.28);
  background: rgba(255,255,255,0.14);
  color: #fff; cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background 0.18s;
  font-size: 18px; line-height: 1;
}
.hero-back:hover { background: rgba(255,255,255,0.26); }

.title-card {
  background: var(--paper);
  margin: -40px 16px 0;
  border-radius: 22px;
  padding: 24px 22px;
  position: relative; z-index: 2;
  box-shadow: 0 12px 30px rgba(15,61,46,0.10);
}
@media (min-width: 768px) {
  .title-card { margin: -44px 32px 0; padding: 28px 32px; border-radius: 26px; }
}
.title-card h1 {
  font-family: 'Fraunces', serif;
  font-size: 28px; font-weight: 700;
  margin: 0 0 12px; color: var(--dark);
}
@media (min-width: 768px) {
  .title-card h1 { font-size: 34px; margin-bottom: 16px; }
}
.stat-row { display: flex; gap: 28px; }
.stat b { font-family: 'IBM Plex Mono', monospace; font-size: 22px; color: var(--dark); display: block; }
.stat span { font-size: 11.5px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; }

.section-label {
  margin: 20px 16px 10px;
  font-size: 12px; letter-spacing: 0.06em;
  color: var(--muted); text-transform: uppercase; font-weight: 600;
}
@media (min-width: 768px) { .section-label { margin: 24px 32px 12px; } }

.cards-grid {
  padding: 0 16px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  align-items: start;
}
@media (min-width: 768px) {
  .cards-grid { padding: 0 32px; grid-template-columns: repeat(2, 1fr); gap: 20px; }
}
@media (min-width: 1400px) {
  .cards-grid { grid-template-columns: repeat(3, 1fr); }
}
.footer-space { height: 40px; }
`;

function SkeletonCard() {
  return (
    <div aria-hidden="true" style={{ border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--paper)' }}>
      <div style={{ height: 32, background: 'rgba(0,0,0,0.02)' }} />
      <div style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
          <div>
            <div className="skeleton" style={{ height: 10, width: 70, marginBottom: 5 }} />
            <div className="skeleton" style={{ height: 16, width: 110 }} />
          </div>
          <div>
            <div className="skeleton" style={{ height: 10, width: 70, marginBottom: 5 }} />
            <div className="skeleton" style={{ height: 16, width: 110 }} />
          </div>
        </div>
        <div className="skeleton" style={{ height: 10, width: 80, marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="skeleton" style={{ height: 32, width: 80, borderRadius: 7 }} />
          <div className="skeleton" style={{ height: 32, width: 80, borderRadius: 7 }} />
        </div>
      </div>
    </div>
  );
}

function TradeSection({ trades, emptyMessage, currentUserId, onStatusChange }) {
  return (
    <section style={{ marginBottom: 36 }}>
      {trades.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '28px 20px',
          border: '1px dashed var(--line)', borderRadius: 10,
          color: 'var(--muted)', fontSize: 14,
        }}>
          {emptyMessage}
        </div>
      ) : (
        <ul role="list" className="cards-grid" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {trades.map(trade => (
            <li key={trade.id} style={{ margin: 0 }}>
              <TradeCard trade={trade} currentUserId={currentUserId} onStatusChange={onStatusChange} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function TradeRequestsPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [trades,  setTrades]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const fetchTrades = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await getMyTrades();
      setTrades(data.trades ?? []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) { setLoading(false); return; }
    fetchTrades();
  }, [authLoading, currentUser, fetchTrades]);

  useEffect(() => {
    if (authLoading || !currentUser) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket'] });
    socket.on('connect_error', err => console.warn('Socket error:', err.message));
    socket.on('tradeUpdated', t => {
      if (t.sender_id === currentUser.id || t.receiver_id === currentUser.id) fetchTrades();
    });
    return () => socket.disconnect();
  }, [authLoading, currentUser, fetchTrades]);

  const handleStatusChange = useCallback(async (tradeId, newStatus) => {
    if (newStatus === 'refresh') { await fetchTrades(); return; }
    if (newStatus === TRADE_STATUS.ACCEPTED)  await acceptTrade(tradeId);
    else if (newStatus === TRADE_STATUS.DECLINED) await declineTrade(tradeId);
    // NOTE: COMPLETED is no longer user-triggered — admin handles that via the proof flow.
    else throw new Error(`Unsupported status change from client: ${newStatus}`);
    await fetchTrades();
  }, [fetchTrades]);

  // Incoming = trades where current user is the receiver
  // Active includes all in-progress states: pending, accepted, proof flow, awaiting admin
  const incoming = trades.filter(t =>
    t.receiver_id === currentUser?.id &&
    (
      t.status === TRADE_STATUS.PENDING ||
      t.status === TRADE_STATUS.ACCEPTED ||
      t.status === TRADE_STATUS.PROOF_PENDING ||
      t.status === TRADE_STATUS.AWAITING_ADMIN_VERIFICATION
    )
  );
  const pastIncoming = trades.filter(t =>
    t.receiver_id === currentUser?.id &&
    (
      t.status === TRADE_STATUS.COMPLETED ||
      t.status === TRADE_STATUS.DECLINED  ||
      t.status === TRADE_STATUS.CANCELLED ||
      t.status === TRADE_STATUS.REJECTED
    )
  );

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!authLoading && !currentUser) {
    return (
      <div style={{ background: 'var(--cream)', minHeight: '100vh', width: '100%' }}>
        <div className="tr-container">
          <style>{BARTER_CSS}</style>
          <div className="hero">
            <button type="button" className="hero-back" onClick={() => navigate(-1)} aria-label="Go back">←</button>
          </div>
          <div className="title-card">
            <h1>Trade Requests</h1>
            <p style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 16, margin: '8px 0 4px' }}>You're not logged in</p>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>Please log in to view your trade requests.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading || authLoading) {
    return (
      <div style={{ background: 'var(--cream)', minHeight: '100vh', width: '100%' }}>
        <div className="tr-container" aria-busy="true" aria-label="Loading trade requests">
          <style>{BARTER_CSS}</style>
          <div className="hero">
            <button type="button" className="hero-back" onClick={() => navigate(-1)} aria-label="Go back">←</button>
          </div>
          <div className="title-card">
            <h1>Trade Requests</h1>
            <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>Loading incoming offers…</p>
            <div className="skeleton" style={{ height: 20, width: 150, marginTop: 14 }} />
          </div>
          <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <SkeletonCard /><SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ background: 'var(--cream)', minHeight: '100vh', width: '100%' }}>
        <div className="tr-container">
          <style>{BARTER_CSS}</style>
          <div className="hero">
            <button type="button" className="hero-back" onClick={() => navigate(-1)} aria-label="Go back">←</button>
          </div>
          <div className="title-card">
            <h1>Trade Requests</h1>
            <p style={{ fontWeight: 600, color: '#dc2626', margin: '8px 0 4px' }}>Could not load trade requests</p>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>{error}</p>
            <button type="button" onClick={fetchTrades}
              style={{ padding: '7px 20px', borderRadius: 7, border: '1.5px solid var(--line)', background: 'transparent', color: 'var(--dark)', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--cream)', minHeight: '100vh', width: '100%' }}>
      <div className="tr-container">
        <style>{BARTER_CSS}</style>

        <div className="hero">
          <button type="button" className="hero-back" onClick={() => navigate(-1)} aria-label="Go back">←</button>
        </div>

        <div className="title-card">
          <h1>Trade Requests</h1>
          <div className="stat-row">
            <div className="stat">
              <b>{incoming.length}</b>
              <span>Awaiting</span>
            </div>
            <div className="stat">
              <b>{pastIncoming.filter(t => t.status === TRADE_STATUS.COMPLETED).length}</b>
              <span>Completed</span>
            </div>
            <div className="stat">
              <b>{pastIncoming.filter(t => t.status === TRADE_STATUS.DECLINED || t.status === TRADE_STATUS.CANCELLED).length}</b>
              <span>Declined</span>
            </div>
          </div>
        </div>

        {incoming.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--muted)' }}>
            <p style={{ fontSize: 36, margin: '0 0 12px' }} aria-hidden="true">📭</p>
            <p style={{ fontWeight: 600, color: 'var(--dark)', fontSize: 16 }}>No incoming requests</p>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '4px 0 0' }}>
              When someone wants to trade with you, their offer will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="section-label">Needs your response</div>
            <TradeSection
              trades={incoming}
              emptyMessage="No pending requests."
              currentUserId={currentUser.id}
              onStatusChange={handleStatusChange}
            />
          </>
        )}

        {pastIncoming.length > 0 && (
          <>
            <div className="section-label">Past Requests</div>
            <TradeSection
              trades={pastIncoming}
              emptyMessage="No past requests."
              currentUserId={currentUser.id}
              onStatusChange={handleStatusChange}
            />
          </>
        )}

        <div className="footer-space" />
      </div>
    </div>
  );
}

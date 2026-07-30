import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TRADE_STATUS } from '../../utils/constants';
import { requestMoreItems, getTradeItems, addItemsToTrade } from '../../services/tradeService';
import api from '../../services/api';

const TRADE_ITEMS_ROW_CSS = `
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
  --peach: #fbe8dd;
  --peach-ink: #8a4a2a;
  --sky: #e3eefc;
  --sky-ink: #2a5285;
  --radius: 20px;
}

.ticket {
  background: var(--paper);
  border-radius: var(--radius);
  box-shadow: 0 4px 14px rgba(15,61,46,0.07);
  overflow: hidden;
  border: 1px solid var(--line);
  transition: transform 0.2s, box-shadow 0.2s;
  margin: 0;
  /* stretch to match tallest card in the grid row */
  display: flex;
  flex-direction: column;
  height: 100%;
}

.ticket:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(15, 61, 46, 0.12);
}

.ticket-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
}

.who {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--light-green), var(--green));
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Fraunces', serif;
}

.who-text {
  display: flex;
  flex-direction: column;
}

.who-text .handle {
  font-weight: 700;
  font-size: 14.5px;
  color: var(--ink);
}

.who-text .date {
  font-size: 11px;
  color: var(--muted);
  font-family: 'IBM Plex Mono', monospace;
  margin-top: 1px;
}

.status {
  font-size: 11px;
  font-weight: 700;
  padding: 5px 10px;
  border-radius: 20px;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  gap: 5px;
  line-height: 1;
}

.status::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.status.accepted {
  background: #eaf5ee;
  color: #2c7a4b;
}

.status.accepted::before {
  background: #2c7a4b;
}

.status.declined, .status.cancelled {
  background: #fbeaea;
  color: #b4442e;
}

.status.declined::before, .status.cancelled::before {
  background: #b4442e;
}

.status.completed {
  background: rgba(198, 233, 48, 0.22);
  color: #5c6b12;
}

.status.completed::before {
  background: #8a9c1c;
}

.status.pending {
  background: #fff3d8;
  color: #8a5a12;
}

.status.pending::before {
  background: #c98a1e;
}

.progress-wrap {
  padding: 0 16px 12px;
}

.progress-track {
  height: 5px;
  background: rgba(15, 61, 46, 0.08);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--lime-hover);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-label {
  font-size: 11px;
  color: var(--muted);
  margin-top: 5px;
  font-family: 'IBM Plex Mono', monospace;
}

.ticket-body {
  padding: 4px 16px 16px;
  /* grows to fill remaining card height so footer is always at bottom */
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ticket-body-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 10px;
  border-radius: 14px;
  margin-bottom: 6px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.item-row:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(15, 61, 46, 0.05);
}

.item-row.give {
  background: var(--peach);
}

.item-row.get {
  background: var(--sky);
}

.item-row img {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  object-fit: cover;
  flex-shrink: 0;
  background: #ddd;
}

.item-row .meta {
  min-width: 0;
}

.item-row .side-label {
  font-size: 9.5px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  opacity: 0.65;
}

.item-row.give .side-label {
  color: var(--peach-ink);
}

.item-row.get .side-label {
  color: var(--sky-ink);
}

.item-row .name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-row .cond {
  font-size: 11px;
  color: var(--muted);
}

.divider {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 2px 0 8px;
  padding-left: 2px;
}

.divider .dash {
  flex: 1;
  height: 0;
  border-top: 1.5px dashed var(--line);
}

.swap-badge {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--lime);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--dark);
  font-weight: 700;
  font-size: 13px;
  box-shadow: 0 2px 6px rgba(198, 233, 48, 0.5);
  flex-shrink: 0;
}

.ticket-foot {
  display: flex;
  gap: 10px;
  padding: 4px 16px 18px;
  /* push footer to bottom of the card even when no buttons are rendered */
  margin-top: auto;
}

.btn {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  border-radius: 12px;
  font-weight: 700;
  font-size: 13.5px;
  border: none;
  cursor: pointer;
  font-family: 'Inter', sans-serif;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: transform 0.15s, background 0.15s;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:disabled {
  cursor: not-allowed;
}

.btn-primary {
  background: var(--lime);
  color: var(--dark);
}

.btn-primary:hover:not(:disabled) {
  background: var(--lime-hover);
}

.btn-secondary {
  background: transparent;
  color: var(--dark);
  border: 1.5px solid rgba(15, 61, 46, 0.18);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(15, 61, 46, 0.04);
}

.btn-waiting {
  background: rgba(15, 61, 46, 0.05);
  color: var(--muted);
}

.btn-ghost {
  background: transparent;
  color: var(--muted);
}

.btn-ghost:hover:not(:disabled) {
  background: rgba(15, 61, 46, 0.02);
}

/* Multi-item cluster */
.item-row.multi {
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.multi-images {
  display: flex;
  align-items: center;
  gap: 7px;
}

.multi-images img {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 1px var(--line);
}

.multi-images .plus {
  font-size: 14px;
  font-weight: 800;
  color: var(--muted);
}

.multi-images .more-badge {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: rgba(15, 61, 46, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}

.item-row.multi .meta {
  width: 100%;
}

/* ── Outcome tinting (History tab) ── */

/* Completed → soft sage-green card */
.ticket.is-completed {
  background: #f0faf4;
  border-color: rgba(44, 122, 75, 0.28);
  box-shadow: 0 4px 14px rgba(44, 122, 75, 0.08);
}

/* Declined / Cancelled → soft peach card */
.ticket.is-declined {
  background: #fef3ee;
  border-color: rgba(180, 68, 46, 0.22);
  box-shadow: 0 4px 14px rgba(180, 68, 46, 0.07);
}

/* Boost item-row contrast so both color layers are legible */
.ticket.is-completed .item-row.give {
  background: rgba(255,255,255,0.75);
}
.ticket.is-completed .item-row.get {
  background: rgba(255,255,255,0.75);
}
.ticket.is-declined .item-row.give {
  background: rgba(255,255,255,0.75);
}
.ticket.is-declined .item-row.get {
  background: rgba(255,255,255,0.75);
}

@media (min-width: 640px) {
  .ticket-body-container {
    flex-direction: row;
    align-items: center;
    gap: 12px;
  }
  .ticket-body-container .item-row {
    flex: 1;
    margin-bottom: 0;
  }
  .ticket-body-container .divider {
    flex-direction: column;
    height: 60px;
    margin: 0;
    gap: 5px;
  }
  .ticket-body-container .divider .dash {
    border-top: none;
    border-left: 1.5px dashed var(--line);
    height: 100%;
    width: 0;
  }
}
`;

const FALLBACK_IMAGE = 'https://placehold.co/120x100?text=No+Image';

function normalizeMeta(parts) {
  return parts.filter(Boolean).join(' · ') || null;
}

function shortText(text, max = 90) {
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

function StatusChip({ status }) {
  const normStatus = status?.toLowerCase() || 'pending';
  return (
    <span className={`status ${normStatus}`}>
      {normStatus}
    </span>
  );
}

function Btn({ children, onClick, disabled, variant = 'primary', ...rest }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-${variant}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// ── TradeCard ─────────────────────────────────────────────────────────────
export default function TradeCard({ trade, currentUserId, onStatusChange }) {
  const navigate = useNavigate();

  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [hovered, setHovered] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  // "Request More Items" dialog state
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  const [counterMsg, setCounterMsg] = useState('');

  // Multi-item offered items state
  // offeredItems: full list (original + extras from trade_offer_items)
  const [offeredItems, setOfferedItems] = useState(null); // null = not yet loaded
  const [offeredItemsError, setOfferedItemsError] = useState('');

  // "Edit Trade Offer" modal state (sender, when needs_more_items = true)
  const [showEditModal, setShowEditModal] = useState(false);
  const [myItems, setMyItems] = useState([]);
  const [loadingMyItems, setLoadingMyItems] = useState(false);
  const [selectedNewItemIds, setSelectedNewItemIds] = useState([]);
  const [editError, setEditError] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // ── Fetch offered items (original + extras) ───────────────────────────────
  // Re-fetches whenever trade.updated_at changes (socket push re-renders the list).
  useEffect(() => {
    let cancelled = false;
    async function fetchOfferedItems() {
      try {
        const data = await getTradeItems(trade.id);
        if (!cancelled) setOfferedItems(data.offeredItems);
      } catch {
        if (!cancelled) setOfferedItemsError('Could not load offered items');
      }
    }
    fetchOfferedItems();
    return () => { cancelled = true; };
  }, [trade.id, trade.updated_at]);

  // ── Ownership helpers ────────────────────────────────────────────────────
  const isIncoming = trade.receiver_id === currentUserId;
  const isOutgoing = trade.sender_id === currentUserId;
  const canRespond = isIncoming && trade.status === TRADE_STATUS.PENDING;
  // Chat is only unlocked after the trade is accepted — not before.
  const canChat = [TRADE_STATUS.ACCEPTED, TRADE_STATUS.COMPLETED].includes(trade.status);
  // Completion is only available for accepted trades.
  const canComplete = trade.status === TRADE_STATUS.ACCEPTED &&
    (isIncoming || isOutgoing);
  // Receiver can request more items while trade is still pending.
  const canCounter = isIncoming && trade.status === TRADE_STATUS.PENDING;
  // If a counter was requested.
  const hasCounter = trade.needs_more_items && trade.counter_note;
  const counterText = trade.counter_note;

  // Confirmation state
  const hasIConfirmed = isIncoming ? trade.receiver_confirmed : trade.sender_confirmed;
  const hasPartnerConfirmed = isIncoming ? trade.sender_confirmed : trade.receiver_confirmed;
  const numConfirmations = (trade.sender_confirmed ? 1 : 0) + (trade.receiver_confirmed ? 1 : 0);

  const partnerName = isIncoming ? trade.sender_username : trade.receiver_username;
  const headerLabel = isIncoming ? '↙ Incoming Request' : '↗ Your Offer';
  const headerBg = isIncoming ? 'rgba(240,253,244,0.85)' : 'rgba(239,246,255,0.85)';
  const headerColor = isIncoming ? '#14532d' : '#1e3a8a';

  const offeredLabel = isIncoming ? 'They offered' : 'You offered';
  const requestedLabel = isIncoming ? 'They want' : 'Requested';

  const offeredMeta = normalizeMeta([
    trade.offered_item_condition?.replace(/_/g, ' '),
    trade.offered_item_value ? `Est. $${trade.offered_item_value}` : null,
  ]);
  const requestedMeta = normalizeMeta([
    trade.requested_item_condition?.replace(/_/g, ' '),
    trade.requested_item_value ? `Est. $${trade.requested_item_value}` : null,
  ]);

  const displayDate = trade.created_at
    ? new Date(trade.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : '—';

  const handleAction = useCallback(async (newStatus) => {
    setActing(true);
    setActionError('');
    setShowAcceptDialog(false);
    try {
      await onStatusChange(trade.id, newStatus);
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Something went wrong';
      setActionError(`Failed: ${msg}`);
    } finally {
      setActing(false);
    }
  }, [onStatusChange, trade.id]);

  async function handleCounterSubmit() {
    if (!counterMsg.trim()) return;
    setActing(true);
    setActionError('');
    try {
      await requestMoreItems(trade.id, counterMsg);
      if (onStatusChange) {
        await onStatusChange(trade.id, 'refresh');
      }
      setShowCounterDialog(false);
      setCounterMsg('');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Something went wrong';
      setActionError(`Counter-request failed: ${msg}`);
    } finally {
      setActing(false);
    }
  }

  // ── Edit Trade Offer (sender adds items when needs_more_items = true) ────
  async function openEditModal() {
    setEditError('');
    setSelectedNewItemIds([]);
    setShowEditModal(true);
    setLoadingMyItems(true);
    try {
      const res = await api.get('/items/mine');
      // Exclude items already in the offer (original + extras already fetched)
      const alreadyOfferedIds = new Set((offeredItems || []).map(i => i.id));
      const available = (res.data.items || [])
        .filter(i => i.status === 'available' && !alreadyOfferedIds.has(i.id));
      setMyItems(available);
    } catch {
      setEditError('Could not load your items.');
    } finally {
      setLoadingMyItems(false);
    }
  }

  function toggleNewItem(itemId) {
    setSelectedNewItemIds(prev =>
      prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
    );
  }

  async function handleSubmitEdit() {
    if (selectedNewItemIds.length === 0) {
      setEditError('Select at least one item to add.');
      return;
    }
    setSubmittingEdit(true);
    setEditError('');
    try {
      await addItemsToTrade(trade.id, selectedNewItemIds);
      setShowEditModal(false);
      setSelectedNewItemIds([]);
      if (onStatusChange) await onStatusChange(trade.id, 'refresh');
    } catch (err) {
      setEditError(err?.response?.data?.error || err?.message || 'Failed to update offer.');
    } finally {
      setSubmittingEdit(false);
    }
  }

  const items = offeredItems && offeredItems.length > 0 ? offeredItems : [{
    id: trade.offered_item_id,
    title: trade.offered_item_title ?? 'Unknown',
    image_urls: trade.offered_item_images,
    item_condition: trade.offered_item_condition,
    estimated_value: trade.offered_item_value,
  }];

  const isCompleted = trade.status === TRADE_STATUS.COMPLETED;
  const isDeclined = trade.status === TRADE_STATUS.DECLINED || trade.status === TRADE_STATUS.CANCELLED;
  const cardClassName = `ticket${isCompleted ? ' is-completed' : ''}${isDeclined ? ' is-declined' : ''}`;

  return (
    <>
      <style>{TRADE_ITEMS_ROW_CSS}</style>
      <article
        aria-label={`${headerLabel}: ${trade.offered_item_title ?? 'item'} for ${trade.requested_item_title ?? 'item'}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cardClassName}
      >
        {/* ── Header ── */}
        <div className="ticket-head">
          <div className="who">
            <div className="avatar">
              {partnerName ? partnerName.charAt(0).toUpperCase() : '?'}
            </div>
            <div className="who-text">
              <div className="handle">
                {isIncoming ? '↙ ' : '↗ '}@{partnerName || 'unknown'}
              </div>
              <div className="date">
                {displayDate}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusChip status={trade.status} />
          </div>
        </div>

        {/* ── Counter-request banner (shown to sender) ── */}
        {isOutgoing && hasCounter && (
          <div style={{
            padding: '10px 20px', background: 'rgba(234,179,8,0.08)',
            borderBottom: '1px solid rgba(234,179,8,0.2)',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 16 }} aria-hidden="true">💬</span>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#92400e' }}>Receiver requested more items</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#78350f' }}>{counterText}</p>
            </div>
          </div>
        )}

        {/* ── Chat available banner — only after acceptance ── */}
        {canChat && trade.status === TRADE_STATUS.ACCEPTED && (
          <div style={{
            padding: '8px 20px', background: 'rgba(22,163,74,0.07)',
            borderBottom: '1px solid rgba(22,163,74,0.12)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 13, color: '#14532d', fontWeight: 700 }}>
              Chat open — coordinate the exchange
            </span>
          </div>
        )}

        {/* ── Confirmation progress bar ── */}
        {trade.status === 'accepted' && (
          <div className="progress-wrap">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${(numConfirmations / 2) * 100}%` }} />
            </div>
            <div className="progress-label">
              {numConfirmations}/2 confirmations · {
                numConfirmations === 2 
                  ? 'Ready to swap!' 
                  : !hasIConfirmed 
                    ? 'waiting on you to confirm' 
                    : `waiting on @${partnerName || 'partner'}`
              }
            </div>
          </div>
        )}

        {/* ── Item panes inside ticket-body ── */}
        <div className="ticket-body">
          <div className="ticket-body-container">
            {/* Offered side */}
            {offeredItemsError && (
              <p style={{ margin: 0, fontSize: 11, color: '#b91c1c' }}>{offeredItemsError}</p>
            )}
            {items.length > 1 ? (
              <div className="item-row give multi">
                <div className="side-label">{offeredLabel} · {items.length} items</div>
                <div className="multi-images">
                  {items.slice(0, 3).map((item, idx) => (
                    <span key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      {idx > 0 && <span className="plus">+</span>}
                      <img src={item.image_urls?.[0] ?? FALLBACK_IMAGE} alt={item.title} onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }} />
                    </span>
                  ))}
                  {items.length > 3 && (
                    <div className="more-badge">+{items.length - 3}</div>
                  )}
                </div>
                <div className="meta">
                  <div className="name">{items.map(i => i.title).join(' + ')}</div>
                  <div className="cond">{items[0]?.item_condition?.replace(/_/g, ' ') || 'Good'}</div>
                </div>
              </div>
            ) : (
              <Link to={`/item/${items[0]?.id}`} className="item-row give">
                <img src={items[0]?.image_urls?.[0] ?? FALLBACK_IMAGE} alt={items[0]?.title} onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }} />
                <div className="meta">
                  <div className="side-label">{offeredLabel}</div>
                  <div className="name">{items[0]?.title ?? 'Unknown'}</div>
                  <div className="cond">{offeredMeta}</div>
                </div>
              </Link>
            )}

            {/* Divider */}
            <div className="divider">
              <div className="dash" />
              <div className="swap-badge" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 2L4 10M4 10L2 8M4 10L6 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 12L10 4M10 4L8 6M10 4L12 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="dash" />
            </div>

            {/* Requested side */}
            <Link to={`/item/${trade.requested_item_id}`} className="item-row get">
              <img src={trade.requested_item_images?.[0] ?? FALLBACK_IMAGE} alt={trade.requested_item_title} onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }} />
              <div className="meta">
                <div className="side-label">{requestedLabel}</div>
                <div className="name">{trade.requested_item_title ?? 'Unknown'}</div>
                <div className="cond">{requestedMeta}</div>
              </div>
            </Link>
          </div>

          {/* Date + partner */}
          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--muted)', fontFamily: 'IBM Plex Mono', textTransform: 'uppercase' }}>
            {displayDate}
          </p>

          {/* Message (non-counter) */}
          {trade.message && !hasCounter && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 14, background: 'rgba(0,0,0,0.03)', border: '1px solid var(--line)' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>"{trade.message}"</p>
            </div>
          )}

          {/* ── Actions ── */}
          <div className="ticket-foot" style={{ padding: '16px 0 0', gap: 8 }}>

            {/* Open Chat — only after acceptance */}
            {canChat && (
              <Btn onClick={() => navigate(`/chat/${trade.id}`)} variant="primary">
                Open Chat
              </Btn>
            )}

            {/* Accept / Decline — incoming pending only */}
            {canRespond && (
              <>
                <Btn onClick={() => setShowAcceptDialog(true)} variant="primary" disabled={acting}>
                  {acting ? 'Accepting…' : '✓ Accept'}
                </Btn>
                <Btn onClick={() => handleAction(TRADE_STATUS.DECLINED)} variant="secondary" disabled={acting}>
                  {acting ? 'Declining…' : '✕ Decline'}
                </Btn>
              </>
            )}

            {/* Request More Items — incoming pending only */}
            {canCounter && (
              <Btn onClick={() => setShowCounterDialog(true)} variant="secondary">
                + Request More Items
              </Btn>
            )}

            {/* Mark Complete — accepted, both sides */}
            {canComplete && (
              <Btn
                onClick={() => handleAction(TRADE_STATUS.COMPLETED)}
                variant={hasIConfirmed ? 'waiting' : 'primary'}
                disabled={acting || hasIConfirmed}
              >
                {acting ? 'Confirming…' : hasIConfirmed ? '✓ Confirmed (Waiting for partner)' : 'Confirm Completion'}
              </Btn>
            )}

            {/* Edit Trade Offer — sender, when receiver asked for more items */}
            {isOutgoing && trade.status === TRADE_STATUS.PENDING && trade.needs_more_items && (
              <Btn onClick={openEditModal} variant="primary" disabled={acting}>
                Edit Trade Offer
              </Btn>
            )}

            {/* Pending sender status — only when NOT waiting for more items */}
            {isOutgoing && trade.status === TRADE_STATUS.PENDING && !trade.needs_more_items && (
              <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, alignSelf: 'center' }}>
                Waiting for response...
              </span>
            )}
          </div>

          {actionError && (
            <p role="alert" style={{ margin: '10px 0 0', fontSize: 12, color: '#b91c1c', fontWeight: 700 }}>
              ⚠ {actionError}
            </p>
          )}
        </div>
      </article>

      {/* ── Accept dialog ── */}
      {showAcceptDialog && (
        <div role="dialog" aria-modal="true" aria-label="Confirm acceptance" className="modal-overlay">
          <div className="modal-card">
            <h3>Accept this trade?</h3>
            <p>
              Both items will be locked and the chat will open so you can arrange the exchange.
            </p>
            <div className="modal-foot">
              <Btn onClick={() => setShowAcceptDialog(false)} variant="secondary">Cancel</Btn>
              <Btn onClick={() => handleAction(TRADE_STATUS.ACCEPTED)} variant="primary" disabled={acting}>
                {acting ? 'Accepting…' : 'Yes, accept'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Request More Items dialog ── */}
      {showCounterDialog && (
        <div role="dialog" aria-modal="true" aria-label="Request more items" className="modal-overlay">
          <div className="modal-card">
            <h3>Request Additional Items</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)' }}>
              Tell the sender what else you'd like added to make this trade fair.
            </p>
            <textarea
              value={counterMsg}
              onChange={e => setCounterMsg(e.target.value)}
              placeholder="e.g. This laptop is worth more — please add your headphones too."
              rows={4}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1.5px solid var(--line)',
                background: 'var(--cream)',
                color: 'var(--ink)',
                fontSize: 13,
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
            />
            <div className="modal-foot">
              <Btn onClick={() => { setShowCounterDialog(false); setCounterMsg(''); }} variant="secondary">Cancel</Btn>
              <Btn onClick={handleCounterSubmit} variant="primary" disabled={!counterMsg.trim()}>Send Request</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Trade Offer modal (sender adds items) ── */}
      {showEditModal && (
        <div role="dialog" aria-modal="true" aria-label="Edit trade offer" className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false); }}
        >
          <div className="modal-card" style={{ maxHeight: '88vh', overflowY: 'auto' }}>
            <h3>Edit Your Offer</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--muted)' }}>
              Add more items to satisfy the receiver’s request.
            </p>

            {/* Currently offered items */}
            <p style={{
              margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>
              Currently offered ({(offeredItems || []).length} item{(offeredItems || []).length !== 1 ? 's' : ''})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
              {(offeredItems || []).map(item => (
                <div key={item.id} style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  padding: '8px 10px', borderRadius: 12, background: 'rgba(248,237,229,0.6)',
                  border: '1px solid var(--line)'
                }}
                >
                  <img src={item.image_urls?.[0] ?? FALLBACK_IMAGE} alt={item.title}
                    onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  <span style={{
                    fontSize: 13, fontWeight: 600, color: 'var(--ink)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Picker: sender's available items not already offered */}
            <p style={{
              margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.08em'
            }}>
              Add items {selectedNewItemIds.length > 0 && `— ${selectedNewItemIds.length} selected`}
            </p>

            {editError && (
              <div style={{
                padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)', color: '#b91c1c',
                fontSize: 13, marginBottom: 12
              }}>
                {editError}
              </div>
            )}

            {loadingMyItems ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>Loading your items…</p>
            ) : myItems.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--muted)' }}>No other available items to add.</p>
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18,
                maxHeight: 220, overflowY: 'auto'
              }}>
                {myItems.map(item => {
                  const selected = selectedNewItemIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleNewItem(item.id)}
                      style={{
                        display: 'flex', gap: 10, alignItems: 'center',
                        padding: '8px 10px', borderRadius: 12,
                        background: selected ? 'rgba(198,233,48,0.08)' : 'var(--cream)',
                        border: selected ? '1px solid var(--lime)' : '1px solid var(--line)',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'background 0.15s, border-color 0.15s',
                        outline: 'none'
                      }}
                    >
                      <img src={item.image_urls?.[0] ?? FALLBACK_IMAGE} alt={item.title}
                        onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }}
                        style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{
                          margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink)',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                        }}>
                          {item.title}
                        </p>
                        {item.estimated_value && (
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--muted)' }}>
                            Est. ${item.estimated_value}
                          </p>
                        )}
                      </div>
                      {selected && (
                        <span style={{ fontSize: 16, color: 'var(--dark)', fontWeight: 'bold', flexShrink: 0 }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="modal-foot">
              <Btn
                onClick={() => { setShowEditModal(false); setSelectedNewItemIds([]); setEditError(''); }}
                variant="secondary" disabled={submittingEdit}
              >
                Cancel
              </Btn>
              <Btn
                onClick={handleSubmitEdit}
                variant="primary"
                disabled={submittingEdit || selectedNewItemIds.length === 0}
              >
                {submittingEdit ? 'Sending…' : `Send Updated Offer`}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

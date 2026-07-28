import { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TRADE_STATUS } from '../../utils/constants';
import { requestMoreItems, getTradeItems, addItemsToTrade } from '../../services/tradeService';
import api from '../../services/api';

const FALLBACK_IMAGE = 'https://placehold.co/120x100?text=No+Image';

function normalizeMeta(parts) {
  return parts.filter(Boolean).join(' · ') || null;
}

function shortText(text, max = 90) {
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max).trim()}…` : text;
}

// ── Status chip styles ────────────────────────────────────────────────────
const STATUS_STYLE = {
  pending:   { bg: 'rgba(234,88,12,0.12)',  color: '#9a3412',  label: 'Pending',   dot: '#f97316' },
  accepted:  { bg: 'rgba(22,163,74,0.12)',  color: '#14532d',  label: 'Accepted',  dot: '#16a34a' },
  declined:  { bg: 'rgba(220,38,38,0.12)',  color: '#7f1d1d',  label: 'Declined',  dot: '#dc2626' },
  completed: { bg: 'rgba(31,77,61,0.10)',   color: '#14532d',  label: 'Completed', dot: '#16a34a' },
  cancelled: { bg: 'rgba(107,114,128,0.1)', color: '#374151',  label: 'Cancelled', dot: '#9ca3af' },
};

function StatusChip({ status }) {
  const s = STATUS_STYLE[status] ?? { bg: 'rgba(107,114,128,0.1)', color: '#374151', label: status, dot: '#9ca3af' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: s.bg, color: s.color,
      borderRadius: 20, padding: '4px 12px',
      fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} aria-hidden="true" />
      {s.label}
    </span>
  );
}

function Btn({ children, onClick, disabled, bg = '#1F4D3D', outline = false, danger = false, small = false, ...rest }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: small ? '7px 14px' : '10px 18px',
    borderRadius: 14,
    border: outline ? `1px solid ${danger ? 'rgba(220,38,38,0.3)' : 'rgba(31,77,61,0.25)'}` : 'none',
    background: disabled ? 'rgba(226,230,231,0.8)' : outline ? 'transparent' : bg,
    color: disabled ? '#9ca3af' : outline ? (danger ? '#dc2626' : '#1F4D3D') : '#fff',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: small ? 12 : 13, fontWeight: 700,
    transition: 'transform 0.15s, background 0.15s, box-shadow 0.15s',
    flexShrink: 0,
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick} style={base}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
      {...rest}>
      {children}
    </button>
  );
}

// ── ItemPane — one side of the trade ─────────────────────────────────────
function ItemPane({ itemId, title, image, meta, description, label, tint }) {
  return (
    <Link to={`/item/${itemId}`}
      style={{
        display: 'flex', gap: 14, padding: 16, borderRadius: 20,
        background: tint, border: '1px solid rgba(0,0,0,0.06)',
        color: 'inherit', textDecoration: 'none',
        transition: 'transform 0.18s, box-shadow 0.18s',
        flex: 1, minWidth: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <img src={image} alt={title}
        onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }}
        style={{ width: 76, height: 76, borderRadius: 16, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(0,0,0,0.08)' }}
      />
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</p>
        <p style={{ margin: '5px 0 6px', fontSize: 14, fontWeight: 700, color: '#111827', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
        {meta && <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{meta}</p>}
        {description && <p style={{ margin: '5px 0 0', fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{description}</p>}
      </div>
    </Link>
  );
}

// ── TradeCard ─────────────────────────────────────────────────────────────
export default function TradeCard({ trade, currentUserId, onStatusChange }) {
  const navigate = useNavigate();

  const [acting,              setActing]              = useState(false);
  const [actionError,         setActionError]         = useState('');
  const [hovered,             setHovered]             = useState(false);
  const [showAcceptDialog,    setShowAcceptDialog]    = useState(false);
  // "Request More Items" dialog state
  const [showCounterDialog,   setShowCounterDialog]   = useState(false);
  const [counterMsg,          setCounterMsg]          = useState('');

  // Multi-item offered items state
  // offeredItems: full list (original + extras from trade_offer_items)
  const [offeredItems,        setOfferedItems]        = useState(null); // null = not yet loaded
  const [offeredItemsError,   setOfferedItemsError]   = useState('');

  // "Edit Trade Offer" modal state (sender, when needs_more_items = true)
  const [showEditModal,       setShowEditModal]       = useState(false);
  const [myItems,             setMyItems]             = useState([]);
  const [loadingMyItems,      setLoadingMyItems]      = useState(false);
  const [selectedNewItemIds,  setSelectedNewItemIds]  = useState([]);
  const [editError,           setEditError]           = useState('');
  const [submittingEdit,      setSubmittingEdit]      = useState(false);

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
  const isOutgoing = trade.sender_id   === currentUserId;
  const canRespond = isIncoming && trade.status === TRADE_STATUS.PENDING;
  // Chat is only unlocked after the trade is accepted — not before.
  const canChat    = [TRADE_STATUS.ACCEPTED, TRADE_STATUS.COMPLETED].includes(trade.status);
  // Completion is only available for accepted trades.
  const canComplete = trade.status === TRADE_STATUS.ACCEPTED &&
                      (isIncoming || isOutgoing);
  // Receiver can request more items while trade is still pending.
  const canCounter  = isIncoming && trade.status === TRADE_STATUS.PENDING;
  // If a counter was requested.
  const hasCounter  = trade.needs_more_items && trade.counter_note;
  const counterText = trade.counter_note;

  // Confirmation state
  const hasIConfirmed = isIncoming ? trade.receiver_confirmed : trade.sender_confirmed;
  const hasPartnerConfirmed = isIncoming ? trade.sender_confirmed : trade.receiver_confirmed;
  const numConfirmations = (trade.sender_confirmed ? 1 : 0) + (trade.receiver_confirmed ? 1 : 0);

  const partnerName = isIncoming ? trade.sender_username : trade.receiver_username;
  const headerLabel = isIncoming ? '↙ Incoming Request' : '↗ Your Offer';
  const headerBg    = isIncoming ? 'rgba(240,253,244,0.85)' : 'rgba(239,246,255,0.85)';
  const headerColor = isIncoming ? '#14532d' : '#1e3a8a';

  const offeredLabel   = isIncoming ? 'They offered' : 'You offered';
  const requestedLabel = isIncoming ? 'They want'    : 'Requested';

  const offeredMeta    = normalizeMeta([
    trade.offered_item_condition?.replace(/_/g, ' '),
    trade.offered_item_value ? `Est. $${trade.offered_item_value}` : null,
  ]);
  const requestedMeta  = normalizeMeta([
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

  return (
    <>
      <article
        aria-label={`${headerLabel}: ${trade.offered_item_title ?? 'item'} for ${trade.requested_item_title ?? 'item'}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderRadius: 24, overflow: 'hidden',
          background: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: hovered
            ? '0 20px 50px rgba(0,0,0,0.12)'
            : '0 4px 16px rgba(0,0,0,0.06)',
          transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 10, padding: '14px 20px', background: headerBg,
          borderBottom: '1px solid rgba(0,0,0,0.05)',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: headerColor, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {headerLabel}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 700, color: '#111827' }}>
              with @{partnerName || 'unknown'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {trade.status === 'accepted' && (
              <span style={{
                background: 'rgba(14,165,233,0.1)',
                color: '#0369a1',
                borderRadius: 20,
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 700,
              }}>
                {numConfirmations}/2 Confirmations
              </span>
            )}
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
              💬 Chat open — coordinate the exchange
            </span>
          </div>
        )}

        {/* ── Item panes ── */}
        <div style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>

            {/* Offered side — always a list (1+ items). Fall back to the single
                offered_item_id fields while offeredItems is loading. */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#6b7280',
                textTransform: 'uppercase', letterSpacing: '0.1em' }}>{offeredLabel}</p>
              {offeredItemsError && (
                <p style={{ margin: 0, fontSize: 11, color: '#b91c1c' }}>{offeredItemsError}</p>
              )}
              {(offeredItems && offeredItems.length > 0 ? offeredItems : [{
                id: trade.offered_item_id,
                title: trade.offered_item_title ?? 'Unknown',
                image_urls: trade.offered_item_images,
                item_condition: trade.offered_item_condition,
                estimated_value: trade.offered_item_value,
              }]).map((item, idx) => (
                <Link
                  key={item.id}
                  to={`/item/${item.id}`}
                  style={{
                    display: 'flex', gap: 10, padding: '10px 12px', borderRadius: 16,
                    background: 'rgba(248,237,229,0.8)', border: '1px solid rgba(0,0,0,0.06)',
                    color: 'inherit', textDecoration: 'none',
                    marginTop: idx > 0 ? 8 : 0,
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 18px rgba(0,0,0,0.10)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}
                >
                  <img
                    src={item.image_urls?.[0] ?? FALLBACK_IMAGE}
                    alt={item.title}
                    onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover',
                      flexShrink: 0, border: '1px solid rgba(0,0,0,0.08)' }}
                  />
                  <div style={{ minWidth: 0, alignSelf: 'center' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111827',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </p>
                    {(item.item_condition || item.estimated_value) && (
                      <p style={{ margin: '3px 0 0', fontSize: 11, color: '#6b7280' }}>
                        {[item.item_condition?.replace(/_/g, ' '),
                          item.estimated_value ? `Est. $${item.estimated_value}` : null
                        ].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', color: '#9ca3af', fontSize: 20,
              flexShrink: 0, alignSelf: 'flex-start', marginTop: 28 }} aria-hidden="true">⇄</div>

            <ItemPane
              itemId={trade.requested_item_id}
              title={trade.requested_item_title ?? 'Unknown'}
              image={trade.requested_item_images?.[0] ?? FALLBACK_IMAGE}
              meta={requestedMeta}
              description={shortText(trade.requested_item_description)}
              label={requestedLabel}
              tint="rgba(237,246,255,0.9)"
            />
          </div>

          {/* Date + partner */}
          <p style={{ margin: '12px 0 0', fontSize: 12, color: '#9ca3af' }}>
            {displayDate} · @{partnerName || 'unknown'}
          </p>

          {/* Message (non-counter) */}
          {trade.message && !hasCounter && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 14, background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <p style={{ margin: 0, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>"{trade.message}"</p>
            </div>
          )}

          {/* ── Actions ── */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>

            {/* Open Chat — only after acceptance */}
            {canChat && (
              <Btn onClick={() => navigate(`/chat/${trade.id}`)} bg="#1F4D3D">
                💬 Open Chat
              </Btn>
            )}

            {/* Accept / Decline — incoming pending only */}
            {canRespond && (
              <>
                <Btn onClick={() => setShowAcceptDialog(true)} bg="#16a34a" disabled={acting}>
                  {acting ? 'Accepting…' : '✓ Accept'}
                </Btn>
                <Btn onClick={() => handleAction(TRADE_STATUS.DECLINED)} bg="#dc2626" disabled={acting}>
                  {acting ? 'Declining…' : '✕ Decline'}
                </Btn>
              </>
            )}

            {/* Request More Items — incoming pending only */}
            {canCounter && (
              <Btn onClick={() => setShowCounterDialog(true)} outline small>
                + Request More Items
              </Btn>
            )}

            {/* Mark Complete — accepted, both sides */}
            {canComplete && (
              <Btn
                onClick={() => handleAction(TRADE_STATUS.COMPLETED)}
                bg={hasIConfirmed ? 'rgba(107,114,128,0.15)' : '#0ea5e9'}
                color={hasIConfirmed ? '#4b5563' : '#fff'}
                disabled={acting || hasIConfirmed}
              >
                {acting ? 'Confirming…' : hasIConfirmed ? '✓ Confirmed (Waiting for partner)' : 'Confirm Completion'}
              </Btn>
            )}

            {/* Edit Trade Offer — sender, when receiver asked for more items */}
            {isOutgoing && trade.status === TRADE_STATUS.PENDING && trade.needs_more_items && (
              <Btn onClick={openEditModal} bg="#d97706" disabled={acting}>
                ✏️ Edit Trade Offer
              </Btn>
            )}

            {/* Pending sender status — only when NOT waiting for more items */}
            {isOutgoing && trade.status === TRADE_STATUS.PENDING && !trade.needs_more_items && (
              <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, alignSelf: 'center' }}>
                ⏳ Waiting for response
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
        <div role="dialog" aria-modal="true" aria-label="Confirm acceptance"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
          <div style={{ maxWidth: 400, width: '100%', borderRadius: 22, padding: 24, background: '#fff', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800 }}>Accept this trade?</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#4b5563', lineHeight: 1.6 }}>
              Both items will be locked and the chat will open so you can arrange the exchange.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn onClick={() => setShowAcceptDialog(false)} outline small>Cancel</Btn>
              <Btn onClick={() => handleAction(TRADE_STATUS.ACCEPTED)} bg="#16a34a" disabled={acting} small>
                {acting ? 'Accepting…' : 'Yes, accept'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Request More Items dialog ── */}
      {showCounterDialog && (
        <div role="dialog" aria-modal="true" aria-label="Request more items"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16 }}>
          <div style={{ maxWidth: 420, width: '100%', borderRadius: 22, padding: 24, background: '#fff', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800 }}>Request Additional Items</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              Tell the sender what else you'd like added to make this trade fair.
            </p>
            <textarea
              value={counterMsg}
              onChange={e => setCounterMsg(e.target.value)}
              placeholder="e.g. This laptop is worth more — please add your headphones too."
              rows={4}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 14 }}
            />
            <div style={{ height: 16 }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn onClick={() => { setShowCounterDialog(false); setCounterMsg(''); }} outline small>Cancel</Btn>
              <Btn onClick={handleCounterSubmit} bg="#1F4D3D" disabled={!counterMsg.trim()} small>Send Request</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Trade Offer modal (sender adds items) ── */}
      {showEditModal && (
        <div role="dialog" aria-modal="true" aria-label="Edit trade offer"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1200, padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false); }}
        >
          <div style={{ maxWidth: 480, width: '100%', borderRadius: 22, padding: 24,
            background: '#fff', boxShadow: '0 24px 60px rgba(0,0,0,0.22)',
            maxHeight: '88vh', overflowY: 'auto' }}
          >
            <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800 }}>Edit Your Offer</h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              Add more items to satisfy the receiver’s request.
            </p>

            {/* Currently offered items */}
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Currently offered ({(offeredItems || []).length} item{(offeredItems || []).length !== 1 ? 's' : ''})
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
              {(offeredItems || []).map(item => (
                <div key={item.id} style={{ display: 'flex', gap: 10, alignItems: 'center',
                  padding: '8px 10px', borderRadius: 12, background: 'rgba(248,237,229,0.6)',
                  border: '1px solid rgba(0,0,0,0.06)' }}
                >
                  <img src={item.image_urls?.[0] ?? FALLBACK_IMAGE} alt={item.title}
                    onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }}
                    style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>

            {/* Picker: sender's available items not already offered */}
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#6b7280',
              textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Add items {selectedNewItemIds.length > 0 && `— ${selectedNewItemIds.length} selected`}
            </p>

            {editError && (
              <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)', color: '#b91c1c',
                fontSize: 13, marginBottom: 12 }}>
                {editError}
              </div>
            )}

            {loadingMyItems ? (
              <p style={{ fontSize: 13, color: '#6b7280' }}>Loading your items…</p>
            ) : myItems.length === 0 ? (
              <p style={{ fontSize: 13, color: '#6b7280' }}>No other available items to add.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18,
                maxHeight: 220, overflowY: 'auto' }}>
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
                        background: selected ? 'rgba(22,163,74,0.08)' : '#fafafa',
                        border: selected ? '1px solid rgba(22,163,74,0.4)' : '1px solid rgba(0,0,0,0.08)',
                        cursor: 'pointer', textAlign: 'left', width: '100%',
                        transition: 'background 0.15s, border-color 0.15s',
                      }}
                    >
                      <img src={item.image_urls?.[0] ?? FALLBACK_IMAGE} alt={item.title}
                        onError={e => { e.currentTarget.src = FALLBACK_IMAGE; }}
                        style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </p>
                        {item.estimated_value && (
                          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#6b7280' }}>
                            Est. ${item.estimated_value}
                          </p>
                        )}
                      </div>
                      {selected && (
                        <span style={{ fontSize: 16, color: '#16a34a', flexShrink: 0 }}>✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn
                onClick={() => { setShowEditModal(false); setSelectedNewItemIds([]); setEditError(''); }}
                outline small disabled={submittingEdit}
              >
                Cancel
              </Btn>
              <Btn
                onClick={handleSubmitEdit}
                bg="#16a34a"
                disabled={submittingEdit || selectedNewItemIds.length === 0}
                small
              >
                {submittingEdit ? 'Sending…' : `Send Updated Offer (${selectedNewItemIds.length + (offeredItems?.length ?? 1)} items)`}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

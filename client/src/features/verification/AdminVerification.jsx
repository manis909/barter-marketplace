import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import './Verification.css';

// ── Trade Proof Panel ─────────────────────────────────────────────────────────
function TradeProofPanel() {
  const [trades, setTrades] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [proofData, setProofData] = useState({}); // { [tradeId]: { proofs, proof_status } }
  const [loadingProofs, setLoadingProofs] = useState({});
  const [approving, setApproving] = useState({});

  const loadTrades = useCallback(() => {
    api.get('/trades/admin/awaiting-verification')
      .then(res => setTrades(res.data.trades))
      .catch(() => setError('Could not load pending trade proofs — admin access required.'));
  }, []);

  useEffect(() => { loadTrades(); }, [loadTrades]);

  async function toggleExpand(tradeId) {
    if (expandedId === tradeId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(tradeId);
    if (proofData[tradeId]) return; // already loaded

    setLoadingProofs(p => ({ ...p, [tradeId]: true }));
    try {
      const res = await api.get(`/trades/${tradeId}/proof-status`);
      setProofData(p => ({ ...p, [tradeId]: res.data.proofStatus }));
    } catch {
      setError('Could not load proof images for this trade.');
    } finally {
      setLoadingProofs(p => ({ ...p, [tradeId]: false }));
    }
  }

  async function handleApproveTrade(tradeId) {
    setError('');
    setSuccessMessage('');
    setApproving(a => ({ ...a, [tradeId]: true }));
    try {
      await api.patch(`/trades/${tradeId}/verify`);
      setSuccessMessage('Trade approved and marked as completed.');
      setExpandedId(null);
      setProofData(p => { const n = { ...p }; delete n[tradeId]; return n; });
      loadTrades();
    } catch (err) {
      setError(err.response?.data?.error || 'Approval failed. Please try again.');
    } finally {
      setApproving(a => ({ ...a, [tradeId]: false }));
    }
  }

  return (
    <div className="admin-proof-panel">
      {error && <p className="verification-error">{error}</p>}
      {successMessage && <p className="verification-success">{successMessage}</p>}

      {trades.length === 0 && (
        <div className="admin-empty-state">
          <span className="admin-empty-icon">✅</span>
          <p>No trades pending verification.</p>
        </div>
      )}

      {trades.map(trade => {
        const isExpanded = expandedId === trade.id;
        const proofs = proofData[trade.id];
        const isLoading = loadingProofs[trade.id];
        const isApproving = approving[trade.id];

        return (
          <div key={trade.id} className="admin-trade-proof-card">
            {/* Card header */}
            <div className="admin-trade-proof-header">
              <div className="admin-trade-proof-meta">
                <span className="admin-trade-proof-title">
                  <strong>{trade.offered_item_title}</strong>
                  <span className="admin-trade-proof-arrow"> ⇄ </span>
                  <strong>{trade.requested_item_title}</strong>
                </span>
                <span className="admin-trade-proof-users">
                  @{trade.sender_username} → @{trade.receiver_username}
                </span>
                <span className="admin-trade-proof-date">
                  {new Date(trade.updated_at).toLocaleString()}
                </span>
              </div>
              <div className="admin-trade-proof-badges">
                <span className={`admin-proof-badge ${trade.sender_proof_submitted ? 'badge-ok' : 'badge-missing'}`}>
                  Sender {trade.sender_proof_submitted ? '✓' : '…'}
                </span>
                <span className={`admin-proof-badge ${trade.receiver_proof_submitted ? 'badge-ok' : 'badge-missing'}`}>
                  Receiver {trade.receiver_proof_submitted ? '✓' : '…'}
                </span>
              </div>
              <button
                className="admin-trade-expand-btn"
                onClick={() => toggleExpand(trade.id)}
              >
                {isExpanded ? '▲ Hide' : '▼ Review'}
              </button>
            </div>

            {/* Expanded proof view */}
            {isExpanded && (
              <div className="admin-trade-proof-body">
                {isLoading ? (
                  <p className="admin-proof-loading">Loading proof images…</p>
                ) : proofs ? (
                  <>
                    {proofs.proofs.length === 0 ? (
                      <p className="admin-proof-loading">No images uploaded yet.</p>
                    ) : (
                      <div className="admin-proof-images-grid">
                        {proofs.proofs.map((proof, i) => (
                          <div key={proof.id} className="admin-proof-image-slot">
                            <p className="admin-image-label">Proof #{i + 1}</p>
                            {proof.url ? (
                              <a href={proof.url} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={proof.url}
                                  alt={`Trade proof ${i + 1}`}
                                  className="admin-proof-image"
                                />
                              </a>
                            ) : (
                              <div className="admin-proof-image-error">Image unavailable</div>
                            )}
                            <p className="admin-proof-image-meta">
                              {new Date(proof.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="admin-trade-proof-actions">
                      <button
                        className="admin-approve-btn"
                        onClick={() => handleApproveTrade(trade.id)}
                        disabled={isApproving}
                      >
                        {isApproving ? 'Approving…' : '✓ Approve Trade'}
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── ID Verification Panel ─────────────────────────────────────────────────────
function IdVerificationPanel() {
  const [pending, setPending] = useState([]);
  const [rejectingId, setRejectingId] = useState(null);
  const [reasonText, setReasonText] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  function load() {
    api.get('/verification/pending')
      .then(res => setPending(res.data.pending))
      .catch(() => setError('Could not load pending submissions — admin access required.'));
  }

  useEffect(() => { load(); }, []);

  async function handleExportCsv() {
    try {
      const res = await api.get('/verification/logs/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'verification_log.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Could not export log.');
    }
  }

  async function handleApprove(userId, username) {
    setError(''); setSuccessMessage('');
    try {
      await api.post(`/verification/${userId}/approve`);
      setSuccessMessage(`@${username} approved — they've been notified.`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Approval failed. Please try again.');
    }
  }

  async function handleReject(userId, username) {
    if (!reasonText.trim()) { setError('Please enter a reason before rejecting.'); return; }
    setError(''); setSuccessMessage('');
    try {
      await api.post(`/verification/${userId}/reject`, { reason: reasonText });
      setSuccessMessage(`@${username} rejected — they've been notified with your reason.`);
      setRejectingId(null);
      setReasonText('');
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Rejection failed. Please try again.');
    }
  }

  return (
    <div>
      <div className="admin-id-panel-toolbar">
        <button type="button" className="admin-export-btn" onClick={handleExportCsv}>
          Export Log to CSV
        </button>
      </div>

      {error && <p className="verification-error">{error}</p>}
      {successMessage && <p className="verification-success">{successMessage}</p>}

      {pending.length === 0 && (
        <div className="admin-empty-state">
          <span className="admin-empty-icon">✅</span>
          <p>No pending ID submissions.</p>
        </div>
      )}

      {pending.map(u => (
        <div key={u.id} className="admin-verification-item">
          <div className="admin-verification-images">
            {u.id_signed_url && (
              <div>
                <p className="admin-image-label">ID Card</p>
                <img src={u.id_signed_url} alt="Submitted ID" className="admin-verification-image" />
              </div>
            )}
            <div>
              <p className="admin-image-label">Hall Ticket Number</p>
              <p className="admin-hallticket-number">{u.hallticket_verification_path}</p>
            </div>
          </div>
          <div className="admin-verification-info">
            <strong>{u.full_name || u.username}</strong>
            <p>@{u.username}</p>
            {rejectingId === u.id ? (
              <>
                <input
                  className="admin-reject-reason-input"
                  placeholder="Reason for rejection (shown to the user)"
                  value={reasonText}
                  onChange={e => setReasonText(e.target.value)}
                />
                <div className="admin-verification-actions">
                  <button className="admin-reject-btn" onClick={() => handleReject(u.id, u.username)}>
                    Confirm Reject
                  </button>
                  <button onClick={() => { setRejectingId(null); setReasonText(''); }}>Cancel</button>
                </div>
              </>
            ) : (
              <div className="admin-verification-actions">
                <button className="admin-approve-btn" onClick={() => handleApprove(u.id, u.username)}>
                  Approve
                </button>
                <button className="admin-reject-btn" onClick={() => setRejectingId(u.id)}>
                  Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminVerificationPage() {
  const [activeTab, setActiveTab] = useState('id');

  return (
    <div className="admin-verification-page">
      <div className="admin-verification-header">
        <h2>Admin Review</h2>
      </div>

      {/* Tab bar */}
      <div className="admin-tabs">
        <button
          className={`admin-tab-btn ${activeTab === 'id' ? 'admin-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('id')}
        >
          🪪 ID Verification
        </button>
        <button
          className={`admin-tab-btn ${activeTab === 'trades' ? 'admin-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('trades')}
        >
          🤝 Trade Proofs
        </button>
      </div>

      <div className="admin-tab-content">
        {activeTab === 'id' ? <IdVerificationPanel /> : <TradeProofPanel />}
      </div>
    </div>
  );
}
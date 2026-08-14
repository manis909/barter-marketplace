import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
    setError(''); setSuccessMessage('');
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

// ── Reports Panel ─────────────────────────────────────────────────────────────
function ReportsPanel() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const [conversations, setConversations] = useState({});

  useEffect(() => {
    api.get('/reports')
      .then(res => setReports(res.data.reports))
      .catch(() => setError('Could not load reports — admin access required.'));
  }, []);

  async function toggleConversation(reportId) {
    const existing = conversations[reportId];

    if (existing?.visible) {
      setConversations(prev => ({
        ...prev,
        [reportId]: { ...prev[reportId], visible: false },
      }));
      return;
    }

    if (!existing || !existing.loaded) {
      setConversations(prev => ({
        ...prev,
        [reportId]: { loading: true, visible: true },
      }));

      try {
        const res = await api.get(`/reports/${reportId}/conversation`);
        const d = res.data;
        setConversations(prev => ({
          ...prev,
          [reportId]: {
            loading: false,
            loaded: true,
            visible: true,
            hasConversation: d.hasConversation,
            messages: d.messages || [],
            tradeOfferId: d.tradeOfferId,
            reporterUsername: d.reporterUsername,
            reportedUsername: d.reportedUsername,
          },
        }));
      } catch {
        setConversations(prev => ({
          ...prev,
          [reportId]: { loading: false, loaded: true, visible: true, error: true },
        }));
      }
      return;
    }

    setConversations(prev => ({
      ...prev,
      [reportId]: { ...prev[reportId], visible: true },
    }));
  }

  return (
    <div>
      {error && <p className="verification-error">{error}</p>}

      {reports.length === 0 && !error && (
        <div className="admin-empty-state">
          <span className="admin-empty-icon">✅</span>
          <p>No reports submitted yet.</p>
        </div>
      )}

      {reports.map(r => {
        const conv = conversations[r.id];
        const isOpen = Boolean(conv?.visible);
        const reporterProfileUrl = r.reported_by ? `/profile/${r.reported_by}` : null;
        const reportedProfileUrl = r.reported_user_id ? `/profile/${r.reported_user_id}` : null;
        console.log('REPORTER PROFILE CLICK', r.reported_by, reporterProfileUrl);
        console.log('REPORTED USER PROFILE CLICK', r.reported_user_id, reportedProfileUrl);

        return (
          <div key={r.id} className="admin-verification-item" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%', gap: 12 }}>
              <div className="admin-verification-info" style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span>
                    <strong>Reporter:</strong>{' '}
                    {reporterProfileUrl ? (
                      <Link
                        to={reporterProfileUrl}
                        onClick={() => console.log('REPORTER CLICKED', r.reported_by)}
                        style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        @{r.reporter_username}
                        {r.reporter_name ? ` (${r.reporter_name})` : ''}
                      </Link>
                    ) : (
                      <>
                        @{r.reporter_username}
                        {r.reporter_name ? ` (${r.reporter_name})` : ''}
                      </>
                    )}
                  </span>
                  <span>
                    <strong>Reported:</strong>{' '}
                    {reportedProfileUrl ? (
                      <Link
                        to={reportedProfileUrl}
                        onClick={() => console.log('REPORTED USER CLICKED', r.reported_user_id)}
                        style={{ color: '#1d4ed8', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        @{r.reported_username}
                        {r.reported_name ? ` (${r.reported_name})` : ''}
                      </Link>
                    ) : (
                      <>
                        @{r.reported_username}
                        {r.reported_name ? ` (${r.reported_name})` : ''}
                      </>
                    )}
                  </span>
                </div>
                <p style={{ margin: '4px 0', color: '#374151' }}>
                  <strong>Reason:</strong>{' '}
                  {r.reason || <em style={{ color: '#9ca3af' }}>No reason provided</em>}
                </p>
                <p style={{ margin: '4px 0', fontSize: 12, color: '#6b7280' }}>
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>

              {r.trade_offer_id ? (
                <button
                  className="admin-trade-expand-btn"
                  style={{ marginTop: 4, flexShrink: 0 }}
                  onClick={() => toggleConversation(r.id)}
                >
                  {isOpen ? '▲ Hide Conversation' : '▼ View Conversation'}
                </button>
              ) : (
                <div style={{ marginTop: 8, fontSize: 13, color: '#9ca3af' }}>
                  Conversation unavailable
                </div>
              )}
            </div>

            {isOpen && (
              <div style={{
                width: '100%', marginTop: 12, borderTop: '1px solid #e5e7eb',
                paddingTop: 12,
              }}>
                {conv.loading && (
                  <p className="admin-proof-loading">Loading conversation…</p>
                )}
                {conv.error && (
                  <p className="verification-error">Could not load conversation.</p>
                )}
                {!conv.loading && !conv.error && !conv.hasConversation && (
                  <p style={{ color: '#9ca3af', fontSize: 13 }}>No conversation linked to this report.</p>
                )}
                {!conv.loading && !conv.error && conv.hasConversation && (
                  <>
                    <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                      Conversation between{' '}
                      <strong>@{conv.reporterUsername}</strong> and{' '}
                      <strong>@{conv.reportedUsername}</strong>
                    </p>
                    <div style={{
                      maxHeight: 360, overflowY: 'auto', display: 'flex',
                      flexDirection: 'column', gap: 6,
                      background: '#f9fafb', borderRadius: 8, padding: '10px 12px',
                    }}>
                      {conv.messages.length === 0 && (
                        <p style={{ color: '#9ca3af', fontSize: 13 }}>No messages in this conversation.</p>
                      )}
                      {conv.messages.map(m => {
                        const isByReported = m.sender_username === conv.reportedUsername;
                        return (
                          <div
                            key={m.id}
                            style={{
                              alignSelf: isByReported ? 'flex-end' : 'flex-start',
                              maxWidth: '75%',
                            }}
                          >
                            <div style={{
                              fontSize: 10.5, color: '#6b7280', marginBottom: 2,
                              textAlign: isByReported ? 'right' : 'left',
                            }}>
                              @{m.sender_username}
                              {isByReported && (
                                <span style={{
                                  marginLeft: 6, background: '#fef3c7',
                                  color: '#92400e', borderRadius: 4,
                                  padding: '1px 5px', fontSize: 9.5, fontWeight: 600,
                                }}>
                                  REPORTED USER
                                </span>
                              )}
                            </div>
                            <div style={{
                              background: isByReported ? '#fef9c3' : '#ffffff',
                              border: isByReported ? '1px solid #fde68a' : '1px solid #e5e7eb',
                              borderRadius: 10, padding: '6px 10px',
                              fontSize: 13, color: m.deleted ? '#9ca3af' : '#111827',
                              fontStyle: m.deleted ? 'italic' : 'normal',
                            }}>
                              {m.deleted
                                ? 'This message was deleted'
                                : m.message || (m.attachment_url ? '📎 Attachment' : '')}
                            </div>
                            <div style={{
                              fontSize: 10, color: '#9ca3af', marginTop: 2,
                              textAlign: isByReported ? 'right' : 'left',
                            }}>
                              {new Date(m.created_at).toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


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
        <button
          className={`admin-tab-btn ${activeTab === 'reports' ? 'admin-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          🚩 Reports
        </button>
      </div>

      <div className="admin-tab-content">
        {activeTab === 'id'      && <IdVerificationPanel />}
        {activeTab === 'trades'  && <TradeProofPanel />}
        {activeTab === 'reports' && <ReportsPanel />}
      </div>
    </div>
  );
}
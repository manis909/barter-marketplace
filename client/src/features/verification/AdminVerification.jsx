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
function ReportsPanel({ type = 'barter' }) {
  const [reportType, setReportType] = useState(type);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const [conversations, setConversations] = useState({});
  const [selectedReport, setSelectedReport] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [conversationVisible, setConversationVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [selectedAction, setSelectedAction] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionNotes, setActionNotes] = useState('');

  useEffect(() => {
    setReportType(type);
  }, [type]);

  useEffect(() => {
    api.get('/reports', { params: { type: reportType } })
      .then(res => setReports(res.data.reports))
      .catch(() => setError('Could not load reports — admin access required.'));
  }, [reportType]);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function openReportModal(report) {
    setSelectedReport(report);
    setConversationVisible(false);
    setModalOpen(true);
  }

  function closeReportModal() {
    setModalOpen(false);
    setSelectedReport(null);
    setConversationVisible(false);
    setSelectedAction('');
    setConfirmAction(null);
    setActionNotes('');
  }

  async function loadConversation(reportId) {
    if (conversations[reportId]?.loaded) return;

    setConversations(prev => ({
      ...prev,
      [reportId]: { loading: true, loaded: false },
    }));

    try {
      const res = await api.get(`/reports/${reportId}/conversation`);
      const d = res.data;
      setConversations(prev => ({
        ...prev,
        [reportId]: {
          loading: false,
          loaded: true,
          hasConversation: d.hasConversation,
          messages: d.messages || [],
          type: d.type || 'barter',
          tradeOfferId: d.tradeOfferId,
          skillBookingId: d.skillBookingId,
          reporterUsername: d.reporterUsername,
          reportedUsername: d.reportedUsername,
        },
      }));
    } catch {
      setConversations(prev => ({
        ...prev,
        [reportId]: { loading: false, loaded: true, error: true },
      }));
    }
  }

  async function takeAction(actionType) {
    if (!selectedReport) return;

    // Check if confirmation is needed
    if (['suspend', 'ban'].includes(actionType)) {
      setConfirmAction(actionType);
      return;
    }

    // Proceed with action
    await executeAction(actionType);
  }

  async function executeAction(actionType) {
    if (!selectedReport) return;

    setActionInProgress(true);

    try {
      const statusMap = {
        dismiss: 'dismissed',
        warn: 'actioned',
        restrict: 'actioned',
        suspend: 'actioned',
        ban: 'actioned',
        escalate: 'actioned',
      };

      const res = await api.patch(`/reports/${selectedReport.id}`, {
        status: statusMap[actionType] || 'actioned',
        admin_action: actionType === 'dismiss' ? 'dismiss' : actionType,
        admin_notes: actionNotes || null,
      });

      // Update local report in list
      setReports(prev =>
        prev.map(r => (r.id === selectedReport.id ? res.data.report : r))
      );

      // Update selected report in modal
      setSelectedReport(res.data.report);

      // Clear action states
      setConfirmAction(null);
      setActionNotes('');
    } catch (err) {
      alert(
        'Error: ' +
        (err.response?.data?.error ||
          err.message ||
          'Failed to take action on report')
      );
    } finally {
      setActionInProgress(false);
    }
  }

  const renderReportsList = (reportList, title) => (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#111827' }}>{title}</h3>
      {reportList.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: 13 }}>No {title.toLowerCase()} at this time.</p>
      ) : (
        reportList.map(r => (
          <div key={r.id} className="admin-verification-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
                <span><strong>Reporter:</strong> @{r.reporter_username}</span>
                <span><strong>Reported:</strong> @{r.reported_username}</span>
                {r.status && <span style={{ backgroundColor: '#e5e7eb', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, color: '#374151' }}>
                  {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                </span>}
              </div>
              <p style={{ margin: '4px 0', color: '#374151', fontSize: 13 }}>
                <strong>Reason:</strong> {r.reason || <em style={{ color: '#9ca3af' }}>No reason provided</em>}
              </p>
              <p style={{ margin: '4px 0', fontSize: 12, color: '#6b7280' }}>
                {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={() => openReportModal(r)}
              style={{
                backgroundColor: '#ffffff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                padding: '8px 16px',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              }}
              onMouseOver={(e) => (e.target.style.backgroundColor = '#f9fafb')}
              onMouseOut={(e) => (e.target.style.backgroundColor = '#ffffff')}
            >
              View Report
            </button>
          </div>
        ))
      )}
    </div>
  );

  const conv = selectedReport && conversations[selectedReport.id];

  return (
      <div>
        {error && <p className="verification-error">{error}</p>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {['barter', 'skilter'].map(option => (
            <button
              key={option}
              type="button"
              onClick={() => setReportType(option)}
              style={{
                border: reportType === option ? '1px solid #0f766e' : '1px solid #d1d5db',
                backgroundColor: reportType === option ? '#ecfeff' : '#ffffff',
                color: reportType === option ? '#115e59' : '#374151',
                borderRadius: 999,
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {option === 'barter' ? '🤝 Barter Reports' : '🎓 Skilter Reports'}
            </button>
          ))}
        </div>

        {reports.length === 0 && !error && (
          <div className="admin-empty-state">
            <span className="admin-empty-icon">✅</span>
            <p>No reports submitted yet.</p>
          </div>
        )}

        {renderReportsList(reports, reportType === 'skilter' ? '🎓 Skilter Reports' : '🤝 Barter Reports')}

        {modalOpen && selectedReport && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)', display: 'flex',
            alignItems: 'stretch', justifyContent: isMobile ? 'center' : 'flex-end', zIndex: 1000,
          }}>
            <div style={{
              backgroundColor: '#ffffff', width: isMobile ? '100%' : 720, maxWidth: isMobile ? '100%' : '90vw',
              height: '100%', overflow: 'auto', padding: 24,
              boxShadow: isMobile ? 'none' : '0 0 0 1px rgba(15, 23, 42, 0.06), -20px 0 40px rgba(15, 23, 42, 0.16)',
              borderRadius: isMobile ? 0 : '16px 0 0 16px',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Report Details</h2>
                <button
                  onClick={closeReportModal}
                  style={{
                    backgroundColor: 'transparent', border: 'none', fontSize: 24, color: '#6b7280',
                    cursor: 'pointer', padding: 0, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Report Details */}
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>Reporter</strong>
                  <p style={{ margin: '4px 0', color: '#111827' }}>@{selectedReport.reporter_username}</p>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>Reported User</strong>
                  <p style={{ margin: '4px 0', color: '#111827' }}>@{selectedReport.reported_username}</p>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>Reason</strong>
                  <p style={{ margin: '4px 0', color: '#111827' }}>{selectedReport.reason || <em>No reason provided</em>}</p>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <strong style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>Submitted</strong>
                  <p style={{ margin: '4px 0', color: '#111827' }}>{new Date(selectedReport.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <strong style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>Status</strong>
                  <p style={{
                    margin: '4px 0', display: 'inline-block', backgroundColor: '#e5e7eb',
                    padding: '4px 12px', borderRadius: 4, fontWeight: 600, fontSize: 12, color: '#374151',
                  }}>
                    {(selectedReport.status || 'open').charAt(0).toUpperCase() + (selectedReport.status || 'open').slice(1)}
                  </p>
                </div>
              </div>

              {/* Conversation Section */}
              {(selectedReport.trade_offer_id || selectedReport.skill_booking_id) && (
                <div style={{ marginBottom: 20 }}>
                  <strong style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Conversation</strong>
                  <p style={{ margin: '0 0 12px', color: '#374151', fontSize: 14 }}>Review the reported conversation</p>
                  <button
                    onClick={async () => {
                      if (conversationVisible) {
                        setConversationVisible(false);
                        return;
                      }

                      if (!conv?.loaded) {
                        await loadConversation(selectedReport.id);
                      }

                      setConversationVisible(true);
                    }}
                    style={{
                      backgroundColor: '#ffffff', border: '1px solid #d1d5db', borderRadius: 6, padding: '10px 16px',
                      fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', marginBottom: 12,
                      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
                    }}
                    disabled={conv?.loading}
                  >
                    {conversationVisible ? 'Hide Conversation' : 'View Conversation'}
                  </button>

                  {conversationVisible && (
                    <>
                      {conv?.loading && <p style={{ color: '#6b7280', fontSize: 13 }}>Loading conversation…</p>}
                      {conv?.error && <p style={{ color: '#dc2626', fontSize: 13 }}>Failed to load conversation.</p>}
                      {conv?.loaded && !conv.hasConversation && (
                        <p style={{ color: '#9ca3af', fontSize: 13 }}>No conversation linked to this report.</p>
                      )}
                      {conv?.loaded && conv.hasConversation && (
                        <div style={{
                          maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6,
                          background: '#f9fafb', borderRadius: 8, padding: '10px 12px', marginBottom: 12,
                        }}>
                          {conv.messages.length === 0 && (
                            <p style={{ color: '#9ca3af', fontSize: 13 }}>No messages in this conversation.</p>
                          )}
                          {conv.messages.map(m => {
                            const isByReported = m.sender_username === conv.reportedUsername;
                            return (
                              <div key={m.id} style={{ alignSelf: isByReported ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                                <div style={{
                                  fontSize: 10.5, color: '#6b7280', marginBottom: 2,
                                  textAlign: isByReported ? 'right' : 'left',
                                }}>
                                  @{m.sender_username}
                                  {isByReported && (
                                    <span style={{
                                      marginLeft: 6, background: '#fef3c7', color: '#92400e', borderRadius: 4,
                                      padding: '1px 5px', fontSize: 9.5, fontWeight: 600,
                                    }}>
                                      REPORTED USER
                                    </span>
                                  )}
                                </div>
                                <div style={{
                                  background: isByReported ? '#fef9c3' : '#ffffff',
                                  border: isByReported ? '1px solid #fde68a' : '1px solid #e5e7eb',
                                  borderRadius: 10, padding: '6px 10px', fontSize: 13,
                                  color: m.deleted ? '#9ca3af' : '#111827', fontStyle: m.deleted ? 'italic' : 'normal',
                                }}>
                                  {m.deleted ? 'This message was deleted' : m.message || (m.attachment_url ? '📎 Attachment' : '')}
                                </div>
                                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, textAlign: isByReported ? 'right' : 'left' }}>
                                  {new Date(m.created_at).toLocaleString()}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Take Action Section */}
              {!confirmAction && (
                <div>
                  <strong style={{ fontSize: 12, color: '#6b7280', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Take Action</strong>
                  <select
                    value={selectedAction}
                    onChange={(e) => {
                      const nextAction = e.target.value;
                      setSelectedAction('');
                      takeAction(nextAction);
                    }}
                    disabled={actionInProgress}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db',
                      fontSize: 13, fontFamily: 'inherit', color: '#111827', cursor: 'pointer',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <option value="">—  Select an action  —</option>
                    <option value="warn">⚠️ Warn User</option>
                    <option value="restrict">🔒 Restrict User</option>
                    <option value="suspend">⏸️ Suspend User</option>
                    <option value="ban">🚫 Ban User</option>
                    <option value="escalate">📈 Escalate to Discipline</option>
                    <option value="dismiss">✓ Dismiss Report</option>
                  </select>

                  {selectedReport.admin_notes && (
                    <div style={{ marginTop: 12, padding: 12, backgroundColor: '#f0fdf4', borderRadius: 6 }}>
                      <strong style={{ fontSize: 12, color: '#15803d' }}>Admin Notes:</strong>
                      <p style={{ margin: '4px 0', fontSize: 12, color: '#166534' }}>{selectedReport.admin_notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation Dialog */}
              {confirmAction && (
                <div style={{ padding: 16, backgroundColor: '#fef2f2', borderRadius: 8, marginBottom: 16 }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#991b1b' }}>
                    ⚠️ Confirm {confirmAction === 'suspend' ? 'Suspension' : 'Ban'}
                  </h3>
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: '#7f1d1d' }}>
                    {confirmAction === 'suspend'
                      ? 'Are you sure you want to suspend @' + selectedReport.reported_username + '? They will not be able to access their account.'
                      : 'Are you sure you want to ban @' + selectedReport.reported_username + '? This action is permanent.'}
                  </p>
                  <textarea
                    placeholder="Optional: Add notes about this action (visible to support team)"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #fca5a5',
                      fontSize: 13, fontFamily: 'inherit', marginBottom: 12, resize: 'vertical', minHeight: 60,
                      backgroundColor: '#ffffff',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => executeAction(confirmAction)}
                      disabled={actionInProgress}
                      style={{
                        flex: 1, backgroundColor: '#dc2626', color: '#ffffff', border: 'none', borderRadius: 6,
                        padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        opacity: actionInProgress ? 0.6 : 1,
                      }}
                    >
                      {actionInProgress ? 'Processing...' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => {
                        setConfirmAction(null);
                        setActionNotes('');
                      }}
                      disabled={actionInProgress}
                      style={{
                        flex: 1, backgroundColor: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6,
                        padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Close Button */}
              {!confirmAction && (
                <button
                  onClick={closeReportModal}
                  style={{
                    width: '100%', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6,
                    padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer',
                  }}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        )}
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
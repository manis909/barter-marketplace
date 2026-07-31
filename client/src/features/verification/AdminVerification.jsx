import { useState, useEffect } from 'react';
import api from '../../services/api';
import './Verification.css';

export default function AdminVerificationPage() {
  const [pending, setPending] = useState([]);
  const [rejectingId, setRejectingId] = useState(null);
  const [reasonText, setReasonText] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    load();
  }, []);

  function load() {
    api.get('/verification/pending')
      .then(res => setPending(res.data.pending))
      .catch(() => setError('Could not load pending submissions — admin access required.'));
  }

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
    } catch (err) {
      setError('Could not export log.');
    }
  }

  async function handleApprove(userId, username) {
    setError('');
    setSuccessMessage('');
    try {
      await api.post(`/verification/${userId}/approve`);
      setSuccessMessage(`@${username} approved — they've been notified.`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Approval failed. Please try again.');
    }
  }

  async function handleReject(userId, username) {
    if (!reasonText.trim()) {
      setError('Please enter a reason before rejecting.');
      return;
    }
    setError('');
    setSuccessMessage('');
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
    <div className="admin-verification-page">
      <div className="admin-verification-header">
        <h2>ID Verification Review</h2>
        <button
          type="button"
          className="admin-export-btn"
          onClick={handleExportCsv}
        >
          Export Log to CSV
        </button>
      </div>
      {error && <p className="verification-error">{error}</p>}
      {successMessage && <p className="verification-success">{successMessage}</p>}

      {pending.length === 0 && <p>No pending submissions.</p>}

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
                  <button onClick={() => { setRejectingId(null); setReasonText(''); }}>
                    Cancel
                  </button>
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
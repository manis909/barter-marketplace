import { useState, useEffect } from 'react';
import api from '../../services/api';
import './Verification.css';

export default function AdminVerificationPage() {
  const [pending, setPending] = useState([]);
  const [rejectingId, setRejectingId] = useState(null);
  const [reasonText, setReasonText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, []);

  function load() {
    api.get('/verification/pending')
      .then(res => setPending(res.data.pending))
      .catch(() => setError('Could not load pending submissions — admin access required.'));
  }

  async function handleApprove(userId) {
    await api.post(`/verification/${userId}/approve`);
    load();
  }

  async function handleReject(userId) {
    if (!reasonText.trim()) {
      setError('Please enter a reason before rejecting.');
      return;
    }
    await api.post(`/verification/${userId}/reject`, { reason: reasonText });
    setRejectingId(null);
    setReasonText('');
    setError('');
    load();
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
            {u.hallticket_signed_url && (
              <div>
                <p className="admin-image-label">Hall Ticket</p>
                <img src={u.hallticket_signed_url} alt="Submitted Hall Ticket" className="admin-verification-image" />
              </div>
            )}
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
                  <button className="admin-reject-btn" onClick={() => handleReject(u.id)}>
                    Confirm Reject
                  </button>
                  <button onClick={() => { setRejectingId(null); setReasonText(''); }}>
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <div className="admin-verification-actions">
                <button className="admin-approve-btn" onClick={() => handleApprove(u.id)}>
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
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import ChatWindow from '../features/chat/ChatWindow';
import RatingForm from '../features/ratings/RatingForm';
import { useAuth } from '../features/auth/AuthContext';

const API_URL = 'http://localhost:5000';

export default function Chat() {
  const { tradeId } = useParams();
  const [showRating, setShowRating] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [otherUserId, setOtherUserId] = useState(null);
  const [completeError, setCompleteError] = useState('');

  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  const handleMarkComplete = async () => {
    setCompleteError('');
    const token = localStorage.getItem('token');

    const res = await fetch(`${API_URL}/api/trades/${tradeId}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    if (!res.ok) {
      setCompleteError(data.message || 'Failed to mark trade complete');
      return;
    }

    const trade = data.tradeOffer;
    const otherId = trade.sender_id === currentUserId ? trade.receiver_id : trade.sender_id;
    setOtherUserId(otherId);
    setShowRating(true);
  };

  const handleSubmitReport = async () => {
    const token = localStorage.getItem('token');
    await fetch(`${API_URL}/api/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ reported_user_id: otherUserId, reason: reportReason })
    });
    setShowReport(false);
    setReportReason('');
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 16 }}>
      <h2>Trade Chat</h2>

      <ChatWindow tradeOfferId={tradeId} currentUserId={currentUserId} />

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button onClick={handleMarkComplete}>Mark Trade Complete</button>
        <button onClick={() => setShowReport(!showReport)}>Report User</button>
      </div>

      {completeError && <p style={{ color: 'red', fontSize: 13 }}>{completeError}</p>}

      {showReport && (
        <div style={{ marginTop: 12 }}>
          <textarea
            placeholder="Reason for report"
            value={reportReason}
            onChange={e => setReportReason(e.target.value)}
            style={{ width: '100%' }}
          />
          <button onClick={handleSubmitReport}>Submit Report</button>
        </div>
      )}

      {showRating && (
        <div style={{ marginTop: 12 }}>
          <RatingForm
            tradeOfferId={tradeId}
            revieweeId={otherUserId}
            onSubmitted={() => setShowRating(false)}
          />
        </div>
      )}
    </div>
  );
}
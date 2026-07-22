import { useState } from 'react';
import { useParams } from 'react-router-dom';
import ChatWindow from '../features/chat/ChatWindow';
import RatingForm from '../features/ratings/RatingForm';

const API_URL = 'http://localhost:5000';

export default function Chat() {
  const { tradeId } = useParams();
  const [showRating, setShowRating] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');

  // TODO: get the actual current user id and the other user's id
  // once Member 1's auth context is wired in — placeholders for now
  const currentUserId = null;
  const otherUserId = null;

  const handleMarkComplete = () => {
    // TODO: call Member 3's "mark trade complete" endpoint once it exists
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
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ChatWindow from '../features/chat/ChatWindow';
import RatingForm from '../features/ratings/RatingForm';
import { useAuth } from '../features/auth/AuthContext';
import { completeTrade, getMyTrades } from '../services/tradeService';

const API_URL = 'http://localhost:5000';

export default function Chat() {
  const { tradeId } = useParams();
  const [showRating, setShowRating] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [otherUserId, setOtherUserId] = useState(null);
  const [otherUserName, setOtherUserName] = useState('');
  const [completeError, setCompleteError] = useState('');

  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  useEffect(() => {
    async function loadTradeInfo() {
      try {
        const data = await getMyTrades();
        const trade = data.trades?.find(t => String(t.id) === String(tradeId));
        if (!trade) return;

        const isSender = trade.sender_id === currentUserId;

        const name =
          (isSender ? trade.receiver_name : trade.sender_name) ||
          (isSender ? trade.receiver?.name : trade.sender?.name) ||
          (isSender ? trade.receiver_username : trade.sender_username) ||
          '';

        const otherId = isSender ? trade.receiver_id : trade.sender_id;

        setOtherUserName(name);
        setOtherUserId(otherId);
      } catch (err) {
        console.error('Failed to load trade info for chat header:', err);
      }
    }
    if (tradeId && currentUserId) loadTradeInfo();
  }, [tradeId, currentUserId]);

  const handleMarkComplete = async () => {
    setCompleteError('');
    try {
      const data = await completeTrade(tradeId);
      const trade = data.tradeOffer;
      const otherId = trade.sender_id === currentUserId ? trade.receiver_id : trade.sender_id;
      setOtherUserId(otherId);
      setShowRating(true);
    } catch (err) {
      setCompleteError(err?.response?.data?.error || err?.message || 'Failed to mark trade complete');
    }
  };

  const handleSubmitReport = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reported_user_id: otherUserId, reason: reportReason })
      });

      if (!res.ok) throw new Error('Failed to submit report');

      setShowReport(false);
      setReportReason('');
      setReportSuccess(true);
      // No auto-hide timer — message stays visible until the user
      // reopens the "Report User" box (cleared in the button's onClick below)
    } catch (err) {
      console.error('Report submission failed:', err);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 16 }}>
      <ChatWindow tradeOfferId={tradeId} currentUserId={currentUserId} otherUserName={otherUserName} />

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button onClick={handleMarkComplete}>Mark Trade Complete</button>
        <button
          onClick={() => {
            setShowReport(!showReport);
            setReportSuccess(false);
          }}
        >
          Report User
        </button>
      </div>

      {completeError && <p style={{ color: 'red', fontSize: 13 }}>{completeError}</p>}
      {reportSuccess && <p style={{ color: 'green', fontSize: 13 }}>Report submitted successfully</p>}

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
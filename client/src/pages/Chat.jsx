import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ChatWindow from '../features/chat/ChatWindow';
import { useAuth } from '../features/auth/AuthContext';
import { getMyTrades, getTrade } from '../services/tradeService';

const API_URL = 'http://localhost:5000';

export default function Chat() {
  const { tradeId } = useParams();
  console.log('CHAT TRADE ID:', tradeId);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState('');
  const [otherUserId, setOtherUserId] = useState(null);
  const [otherUserName, setOtherUserName] = useState('');

  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id;

  useEffect(() => {
    async function loadTradeInfo() {
      try {
        const data = await getMyTrades();
        const trade = data.trades?.find(t => String(t.id) === String(tradeId));
        let resolvedTrade = trade;
        if (!resolvedTrade) {
          // Fallback: fetch the single trade if it's not present in the user's trade list
          try {
            const single = await getTrade(tradeId);
            if (single && single.tradeOffer) resolvedTrade = single.tradeOffer;
          } catch (e) {
            // ignore — we'll handle missing trade below
          }
        }
        if (!resolvedTrade) return;

        const isSender = resolvedTrade.sender_id === currentUserId;

        const name =
          (isSender ? resolvedTrade.receiver_name : resolvedTrade.sender_name) ||
          (isSender ? resolvedTrade.receiver?.name : resolvedTrade.sender?.name) ||
          (isSender ? resolvedTrade.receiver_username : resolvedTrade.sender_username) ||
          '';

        const otherId = isSender ? resolvedTrade.receiver_id : resolvedTrade.sender_id;

        setOtherUserName(name);
        setOtherUserId(otherId);
      } catch (err) {
        console.error('Failed to load trade info for chat header:', err);
      }
    }
    if (tradeId && currentUserId) loadTradeInfo();
  }, [tradeId, currentUserId]);

  const handleSubmitReport = async () => {
    setReportError('');
    // Validate required fields before sending
    if (!otherUserId) {
      setReportError('Cannot submit report: reported user is unknown.');
      return;
    }
    if (!tradeId) {
      setReportError('Cannot submit report: trade ID is missing.');
      return;
    }

    const token = localStorage.getItem('token');
    console.log('REPORT SUBMIT PAYLOAD:', {
      reported_user_id: otherUserId,
      reason: reportReason,
      trade_offer_id: tradeId
    });

    try {
      const res = await fetch(`${API_URL}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          reported_user_id: otherUserId,
          reason: reportReason,
          trade_offer_id: tradeId || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit report');

      setShowReport(false);
      setReportReason('');
      setReportSuccess(true);
    } catch (err) {
      console.error('Report submission failed:', err);
      setReportError('Report submission failed. Please try again.');
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 16 }}>
      <ChatWindow tradeOfferId={tradeId} currentUserId={currentUserId} otherUserName={otherUserName} />

      <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <button
          onClick={() => {
            setShowReport(!showReport);
            setReportSuccess(false);
          }}
        >
          Report User
        </button>
      </div>

      {reportSuccess && <p style={{ color: 'green', fontSize: 13 }}>Report submitted successfully</p>}
      {reportError && <p style={{ color: 'red', fontSize: 13 }}>{reportError}</p>}

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
    </div>
  );
}

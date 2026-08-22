import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ChatWindow from '../features/chat/ChatWindow';
import { useAuth } from '../features/auth/AuthContext';
import { getMyTrades, getTrade } from '../services/tradeService';
import ReportModal from '../components/ReportModal';

export default function Chat() {
  const { tradeId } = useParams();
  const [showReport, setShowReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
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

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', padding: 16 }}>
      <ChatWindow tradeOfferId={tradeId} currentUserId={currentUserId} otherUserName={otherUserName} />

      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
        {reportSuccess ? (
          <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>
            ✓ Reported
          </span>
        ) : (
          <button
            onClick={() => setShowReport(true)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
              cursor: 'pointer',
            }}
          >
            Report User
          </button>
        )}
      </div>

      {reportSuccess && (
        <p style={{ color: '#15803d', fontSize: 13, marginTop: 8 }}>
          Report submitted successfully
        </p>
      )}

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        reportedUserId={otherUserId}
        tradeOfferId={tradeId || null}
        userName={otherUserName}
        onSuccess={() => setReportSuccess(true)}
      />
    </div>
  );
}

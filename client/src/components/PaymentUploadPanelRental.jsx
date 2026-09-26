import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { getRentalBookingPaymentQr, uploadRentalBookingPayment } from '../services/rentalBookingService';

// ── QR canvas component for rentals ─────────────────────────────────────────────
function UpiQrCodeRental({ upiId, upiName, amount, requestId, qrText }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !upiId) return;
    const tn = `Rental-${requestId.slice(0, 8)}`;
    const uri = qrText || `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName || '')}&am=${amount || ''}&tn=${encodeURIComponent(tn)}`;

    QRCode.toCanvas(canvasRef.current, uri, {
      width: 180,
      margin: 1,
      color: { dark: '#0F766E', light: '#ffffff' },
    }).catch(err => console.error('QR generation error:', err));
  }, [upiId, upiName, amount, requestId]);

  if (!upiId && !qrText) {
    return (
      <div style={{ textAlign: 'center', color: '#78716C', fontSize: 12, padding: 12 }}>
        UPI ID not configured — contact support.
      </div>
    );
  }

  return <canvas ref={canvasRef} style={{ borderRadius: 6 }} />;
}

// ── Payment upload panel for rentals ────────────────────────────────────────────
export default function PaymentUploadPanelRental({ request, onSuccess }) {
  const [upiInfo, setUpiInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [utr, setUtr] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const UPI_ID   = import.meta.env.VITE_UPI_ID   || '';
  const UPI_NAME = import.meta.env.VITE_UPI_NAME || '';

  // Load payment info when component mounts
  useEffect(() => {
    async function loadPaymentInfo() {
      try {
        const data = await getRentalBookingPaymentQr(request.id);
        setUpiInfo(data);
      } catch (err) {
        console.error('Failed to load payment info:', err);
        setError(err.response?.data?.error || 'Failed to load payment details.');
      } finally {
        setLoadingInfo(false);
      }
    }
    loadPaymentInfo();
  }, [request.id]);

  function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!file) { setError('Please attach your payment screenshot.'); return; }
    if (utr.trim().length < 6) { setError('UTR / transaction reference must be at least 6 characters.'); return; }

    setSubmitting(true);
    try {
      await uploadRentalBookingPayment(request.id, file, utr.trim());
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingInfo) {
    return (
      <div style={{
        background: '#F9F8F6',
        border: '1.5px solid #E4E2D9',
        borderRadius: 14,
        padding: 16,
        textAlign: 'center',
        color: '#57534E',
        fontSize: 13
      }}>
        Loading payment details...
      </div>
    );
  }

  if (error && !upiInfo) {
    return (
      <div style={{
        background: '#FEE2E2',
        border: '1.5px solid #FCA5A5',
        borderRadius: 14,
        padding: 16,
        color: '#991B1B',
        fontSize: 13
      }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{
      background: '#F9F8F6',
      border: '1.5px solid #E4E2D9',
      borderRadius: 14,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }}>
      <p style={{ fontWeight: 700, fontSize: 13.5, color: '#1C1917', margin: 0 }}>
        💸 Pay via UPI
      </p>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#fff',
        borderRadius: 10,
        padding: 12,
        border: '1px solid #E4E2D9'
      }}>
        <UpiQrCodeRental
          upiId={UPI_ID}
          upiName={UPI_NAME}
          amount={upiInfo?.amount || ''}
          requestId={request.id}
          qrText={upiInfo?.qrText}
        />
      </div>

      <div style={{ fontSize: 12, color: '#78716C', lineHeight: 1.55, margin: 0 }}>
        <p style={{ margin: '0 0 4px' }}>
          <strong>Total: ₹{upiInfo?.amount || 0}</strong> (Fee: ₹{upiInfo?.fee || 0} + Deposit: ₹{upiInfo?.deposit || 0})
        </p>
        <p style={{ margin: '4px 0 0' }}>
          Scan the QR code with any UPI app (GPay, PhonePe, Paytm, etc.).
          After paying, enter the UTR / transaction reference shown in your
          bank app and upload a screenshot of the success screen.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: '#1C1917', display: 'flex', flexDirection: 'column', gap: 5 }}>
          UTR / Transaction Reference
          <input
            className="pay-input"
            type="text"
            placeholder="e.g. 426123456789"
            value={utr}
            onChange={e => { setUtr(e.target.value); setError(''); }}
            disabled={submitting}
            autoComplete="off"
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1.5px solid #E4E2D9',
              borderRadius: 9,
              fontSize: 13,
              fontFamily: "'IBM Plex Mono', monospace",
              background: '#fff',
              color: '#1C1917',
              boxSizing: 'border-box',
              outline: 'none',
              transition: 'border-color 0.18s'
            }}
          />
        </label>

        <label style={{ fontSize: 12, fontWeight: 600, color: '#1C1917', display: 'flex', flexDirection: 'column', gap: 5 }}>
          Payment Screenshot
          <div style={{
            border: '2px dashed #E4E2D9',
            borderRadius: 10,
            padding: 14,
            textAlign: 'center',
            cursor: 'pointer',
            background: '#fff',
            transition: 'border-color 0.18s',
            position: 'relative'
          }}>
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={handleFileChange}
              disabled={submitting}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: 0,
                cursor: 'pointer',
                width: '100%',
                height: '100%'
              }}
            />
            {!preview ? (
              <span style={{ fontSize: 12, color: '#78716C' }}>
                📎 Click to attach JPG/PNG (max 5 MB)
              </span>
            ) : (
              <img
                src={preview}
                alt="Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: 120,
                  borderRadius: 8,
                  objectFit: 'contain',
                  display: 'block',
                  margin: '8px auto 0'
                }}
              />
            )}
          </div>
        </label>

        {error && (
          <p style={{
            fontSize: 12,
            color: '#991B1B',
            background: '#FEE2E2',
            padding: '8px 12px',
            borderRadius: 8,
            margin: 0
          }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: '10px 0',
            background: '#0F766E',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.2s'
          }}
        >
          {submitting ? 'Submitting…' : '📤 Submit Payment'}
        </button>
      </form>
    </div>
  );
}
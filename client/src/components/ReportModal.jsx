import { useState } from 'react';

const API_URL = 'http://localhost:5000';

export const REPORT_REASONS = [
  'Fraud / Scam',
  'Harassment / Abuse',
  'Payment / Transaction Issue',
  'Other',
];

export default function ReportModal({
  isOpen,
  onClose,
  reportedUserId,
  tradeOfferId = null,
  skillBookingId = null,
  userName = '',
  onSuccess,
}) {
  const [selectedReason, setSelectedReason] = useState('');
  const [description, setDescription]       = useState('');
  const [isEditorOpen, setIsEditorOpen]     = useState(false);
  const [error, setError]                   = useState('');
  const [submitting, setSubmitting]         = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (submitting) return;
    setError('');
    setSelectedReason('');
    setDescription('');
    setIsEditorOpen(false);
    onClose();
  };

  const handleSelectReason = (reason) => {
    if (submitting) return;
    setSelectedReason(reason);
    setError('');
    if (reason !== 'Other') {
      setIsEditorOpen(false);
      setDescription('');
    }
  };

  const handleOpenEditor = (e) => {
    e.stopPropagation();
    setIsEditorOpen(true);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');

    if (!reportedUserId) {
      setError('Cannot submit report: reported user is missing.');
      return;
    }

    if (!selectedReason) {
      setError('Please select a reason for the report.');
      return;
    }

    const isOther = selectedReason === 'Other';
    const cleanDesc = description.trim();

    if (isOther && !cleanDesc) {
      setError('Please provide an explanation for "Other".');
      if (!isEditorOpen) setIsEditorOpen(true);
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_URL}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reported_user_id: reportedUserId,
          reason: selectedReason,
          description: isOther ? cleanDesc : '',
          trade_offer_id: tradeOfferId || null,
          skill_booking_id: skillBookingId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to submit report');
      }

      setError('');
      setSelectedReason('');
      setDescription('');
      setIsEditorOpen(false);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred while submitting the report.');
    } finally {
      setSubmitting(false);
    }
  };

  const isOther = selectedReason === 'Other';
  const isSubmitDisabled =
    submitting || !selectedReason || (isOther && (!description.trim() || !isEditorOpen && !description.trim()));

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90vh',
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          fontFamily: 'Manrope, sans-serif',
          animation: 'fadeInReportModal 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid #E4E2D9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '17px',
                fontWeight: 600,
                fontFamily: 'Fraunces, serif',
                color: '#24231F',
              }}
            >
              Report User
            </h3>
            {userName && (
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#5F5B52' }}>
                Reporting @{userName}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              color: '#5F5B52',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div
          style={{
            padding: '16px 20px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          {error && (
            <div
              style={{
                padding: '10px 12px',
                marginBottom: '14px',
                backgroundColor: '#FEE2E2',
                border: '1px solid #F87171',
                borderRadius: '8px',
                color: '#991B1B',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {error}
            </div>
          )}

          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: '#24231F',
              marginBottom: '10px',
            }}
          >
            Select a Reason <span style={{ color: '#DC2626' }}>*</span>
          </label>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '8px',
            }}
          >
            {REPORT_REASONS.map((r) => {
              const isSelected = selectedReason === r;
              const isOtherOption = r === 'Other';

              return (
                <div
                  key={r}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectReason(r)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectReason(r);
                    }
                  }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: isSelected ? '1.5px solid #3D6E63' : '1px solid #E4E2D9',
                    backgroundColor: isSelected ? '#EBF2F0' : '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    userSelect: 'none',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: isSelected ? 600 : 500,
                        color: isSelected ? '#2F5B4D' : '#24231F',
                      }}
                    >
                      {r}
                    </span>
                    {isSelected && (
                      <span
                        style={{
                          fontSize: '14px',
                          color: '#3D6E63',
                          fontWeight: 700,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>

                  {/* If "Other" is selected, render Open Editor button or Textarea */}
                  {isOtherOption && isSelected && (
                    <div
                      style={{ marginTop: '10px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!isEditorOpen ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={handleOpenEditor}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '7px',
                              border: '1px solid #3D6E63',
                              backgroundColor: '#FFFFFF',
                              color: '#3D6E63',
                              fontSize: '12.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'Manrope, sans-serif',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            ✏️ Open Editor
                          </button>
                          <span style={{ fontSize: '12px', color: '#5F5B52' }}>
                            Explanation required
                          </span>
                        </div>
                      ) : (
                        <div>
                          <label
                            style={{
                              display: 'block',
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#24231F',
                              marginBottom: '5px',
                            }}
                          >
                            Explain Reason <span style={{ color: '#DC2626' }}>*</span>
                          </label>
                          <textarea
                            rows={3}
                            value={description}
                            autoFocus
                            onChange={(e) => {
                              setDescription(e.target.value);
                              if (error) setError('');
                            }}
                            placeholder="Please provide details about why you are reporting this user..."
                            style={{
                              width: '100%',
                              borderRadius: '8px',
                              border: '1px solid #C9E5D8',
                              padding: '8px 10px',
                              boxSizing: 'border-box',
                              resize: 'vertical',
                              fontFamily: 'Manrope, sans-serif',
                              fontSize: '13px',
                              color: '#24231F',
                              backgroundColor: '#FFFFFF',
                              outline: 'none',
                              minHeight: '70px',
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #E4E2D9',
            display: 'flex',
            gap: '10px',
            justifyContent: 'flex-end',
            backgroundColor: '#F9F8F5',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #E4E2D9',
              backgroundColor: '#FFFFFF',
              color: '#5F5B52',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: 'Manrope, sans-serif',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: isSubmitDisabled ? '#9CA3AF' : '#3D6E63',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: 600,
              cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
              fontFamily: 'Manrope, sans-serif',
              transition: 'background 0.15s ease',
            }}
          >
            {submitting ? 'Submitting…' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  );
}

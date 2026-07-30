import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../auth/AuthContext';
import './Verification.css';

export default function IdVerification() {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [idFile, setIdFile] = useState(null);
  const [hallTicketFile, setHallTicketFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const idInputRef = useRef(null);
  const hallTicketInputRef = useRef(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  function fetchStatus() {
    api.get('/verification/status')
      .then(res => {
        setStatus(res.data.verification_status);
        setRejectionReason(res.data.verification_rejection_reason || '');
      })
      .catch(() => {});
  }

  function validateFile(file) {
    if (!file.type.startsWith('image/')) {
      return 'Please choose an image file.';
    }
    if (file.size > 8 * 1024 * 1024) {
      return 'Image must be smaller than 8MB.';
    }
    return null;
  }

  function handleIdSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setError('');
    setIdFile(file);
  }

  function handleHallTicketSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setError('');
    setHallTicketFile(file);
  }

  async function handleSubmit() {
    if (!idFile || !hallTicketFile) {
      setError('Both ID card and hall ticket photos are required.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('id_photo', idFile);
      formData.append('hallticket_photo', hallTicketFile);

      await api.post('/verification/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setStatus('pending');
      setIdFile(null);
      setHallTicketFile(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  if (currentUser?.is_verified) {
    return (
      <div className="verification-card verification-approved">
        <span className="verification-shield">🛡️</span>
        <p>You're verified! Your account has a trust badge visible on your profile.</p>
      </div>
    );
  }

  return (
    <div className="verification-card">
      <h3>Get Verified</h3>
      <p className="verification-intro">
        Upload a clear photo of your college ID card <strong>and</strong> your hall ticket to get a verified
        badge on your profile. Both are used only for verification and are deleted immediately after review —
        we don't keep copies.
      </p>

      {status === 'pending' && (
        <div className="verification-status verification-status-pending">
          Your documents are under review. This usually takes a day or two.
        </div>
      )}

      {status === 'rejected' && (
        <div className="verification-status verification-status-rejected">
          <strong>Your last submission wasn't approved:</strong>
          <p>{rejectionReason}</p>
          <p>You can upload new photos below and try again.</p>
        </div>
      )}

      {error && <p className="verification-error">{error}</p>}

      {status !== 'pending' && (
        <>
          <div className="verification-upload-slot">
            <div className="verification-upload-label">
              <span>ID Card</span>
              {idFile && <span className="verification-file-chosen">✓ {idFile.name}</span>}
            </div>
            <button
              type="button"
              className="verification-upload-btn"
              onClick={() => idInputRef.current?.click()}
              disabled={uploading}
            >
              {idFile ? 'Change ID Card Photo' : 'Upload ID Card Photo'}
            </button>
            <input
              ref={idInputRef}
              type="file"
              accept="image/*"
              onChange={handleIdSelect}
              style={{ display: 'none' }}
            />
          </div>

          <div className="verification-upload-slot">
            <div className="verification-upload-label">
              <span>Hall Ticket</span>
              {hallTicketFile && <span className="verification-file-chosen">✓ {hallTicketFile.name}</span>}
            </div>
            <button
              type="button"
              className="verification-upload-btn"
              onClick={() => hallTicketInputRef.current?.click()}
              disabled={uploading}
            >
              {hallTicketFile ? 'Change Hall Ticket Photo' : 'Upload Hall Ticket Photo'}
            </button>
            <input
              ref={hallTicketInputRef}
              type="file"
              accept="image/*"
              onChange={handleHallTicketSelect}
              style={{ display: 'none' }}
            />
          </div>

          <button
            type="button"
            className="verification-submit-btn"
            onClick={handleSubmit}
            disabled={uploading || !idFile || !hallTicketFile}
          >
            {uploading ? 'Submitting...' : 'Submit for Verification'}
          </button>

          <p className="verification-tips">
            📸 For a smooth review: take both photos in good lighting, keep all four corners visible,
            avoid glare or blur, and make sure your name and photo are clearly readable on each document.
          </p>
        </>
      )}
    </div>
  );
}
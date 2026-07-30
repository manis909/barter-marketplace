import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './VerificationStatus.css';

// Drop this into Profile.jsx (view mode), right below the profile-header-row
// block. It checks the logged-in user's verification status and shows:
//  - nothing, if already verified
//  - a "Get Verified" button, if never submitted
//  - the rejection reason + a "Try Again" button, if rejected
//  - a "Pending review" note, if submitted and waiting on admin
//
// ASSUMPTION: your ID verification submission page route is called
// ROUTES.VERIFY_ID (e.g. '/verify-id'). If your actual route/constant
// name is different, just change the `to={...}` value below.
export default function VerificationStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.get('/verification/status')
      .then(res => setStatus(res.data))
      .catch(() => setStatus(null));
  }, []);

  if (!status || status.is_verified) return null;

  if (status.verification_status === 'pending') {
    return (
      <div className="verification-status verification-status-pending">
        <p>Your verification is pending review.</p>
      </div>
    );
  }

  if (status.verification_status === 'rejected') {
    return (
      <div className="verification-status verification-status-rejected">
        <p>
          <strong>Verification rejected:</strong> {status.verification_rejection_reason}
        </p>
        <Link to="/verify-id" className="verification-status-btn">
          Try Again
        </Link>
      </div>
    );
  }

  // Never submitted at all
  return (
    <div className="verification-status verification-status-unverified">
      <Link to="/verify-id" className="verification-status-btn">
        Get Verified
      </Link>
    </div>
  );
}
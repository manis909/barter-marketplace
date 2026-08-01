import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from './AuthContext';
import { ROUTES } from '../../utils/constants';
import AuthBackground from './AuthBackground';
import './AuthPages.css';

function getPasswordError(password) {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 32) return 'Password must be 32 characters or fewer.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return 'Password must include at least one symbol (e.g. ! @ # $ %).';
  }
  return null;
}

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [idPhoto, setIdPhoto] = useState(null);
  const [hallTicketNumber, setHallTicketNumber] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const passwordLiveError = password.length > 0 ? getPasswordError(password) : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const strengthError = getPasswordError(password);
    if (strengthError) {
      setError(strengthError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!idPhoto) {
      setError('Please upload your ID card to sign up.');
      return;
    }

    if (!hallTicketNumber.trim()) {
      setError('Please enter your hall ticket number to sign up.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('full_name', fullName);
      formData.append('email', email);
      formData.append('password', password);
      formData.append('id_photo', idPhoto);
      formData.append('hallticket_number', hallTicketNumber.trim());

      const res = await api.post('/auth/signup', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      login(res.data.user, res.data.token);
      navigate(ROUTES.PROFILE);
    } catch (err) {
      const backendMessage = err.response?.data?.error;

      // Give a clearer, more specific message for the duplicate case
      if (backendMessage === 'Email or username already registered') {
        setError('An account with this email or username already exists. Try logging in instead.');
      } else if (err.response) {
        setError(backendMessage || 'Signup failed. Please try again.');
      } else {
        setError('Could not reach the server. Please check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <AuthBackground />
      <div className="auth-card">
        <h2>Create your account</h2>
        <p className="auth-subtitle">Join Barter and start trading</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <input
              placeholder="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <input
              placeholder="Full Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
            />
          </div>
          <div className="auth-field">
            <input
              placeholder="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="auth-field password-field">
            <input
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={32}
            />
            <button
              type="button"
              className="barter-auth-eye-toggle"
              onClick={() => setShowPassword(s => !s)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {passwordLiveError && (
            <p className="field-error">{passwordLiveError}</p>
          )}
          <div className="auth-field password-field">
            <input
              placeholder="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              maxLength={32}
            />
          </div>

          <div className="auth-field">
            <label className="auth-file-label">ID Card</label>
            <input
              type="file"
              accept="image/*"
              onChange={e => setIdPhoto(e.target.files[0] || null)}
              required
              className="auth-file-input"
            />
          </div>

          <div className="auth-field">
            <input
              placeholder="Hall Ticket Number"
              value={hallTicketNumber}
              onChange={e => setHallTicketNumber(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="auth-submit" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to={ROUTES.LOGIN}>Log In</Link>
        </p>
      </div>
    </div>
  );
}
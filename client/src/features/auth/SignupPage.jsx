import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from './AuthContext';
import { ROUTES } from '../../utils/constants';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    try {
      const res = await api.post('/auth/signup', {
        username,
        full_name: fullName,
        email,
        password,
      });
      login(res.data.user, res.data.token);
      navigate(ROUTES.PROFILE);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Sign Up</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
      <input placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
      <input
        placeholder="Email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      <button type="submit">Sign Up</button>
    </form>
  );
}
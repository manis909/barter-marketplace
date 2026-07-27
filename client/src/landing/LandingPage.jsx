import '../App.css';
import './LandingPage.css';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="center-screen" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}>
      <div style={{ textAlign: 'center', width: '100%' }}>
        <div className="drift-wrap">
          <div className="drift-text welcome-drift">Welcome to Barter</div>
        </div>

        <div style={{ marginTop: 28, display: 'flex', gap: 18, justifyContent: 'center' }}>
          <button className="glass-btn" onClick={() => navigate('/login')}>Login</button>
          <button className="glass-btn" onClick={() => navigate('/signup')}>Sign Up</button>
        </div>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import Silk from '../components/Silk';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing-page">
      <div className="landing-silk-bg" aria-hidden="true">
        <Silk
          speed={5.3}
          scale={1}
          color="#38b71a"
          noiseIntensity={1.5}
          rotation={0}
        />
      </div>

      <div className="landing-overlay" aria-hidden="true" />

      <div className="landing-content">
        <h1 className="landing-heading landing-fade-in landing-fade-1">Welcome to <span className="landing-highlight">TRISTAL</span> </h1>
        <p className="landing-subtitle landing-fade-in landing-fade-2">Trade what you have, share what you know, and rent what you need.

</p>

        <div className="landing-actions landing-fade-in landing-fade-3">
          <Link to={ROUTES.LOGIN} className="landing-btn landing-btn-primary">
            Log In
          </Link>
          <Link to={ROUTES.SIGNUP} className="landing-btn landing-btn-secondary">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}
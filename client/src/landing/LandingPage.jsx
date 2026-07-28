import { Link } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import landingVideo from '../assets/landing-background.mp4';
import './LandingPage.css';

// NOTE: this replaces the previous landing page design — confirm with
// the team before this is the final version, since the old page had
// a lot of finished content (feature list, stats, trade preview card).
export default function LandingPage() {
  return (
    <div className="landing-page">
      <video
        className="landing-video-bg"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      >
        <source src={landingVideo} type="video/mp4" />
      </video>

      <div className="landing-content">
        <h1 className="landing-heading">Welcome to <span className="landing-highlight">Barter</span> !</h1>
        <p className="landing-subtitle">Trade what you have for what you need — no cash required.</p>

        <div className="landing-actions">
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
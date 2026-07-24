// client/src/components/AppLayout.jsx
// Decides which navbar to show based on the current route.
// Landing page gets the minimal LandingNavbar; every other page
// gets the full Navbar with search, profile, and notifications.

import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import LandingNavbar from '../landing/components/LandingNavbar';

const LANDING_ROUTES = ['/', '/landing'];

function AppLayout({ children }) {
  const location = useLocation();
  const isLandingPage = LANDING_ROUTES.includes(location.pathname);

  return (
    <div className="app-shell">
      {isLandingPage ? <LandingNavbar /> : <Navbar />}
      <main className="app-main">{children}</main>
    </div>
  );
}

export default AppLayout;
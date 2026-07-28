// client/src/components/AppLayout.jsx
// Decides which navbar to show based on the current route.
// Landing page and auth pages get no navbar at all; every other
// page gets the full Navbar with search, profile, and notifications.

import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';

<<<<<<< HEAD
const NO_NAVBAR_ROUTES = ['/login', '/signup', '/', '/landing'];
=======
const NO_NAVBAR_ROUTES = ['/', '/landing', '/login', '/signup'];
>>>>>>> 04c40f3efaae33df63a97887176f957b6ef5017a

function AppLayout({ children }) {
  const location = useLocation();
  const hideNavbar = NO_NAVBAR_ROUTES.includes(location.pathname);

  return (
    <div className="app-shell">
      {!hideNavbar && <Navbar />}
      <main className="app-main">{children}</main>
    </div>
  );
}

export default AppLayout;
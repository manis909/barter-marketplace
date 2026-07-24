
// client/src/components/Navbar.jsx
// Routing shell only — links to each member's pages, no page logic here.
 
import { Link } from 'react-router-dom';
import NotificationBell from '../features/notifications/NotificationBell';
import { useAuth } from '../features/auth/AuthContext';
 
function Navbar() {
  const { currentUser } = useAuth();
 
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px', borderBottom: '1px solid #eee' }}>
      <Link to="/explore">Explore</Link>
      <Link to="/my-trades">My Trades</Link>
      <Link to="/wishlist">Wishlist</Link>
 
      {/* pushes everything after this to the right side of the navbar */}
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
        {currentUser && <NotificationBell />}
 
        {currentUser ? (
          <>
            <Link to="/profile">Profile</Link>
            <Link to="/logout">Logout</Link>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
 
export default Navbar;
 
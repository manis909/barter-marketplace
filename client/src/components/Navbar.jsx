// client/src/components/Navbar.jsx
// Main app navbar (post-login). Logo left, search bar center,
// right side order: Profile icon -> Explore -> Notification bell.
// My Trades / Wishlist moved into ProfileDrawer (ask its owner to add them there).

import { useState } from 'react';
import { Link } from 'react-router-dom';
import SearchBar from './SearchBar';
import ProfileDrawer from './ProfileDrawer';
import NotificationBell from '../features/notifications/NotificationBell';
import { User } from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import './Navbar.css';

function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { currentUser } = useAuth();

  return (
    <>
      <header className="navbar">
        <div className="navbar-left">
          <Link to="/explore" className="navbar-brand">
            <div className="navbar-mark">⇄</div>
            <p className="navbar-logo">Barter</p>
          </Link>
        </div>

        <div className="navbar-center">
          <SearchBar
            placeholder="Search items to trade..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="navbar-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {currentUser ? (
            <button
              type="button"
              className="profile-button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open profile drawer"
            >
              <User className="profile-icon" size={20} />
            </button>
          ) : (
            <Link to="/signup" className="navbar-link">signup</Link>
          )}

          <Link to="/explore" className="navbar-link">Explore</Link>

          {currentUser && <NotificationBell />}
        </div>
      </header>

      {currentUser && <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />}
    </>
  );
}

export default Navbar;
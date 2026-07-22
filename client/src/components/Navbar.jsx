// client/src/components/Navbar.jsx
// Routing shell only — links to each member's pages, no page logic here.

import { Link } from 'react-router-dom';
import NotificationBell from '../features/notifications/NotificationBell';

function Navbar() {
    return (
        <nav style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px', borderBottom: '1px solid #eee' }}>
            <Link to="/explore">Explore</Link>
            <Link to="/my-trades">My Trades</Link>
            <Link to="/wishlist">Wishlist</Link>

            {/* pushes NotificationBell + Profile to the right side of the navbar */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <NotificationBell />
                <Link to="/profile">Profile</Link>
            </div>
        </nav>
    );
}

export default Navbar;
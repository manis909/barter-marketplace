import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './features/auth/LoginPage';
import SignupPage from './features/auth/SignupPage';
import ExplorePage from './pages/Explore';
import ItemDetailPage from './pages/ItemDetail';
import AddItemPage from './pages/AddItem';
import ProfilePage from './pages/Profile';
import MyListingsPage from './pages/MyListings';
import MyTradesPage from './pages/MyTrades';
import TradeRequestsPage from './pages/TradeRequests';
import WishlistPage from './pages/Wishlist';
import Wallet from "./pages/Wallet";
import FeedbackPage from './pages/FeedbackReviews';
import HelpSupportPage from './pages/HelpSupport';
import LogoutPage from './pages/Logout';
import Notifications from './pages/Notifications';
import LandingPage from './landing/LandingPage';
import PrivacyPolicyPage from './pages/PrivacyPolicy';
import TermsAndConditionsPage from './pages/TermsAndConditions';
import SkilterPage from './pages/Skilter';
import MySkillBookingsPage from './pages/MySkillBookings';
import RenterPage from './pages/Renter';
import AppLayout from './components/AppLayout';
import ChatsLayout from './pages/ChatsLayout';
import SkillChatsLayout from './pages/SkillChatsLayout';
import './App.css';
import AdminVerificationPage from './features/verification/AdminVerification';

// ── Skilter placeholder ───────────────────────────────────────────────────
// Rendered for Skilter-specific routes whose full page is being built
// separately. Replace each import individually when the real page is ready.
function SkilterPlaceholder({ title }) {
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center', color: '#64748B' }}>
      <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: '1.8rem', color: '#0F172A', marginBottom: 12 }}>
        {title}
      </h2>
      <p style={{ maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
        This section is being built. Check back soon.
      </p>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/item/:id" element={<ItemDetailPage />} />
            <Route path="/profile/:userId" element={<ProfilePage />} />
            <Route path="/add-item" element={<AddItemPage />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/my-listings" element={<MyListingsPage />} />
            <Route path="/my-trades" element={<MyTradesPage />} />
            <Route path="/trade-requests" element={<TradeRequestsPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/help" element={<HelpSupportPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsAndConditionsPage />} />
            <Route path="/logout" element={<LogoutPage />} />
            <Route path="/skilter" element={<SkilterPage />} />
            <Route path="/skills" element={<SkilterPage />} />
            <Route path="/skill-bookings" element={<MySkillBookingsPage />} />
            <Route path="/my-bookings" element={<MySkillBookingsPage />} />
            <Route path="/renter" element={<RenterPage />} />
            <Route path="/rent" element={<RenterPage />} />
            <Route path="/chats" element={<ChatsLayout />} />
            <Route path="/chat/:tradeId" element={<ChatsLayout />} />
            <Route path="/admin/verification" element={<AdminVerificationPage />} />

            {/* ── Skilter-specific routes ──────────────────────────────── */}
            {/* Replace SkilterPlaceholder with the real page when ready    */}
            <Route path="/skilter/skills"    element={<SkilterPlaceholder title="My Skills" />} />
            <Route path="/skilter/learning"  element={<SkilterPlaceholder title="My Learning" />} />
            <Route path="/skilter/teaching"  element={<SkilterPlaceholder title="My Teaching" />} />
            <Route path="/skilter/requests"  element={<SkilterPlaceholder title="Requests" />} />
            <Route path="/skilter/wishlist"  element={<SkilterPlaceholder title="Skilter Wishlist" />} />
            <Route path="/skilter/chat"      element={<SkillChatsLayout />} />
            <Route path="/skilter/chat/:bookingId" element={<SkillChatsLayout />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
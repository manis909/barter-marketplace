import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import { useAuth } from './features/auth/AuthContext';
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
import SkillDetailPage from './pages/SkillDetail';
import MySkillsPage from './pages/MySkillsPage';
import SkillProviderApplication from './pages/SkillProviderApplication';
import MySkillsManagement from './pages/MySkillsManagement';
import RenterPage from './pages/Renter';
import AppLayout from './components/AppLayout';
import ChatsLayout from './pages/ChatsLayout';
import SkillChatsLayout from './pages/SkillChatsLayout'; 
import SkillsProfile from './pages/SkillsProfile';
import RentalProfile from './pages/RentalProfile';
import './App.css';
import AdminVerificationPage from './features/verification/AdminVerification';
import AdminPaymentReviewPage from './pages/AdminPaymentReview';
import AdminApplicationReviewPage from './pages/AdminApplicationReview';

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

import MyLearningPage from './pages/MyLearning';
import MyTeachingPage from './pages/MyTeaching';
import SkilterWishlistPage from './pages/SkilterWishlist';

// Redirects an already-logged-in user straight to Explore if they land
// on the marketing/auth pages — no reason to show them Login/Signup/Landing
// again once they're already authenticated.
function RedirectIfLoggedIn({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) return null; // avoid a flash-redirect before auth state loads
  if (currentUser) return <Navigate to="/explore" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<RedirectIfLoggedIn><LandingPage /></RedirectIfLoggedIn>} />
            <Route path="/landing" element={<RedirectIfLoggedIn><LandingPage /></RedirectIfLoggedIn>} />
            <Route path="/login" element={<RedirectIfLoggedIn><LoginPage /></RedirectIfLoggedIn>} />
            <Route path="/signup" element={<RedirectIfLoggedIn><SignupPage /></RedirectIfLoggedIn>} />
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
            <Route path="/skilter/explore" element={<SkilterPage />} />
            <Route path="/skilter/skill/:id" element={<SkillDetailPage />} />
            <Route path="/skills" element={<SkilterPage />} />
            <Route path="/skilter/profile/:userId" element={<SkillsProfile />} />
            <Route path="/skilter/profile" element={<SkillsProfile />} />
            <Route path="/skilter/skill-provider/apply" element={<SkillProviderApplication />} />

            <Route path="/renter" element={<RenterPage />} />
            <Route path="/rent" element={<RenterPage />} />
            <Route path="/chats" element={<ChatsLayout />} />
            <Route path="/chat/:tradeId" element={<ChatsLayout />} />
            <Route path="/admin/verification" element={<AdminVerificationPage />} />
            <Route path="/admin/payment-review" element={<AdminPaymentReviewPage />} />
            <Route path="/admin/skill-applications/:id" element={<AdminApplicationReviewPage />} />
            <Route path="/rental/profile/:userId" element={<RentalProfile />} />
            <Route path="/rental/profile" element={<RentalProfile />} />

            {/* ── Skilter-specific routes ──────────────────────────────── */}
            <Route path="/skilter/skills"        element={<MySkillsPage />} />
            <Route path="/skilter/skills/manage" element={<MySkillsManagement />} />
            <Route path="/skilter/learning"      element={<MyLearningPage />} />
            <Route path="/skilter/teaching"  element={<MyTeachingPage />} />
            <Route path="/skilter/requests"  element={<SkilterPlaceholder title="Requests" />} />
            <Route path="/skilter/wishlist"  element={<SkilterWishlistPage />} />
            <Route path="/skilter/chat"      element={<SkillChatsLayout />} />
            <Route path="/skilter/chat/:bookingId" element={<SkillChatsLayout />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
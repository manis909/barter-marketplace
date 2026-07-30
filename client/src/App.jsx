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
import AppLayout from './components/AppLayout';
import ChatsLayout from './pages/ChatsLayout';
import './App.css';
import AdminVerificationPage from './features/verification/AdminVerification';

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
            <Route path="/logout" element={<LogoutPage />} />
            <Route path="/skills" element={<div style={{ padding: 40 }}>Skillter — coming soon</div>} />
            <Route path="/chats" element={<ChatsLayout />} />
            <Route path="/chat/:tradeId" element={<ChatsLayout />} />
            <Route path="/rent" element={<div style={{ padding: 40 }}>Renter — coming soon</div>} />
            <Route path="/admin/verification" element={<AdminVerificationPage />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
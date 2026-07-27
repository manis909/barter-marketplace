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
import ChatPage from './pages/Chat';
import Notifications from './pages/Notifications';
import ChatsPage from './pages/Chats';
import LandingPage from './landing/LandingPage';
import AppLayout from './components/AppLayout';
import './App.css';

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
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/chats" element={<ChatsPage />} />
            <Route path="/my-listings" element={<MyListingsPage />} />
            <Route path="/my-trades" element={<MyTradesPage />} />
            <Route path="/trade-requests" element={<TradeRequestsPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/help" element={<HelpSupportPage />} />
            <Route path="/logout" element={<LogoutPage />} />
            <Route path="/chat/:tradeId" element={<ChatPage />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
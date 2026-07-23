import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './features/auth/LoginPage';
import SignupPage from './features/auth/SignupPage';
import ExplorePage from './pages/Explore';
import ItemDetailPage from './pages/ItemDetail';
import ProfilePage from './pages/Profile';
import MyListingsPage from './pages/MyListings';
import MyTradesPage from './pages/MyTrades';
import WishlistPage from './pages/Wishlist';
import FeedbackPage from './pages/FeedbackReviews';
import HelpSupportPage from './pages/HelpSupport';
import LogoutPage from './pages/Logout';
import ChatPage from './pages/Chat';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Navbar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Navigate to="/explore" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/item/:id" element={<ItemDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/my-listings" element={<MyListingsPage />} />
              <Route path="/my-trades" element={<MyTradesPage />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/help" element={<HelpSupportPage />} />
              <Route path="/logout" element={<LogoutPage />} />
              <Route path="/chat/:tradeId" element={<ChatPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

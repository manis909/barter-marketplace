import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthContext';
import Navbar from './components/Navbar';
import LoginPage from './features/auth/LoginPage';
import SignupPage from './features/auth/SignupPage';
import ExplorePage from './pages/Explore';
import ItemDetailPage from './pages/ItemDetail';
import ProfilePage from './pages/Profile';
import MyTradesPage from './pages/MyTrades';
import WishlistPage from './pages/Wishlist';
import ChatPage from './pages/Chat';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/item/:id" element={<ItemDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/my-trades" element={<MyTradesPage />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/chat/:tradeId" element={<ChatPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
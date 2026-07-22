import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ExplorePage from './pages/Explore'
import ItemDetailPage from './pages/ItemDetail'
import ProfilePage from './pages/Profile'
import MyListingsPage from './pages/MyListings'
import MyTradesPage from './pages/MyTrades'
import WishlistPage from './pages/Wishlist'
import FeedbackPage from './pages/FeedbackReviews'
import HelpSupportPage from './pages/HelpSupport'
import LogoutPage from './pages/Logout'
import Navbar from './components/Navbar'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/explore" replace />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/item/:id" element={<ItemDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/my-listings" element={<MyListingsPage />} />
            <Route path="/my-trades" element={<MyTradesPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/help" element={<HelpSupportPage />} />
            <Route path="/logout" element={<LogoutPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import MovieDetail from './pages/MovieDetail';
import TVShowDetail from './pages/TVShowDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ProfileSettings from './pages/ProfileSettings';
import UserProfile from './pages/UserProfile';
import UserSearch from './pages/UserSearch';
import Watchlist from './pages/Watchlist';
import Watched from './pages/Watched';
import KNNAnalysis from './pages/KNNAnalysis';
import MyFriends from './pages/MyFriends';
import Settings from "./pages/Settings";
import Watching from "./pages/Watching";
import Discover from "./pages/Discover";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/movie/:id" element={
            <ProtectedRoute>
              <MovieDetail />
            </ProtectedRoute>
          } />
          <Route path="/tv/:id" element={
            <ProtectedRoute>
              <TVShowDetail />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/profile-settings" element={
            <ProtectedRoute>
              <ProfileSettings />
            </ProtectedRoute>
          } />
          <Route path="/user/:username" element={
            <ProtectedRoute>
              <UserProfile />
            </ProtectedRoute>
          } />
          <Route path="/search-users" element={
            <ProtectedRoute>
              <UserSearch />
            </ProtectedRoute>
          } />
          <Route path="/watchlist" element={
            <ProtectedRoute>
              <Watchlist />
            </ProtectedRoute>
          } />
          <Route path="/watched" element={
            <ProtectedRoute>
              <Watched />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/watching" element={
            <ProtectedRoute>
              <Watching />
            </ProtectedRoute>
          } />
          <Route path="/discover" element={
            <ProtectedRoute>
              <Discover />
            </ProtectedRoute>
          } />
          <Route path="/knn-analysis" element={
            <ProtectedRoute>
              <KNNAnalysis />
            </ProtectedRoute>
          } />
          <Route path="/my-friends" element={
            <ProtectedRoute>
              <MyFriends />
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

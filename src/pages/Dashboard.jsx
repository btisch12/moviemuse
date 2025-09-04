// src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "react-hot-toast";
import Layout from "../Layout";
import Recommendations from "../components/Recommendations";
import MovieCard from "../components/MovieCard";
import ActivityFeed from "../components/ActivityFeed";
import { FaSearch, FaUserPlus, FaCheck, FaTimes, FaUserFriends } from "react-icons/fa";

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [username, setUsername] = useState("");
  const [friendRequests, setFriendRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Fetch user's username
  useEffect(() => {
    const fetchUsername = async () => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsername(userData.username || "");
          }
        } catch (error) {
          console.error("Error fetching username:", error);
        }
      }
    };

    fetchUsername();
  }, [currentUser]);

  // Fetch friend requests
  useEffect(() => {
    const fetchFriendRequests = async () => {
      if (!currentUser) return;
      
      setLoadingRequests(true);
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const receivedRequests = userData.receivedRequests || [];
          
          if (receivedRequests.length > 0) {
            // Fetch details for each user who sent a request
            const requestDetails = await Promise.all(
              receivedRequests.map(async (userId) => {
                const requestUserDoc = await getDoc(doc(db, "users", userId));
                if (requestUserDoc.exists()) {
                  return {
                    uid: userId,
                    ...requestUserDoc.data()
                  };
                }
                return null;
              })
            );
            
            setFriendRequests(requestDetails.filter(user => user !== null));
          } else {
            setFriendRequests([]);
          }
        }
      } catch (error) {
        console.error("Error fetching friend requests:", error);
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchFriendRequests();
  }, [currentUser]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    try {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;

      // Search for both movies and TV shows
      const [movieResponse, tvResponse] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}`),
        fetch(`https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}`)
      ]);

      const [movieData, tvData] = await Promise.all([
        movieResponse.json(),
        tvResponse.json()
      ]);

      // Combine and format results
      const movies = (movieData.results || []).map(movie => ({
        ...movie,
        media_type: 'movie',
        title: movie.title,
        original_title: movie.original_title
      }));

      const tvShows = (tvData.results || []).map(tv => ({
        ...tv,
        media_type: 'tv',
        title: tv.name,
        original_title: tv.original_name
      }));

      // Combine and sort by popularity
      const combined = [...movies, ...tvShows].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      setResults(combined);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleAcceptFriend = async (targetUser) => {
    try {
      const currentUserRef = doc(db, "users", currentUser.uid);
      const targetUserRef = doc(db, "users", targetUser.uid);

      // Get current user data
      const currentUserSnap = await getDoc(currentUserRef);
      const currentUserData = currentUserSnap.data();
      
      // Get target user data
      const targetUserSnap = await getDoc(targetUserRef);
      const targetUserData = targetUserSnap.data();

      // Add to friends list for both users
      await updateDoc(currentUserRef, {
        friends: [...(currentUserData.friends || []), targetUser.uid],
        receivedRequests: (currentUserData.receivedRequests || []).filter(id => id !== targetUser.uid)
      });

      await updateDoc(targetUserRef, {
        friends: [...(targetUserData.friends || []), currentUser.uid],
        sentRequests: (targetUserData.sentRequests || []).filter(id => id !== currentUser.uid)
      });

      // Remove from local state
      setFriendRequests(prev => prev.filter(user => user.uid !== targetUser.uid));

      toast.success(`You are now friends with ${targetUser.username}!`);
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error("Failed to accept friend request");
    }
  };

  const handleDeclineFriend = async (targetUser) => {
    try {
      const currentUserRef = doc(db, "users", currentUser.uid);
      const targetUserRef = doc(db, "users", targetUser.uid);

      // Get current user data
      const currentUserSnap = await getDoc(currentUserRef);
      const currentUserData = currentUserSnap.data();
      
      // Get target user data
      const targetUserSnap = await getDoc(targetUserRef);
      const targetUserData = targetUserSnap.data();

      // Remove from received requests for current user
      await updateDoc(currentUserRef, {
        receivedRequests: (currentUserData.receivedRequests || []).filter(id => id !== targetUser.uid)
      });

      // Remove from sent requests for target user
      await updateDoc(targetUserRef, {
        sentRequests: (targetUserData.sentRequests || []).filter(id => id !== currentUser.uid)
      });

      // Remove from local state
      setFriendRequests(prev => prev.filter(user => user.uid !== targetUser.uid));

      toast.success("Friend request declined");
    } catch (error) {
      console.error("Error declining friend request:", error);
      toast.error("Failed to decline friend request");
    }
  };



  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Section */}
                 <div className="text-center mb-12">
           <h1 className="text-4xl font-bold mb-4 text-gray-900">
             Welcome back, {username || 'Movie Lover'}! 🎬
           </h1>
          <p className="text-lg text-gray-600 mb-8">
            Discover your next favorite movie or TV show
          </p>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row items-center gap-4 justify-center mb-8"
          >
            <div className="relative w-full md:w-2/3">
              <input
                type="text"
                placeholder="Search for movies and TV shows..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full px-5 py-3 pl-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              />
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {searching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Searching...
                </>
              ) : (
                'Search'
              )}
            </button>
          </form>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">
              Search Results ({results.length})
            </h2>
            <div className="space-y-2">
              {results.map((movie) => (
                <MovieCard key={`${movie.media_type}-${movie.id}`} movie={movie} />
              ))}
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recommendations */}
          <div className="lg:col-span-2">
            <Recommendations userId={currentUser.uid} />
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Friend Requests */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center gap-2 mb-4">
                <FaUserFriends className="text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Friend Requests</h3>
                {friendRequests.length > 0 && (
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                    {friendRequests.length}
                  </span>
                )}
              </div>

              {loadingRequests ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : friendRequests.length > 0 ? (
                <div className="space-y-3">
                  {friendRequests.map((user) => (
                    <div key={user.uid} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        {user.profilePicture ? (
                          <img
                            src={user.profilePicture}
                            alt={user.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <FaUserPlus className="text-gray-600" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.username}
                        </p>
                        {user.bio && (
                          <p className="text-xs text-gray-500 truncate">{user.bio}</p>
                        )}
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAcceptFriend(user)}
                          className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                          title="Accept"
                        >
                          <FaCheck className="text-xs" />
                        </button>
                        <button
                          onClick={() => handleDeclineFriend(user)}
                          className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                          title="Decline"
                        >
                          <FaTimes className="text-xs" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <FaUserFriends className="text-gray-400 text-2xl mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No pending friend requests</p>
                </div>
              )}
            </div>

            {/* Activity Feed */}
            <ActivityFeed />
          </div>
        </div>
      </div>
    </Layout>
  );
}

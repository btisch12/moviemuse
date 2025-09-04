import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc, deleteField } from "firebase/firestore";
import { useEffect, useState } from "react";
import Layout from "../Layout";
import { Link } from "react-router-dom";
import { FaStar, FaUser, FaUserFriends } from "react-icons/fa";

export default function Profile() {
  const { currentUser } = useAuth();
  const [recentlyWatched, setRecentlyWatched] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    const fetchProfileData = async () => {
      try {
        // Fetch recently watched movies
        const watchedRef = doc(db, "watched", currentUser.uid);
        const watchedSnap = await getDoc(watchedRef);
        if (watchedSnap.exists()) {
          const movies = Object.values(watchedSnap.data());
          movies.sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt));
          setRecentlyWatched(movies.slice(0, 10)); // Show only 10 most recent
        } else {
          setRecentlyWatched([]);
        }

        // Fetch friends list
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const friendIds = userData.friends || [];
          
          if (friendIds.length > 0) {
            // Fetch friend profiles
            const friendProfiles = await Promise.all(
              friendIds.map(async (friendId) => {
                const friendRef = doc(db, "users", friendId);
                const friendSnap = await getDoc(friendRef);
                if (friendSnap.exists()) {
                  return friendSnap.data();
                }
                return null;
              })
            );
            
            setFriends(friendProfiles.filter(friend => friend !== null));
          } else {
            setFriends([]);
          }
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [currentUser]);



  if (!currentUser) {
    return (
      <Layout>
        <div className="p-8 text-center text-lg text-gray-700">
          Please log in to view your profile.
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-center text-lg text-gray-700">
          Loading profile...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recently Watched Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <FaStar className="text-yellow-400" />
              Recently Watched
            </h2>
            {recentlyWatched.length === 0 ? (
              <p className="text-center text-gray-600 bg-white rounded-lg shadow-md p-6">
                No movies watched yet.
              </p>
            ) : (
              <div className="space-y-2">
                {recentlyWatched.map((content) => (
                  <div key={content.id} className="bg-white rounded-lg shadow-md overflow-hidden flex items-center p-3 gap-3">
                    <Link to={content.media_type === 'tv' ? `/tv/${content.id}` : `/movie/${content.id}`} className="flex-shrink-0">
                      {content.poster_path || content.poster ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w342${content.poster_path || content.poster}`}
                          alt={content.title}
                          className="w-20 h-30 object-cover rounded"
                        />
                      ) : (
                        <div className="w-20 h-30 bg-gray-200 flex items-center justify-center text-gray-400 text-xs rounded">
                          No image
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{content.title}</h3>
                      {content.comment && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2 italic">
                          "{content.comment}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <FaStar className="text-yellow-400 text-sm" />
                        <span className="text-sm text-gray-600">
                          {content.rating ? `${content.rating}/5` : "Not rated"}
                        </span>
                      </div>
                      <Link
                        to={content.media_type === 'tv' ? `/tv/${content.id}` : `/movie/${content.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium rounded-md transition-all duration-150 hover:scale-105"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Friends Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
              <FaUserFriends className="text-blue-400" />
              Friends ({friends.length})
            </h2>
            {friends.length === 0 ? (
              <p className="text-center text-gray-600 bg-white rounded-lg shadow-md p-6">
                No friends yet. <Link to="/search-users" className="text-blue-500 hover:text-blue-600 underline">Find friends</Link>
              </p>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div key={friend.uid} className="bg-white rounded-lg shadow-md overflow-hidden flex items-center p-3 gap-3">
                    <div className="flex-shrink-0">
                      {friend.profilePicture ? (
                        <img
                          src={friend.profilePicture}
                          alt={friend.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                          <FaUser className="text-gray-600" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">{friend.username}</h3>
                      {friend.bio && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {friend.bio}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      <Link
                        to={`/user/${friend.username}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium rounded-md transition-all duration-150 hover:scale-105"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
// src/pages/MyFriends.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Layout from "../Layout";
import { Link } from "react-router-dom";
import { FaUser, FaUserFriends, FaEye, FaTrash } from "react-icons/fa";

export default function MyFriends() {
  const { currentUser } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchFriends = async () => {
      if (!currentUser) return;
      
      setLoading(true);
      try {
        // Get current user's friends list
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
                  return {
                    uid: friendId,
                    ...friendSnap.data()
                  };
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
        console.error("Error fetching friends:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [currentUser]);

  const filteredFriends = friends.filter(friend =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (friend.bio && friend.bio.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const removeFriend = async (friendId) => {
    if (!confirm("Are you sure you want to remove this friend?")) return;
    
    try {
      // Remove from current user's friends list
      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const updatedFriends = userData.friends.filter(id => id !== friendId);
        
        await updateDoc(userRef, {
          friends: updatedFriends
        });
        
        // Remove current user from friend's friends list
        const friendRef = doc(db, "users", friendId);
        const friendSnap = await getDoc(friendRef);
        if (friendSnap.exists()) {
          const friendData = friendSnap.data();
          const updatedFriendFriends = friendData.friends.filter(id => id !== currentUser.uid);
          
          await updateDoc(friendRef, {
            friends: updatedFriendFriends
          });
        }
        
        // Update local state
        setFriends(prev => prev.filter(friend => friend.uid !== friendId));
      }
    } catch (error) {
      console.error("Error removing friend:", error);
    }
  };

  if (!currentUser) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-lg text-gray-700">Please log in to view your friends.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center gap-3">
            <FaUserFriends className="text-blue-500" />
            My Friends
          </h1>
          <p className="text-gray-600">
            Manage your friends and view their profiles.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search friends by username or bio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
        </div>

        {/* Friends List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading friends...</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-12">
            <FaUserFriends className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No friends yet</h3>
            <p className="text-gray-600 mb-6">
              Start building your network by finding and adding friends!
            </p>
            <Link
              to="/search-users"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaUser />
              Find Friends
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredFriends.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No friends match your search.</p>
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.uid}
                  className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Profile Picture */}
                      <div className="flex-shrink-0">
                        {friend.profilePicture ? (
                          <img
                            src={friend.profilePicture}
                            alt={friend.username}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                            <FaUser className="text-gray-500 text-xl" />
                          </div>
                        )}
                      </div>

                      {/* Friend Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {friend.username}
                        </h3>
                        {friend.bio && (
                          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                            {friend.bio}
                          </p>
                        )}
                        <p className="text-gray-500 text-xs mt-2">
                          Member since {new Date(friend.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/user/${friend.username}`}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        <FaEye />
                        View Profile
                      </Link>
                      <button
                        onClick={() => removeFriend(friend.uid)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                        title="Remove friend"
                      >
                        <FaTrash />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Stats */}
        {friends.length > 0 && (
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Friends Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{friends.length}</div>
                <div className="text-sm text-gray-600">Total Friends</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {friends.filter(f => f.bio && f.bio.trim()).length}
                </div>
                <div className="text-sm text-gray-600">With Bios</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {friends.filter(f => f.profilePicture).length}
                </div>
                <div className="text-sm text-gray-600">With Photos</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

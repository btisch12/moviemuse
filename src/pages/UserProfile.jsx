import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, deleteField } from "firebase/firestore";
import { toast } from "react-hot-toast";
import Layout from "../Layout";
import { FaUser, FaUserPlus, FaUserCheck, FaUserTimes, FaBan, FaEye, FaEyeSlash } from "react-icons/fa";

export default function UserProfile() {
  const { username } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [userProfile, setUserProfile] = useState(null);
  const [userLists, setUserLists] = useState({
    watchlist: [],
    watching: [],
    watched: []
  });
  const [relationship, setRelationship] = useState({
    isFriend: false,
    isBlocked: false,
    hasSentRequest: false,
    hasReceivedRequest: false
  });
  const [activeTab, setActiveTab] = useState('watched');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Find user by username
        const usersRef = doc(db, "users", "usernames");
        const usernamesSnap = await getDoc(usersRef);
        
        if (!usernamesSnap.exists()) {
          toast.error("User not found");
          navigate("/");
          return;
        }

        const usernamesData = usernamesSnap.data();
        const userId = usernamesData[username];
        
        if (!userId) {
          toast.error("User not found");
          navigate("/");
          return;
        }

        // Get user profile
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          toast.error("User not found");
          navigate("/");
          return;
        }

        const profileData = userSnap.data();
        setUserProfile({ ...profileData, uid: userId });

        // Get user's lists
        const [watchlistSnap, watchingSnap, watchedSnap] = await Promise.all([
          getDoc(doc(db, "watchlists", userId)),
          getDoc(doc(db, "watching", userId)),
          getDoc(doc(db, "watched", userId))
        ]);

        setUserLists({
          watchlist: watchlistSnap.exists() ? Object.values(watchlistSnap.data()) : [],
          watching: watchingSnap.exists() ? Object.values(watchingSnap.data()) : [],
          watched: watchedSnap.exists() ? Object.values(watchedSnap.data()).sort((a, b) => b.watchedAt - a.watchedAt) : []
        });

        // Check relationship if current user is logged in
        if (currentUser && currentUser.uid !== userId) {
          const currentUserRef = doc(db, "users", currentUser.uid);
          const currentUserSnap = await getDoc(currentUserRef);
          
          if (currentUserSnap.exists()) {
            const currentUserData = currentUserSnap.data();
            const friends = currentUserData.friends || [];
            const blocked = currentUserData.blocked || [];
            const sentRequests = currentUserData.sentRequests || [];
            const receivedRequests = currentUserData.receivedRequests || [];

            setRelationship({
              isFriend: friends.includes(userId),
              isBlocked: blocked.includes(userId),
              hasSentRequest: sentRequests.includes(userId),
              hasReceivedRequest: receivedRequests.includes(userId)
            });
          }
        }

      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast.error("Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [username, currentUser, navigate]);

  const handleAddFriend = async () => {
    if (!currentUser) {
      toast.error("Please log in to add friends");
      return;
    }

    try {
      const currentUserRef = doc(db, "users", currentUser.uid);
      const targetUserRef = doc(db, "users", userProfile.uid);

      // Add to sent requests
      await updateDoc(currentUserRef, {
        sentRequests: [...(relationship.sentRequests || []), userProfile.uid]
      });

      // Add to received requests
      await updateDoc(targetUserRef, {
        receivedRequests: [...(userProfile.receivedRequests || []), currentUser.uid]
      });

      setRelationship(prev => ({ ...prev, hasSentRequest: true }));
      toast.success("Friend request sent!");
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Failed to send friend request");
    }
  };

  const handleAcceptFriend = async () => {
    try {
      const currentUserRef = doc(db, "users", currentUser.uid);
      const targetUserRef = doc(db, "users", userProfile.uid);

      // Add to friends list for both users
      await updateDoc(currentUserRef, {
        friends: [...(relationship.friends || []), userProfile.uid],
        receivedRequests: (relationship.receivedRequests || []).filter(id => id !== userProfile.uid)
      });

      await updateDoc(targetUserRef, {
        friends: [...(userProfile.friends || []), currentUser.uid],
        sentRequests: (userProfile.sentRequests || []).filter(id => id !== currentUser.uid)
      });

      setRelationship(prev => ({ 
        ...prev, 
        isFriend: true, 
        hasReceivedRequest: false 
      }));
      toast.success("Friend request accepted!");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error("Failed to accept friend request");
    }
  };

  const handleRemoveFriend = async () => {
    try {
      const currentUserRef = doc(db, "users", currentUser.uid);
      const targetUserRef = doc(db, "users", userProfile.uid);

      // Remove from friends list for both users
      await updateDoc(currentUserRef, {
        friends: (relationship.friends || []).filter(id => id !== userProfile.uid)
      });

      await updateDoc(targetUserRef, {
        friends: (userProfile.friends || []).filter(id => id !== currentUser.uid)
      });

      setRelationship(prev => ({ ...prev, isFriend: false }));
      toast.success("Friend removed");
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("Failed to remove friend");
    }
  };

  const handleBlockUser = async () => {
    try {
      const currentUserRef = doc(db, "users", currentUser.uid);

      // Add to blocked list
      await updateDoc(currentUserRef, {
        blocked: [...(relationship.blocked || []), userProfile.uid]
      });

      setRelationship(prev => ({ ...prev, isBlocked: true }));
      toast.success("User blocked");
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error("Failed to block user");
    }
  };

  const handleUnblockUser = async () => {
    try {
      const currentUserRef = doc(db, "users", currentUser.uid);

      // Remove from blocked list
      await updateDoc(currentUserRef, {
        blocked: (relationship.blocked || []).filter(id => id !== userProfile.uid)
      });

      setRelationship(prev => ({ ...prev, isBlocked: false }));
      toast.success("User unblocked");
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast.error("Failed to unblock user");
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p>Loading profile...</p>
        </div>
      </Layout>
    );
  }

  if (!userProfile) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p>User not found</p>
        </div>
      </Layout>
    );
  }

  // If user is blocked, show minimal profile
  if (relationship.isBlocked) {
    return (
      <Layout>
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-4">User Profile</h1>
          <p className="text-gray-600 mb-4">This user is blocked</p>
          <button
            onClick={handleUnblockUser}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Unblock User
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-6">
            <div className="flex-shrink-0">
              {userProfile.profilePicture ? (
                <img
                  src={userProfile.profilePicture}
                  alt={userProfile.username}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center">
                  <FaUser className="text-4xl text-gray-600" />
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {userProfile.username}
              </h1>
              {userProfile.bio && (
                <p className="text-gray-600 mb-4">{userProfile.bio}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Member since {new Date(userProfile.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span>{userProfile.friends?.length || 0} friends</span>
              </div>
            </div>

            {/* Social Actions */}
            {currentUser && currentUser.uid !== userProfile.uid && (
              <div className="flex gap-2">
                {relationship.isFriend ? (
                  <button
                    onClick={handleRemoveFriend}
                    className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                  >
                    <FaUserTimes />
                    Remove Friend
                  </button>
                ) : relationship.hasSentRequest ? (
                  <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-500 rounded-md cursor-not-allowed"
                  >
                    <FaUserPlus />
                    Request Sent
                  </button>
                ) : relationship.hasReceivedRequest ? (
                  <button
                    onClick={handleAcceptFriend}
                    className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                  >
                    <FaUserCheck />
                    Accept Request
                  </button>
                ) : (
                  <button
                    onClick={handleAddFriend}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                  >
                    <FaUserPlus />
                    Add Friend
                  </button>
                )}

                <button
                  onClick={relationship.isBlocked ? handleUnblockUser : handleBlockUser}
                  className="flex items-center gap-2 px-3 py-2 text-gray-500 hover:text-red-600"
                  title={relationship.isBlocked ? "Unblock user" : "Block user"}
                >
                  <FaBan />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Lists Tabs */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {['watched', 'watching', 'watchlist'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} ({userLists[tab].length})
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {userLists[activeTab].length === 0 ? (
              <p className="text-center text-gray-500">
                No {activeTab} content yet
              </p>
            ) : (
              <div className="space-y-2">
                {userLists[activeTab].map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Link 
                      to={item.media_type === 'tv' ? `/tv/${item.id}` : `/movie/${item.id}`}
                      className="flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={`https://image.tmdb.org/t/p/w92${item.poster}`}
                        alt={item.title}
                        className="w-12 h-18 object-cover rounded cursor-pointer"
                      />
                    </Link>
                    <div className="flex-1">
                      <h3 className="font-medium">{item.title}</h3>
                      {item.rating && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <span>★</span>
                          <span>{item.rating}/5</span>
                        </div>
                      )}
                      {item.comment && (
                        <p className="text-sm text-gray-500 italic">"{item.comment}"</p>
                      )}
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

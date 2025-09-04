import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { doc, getDoc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import Layout from "../Layout";
import { Link } from "react-router-dom";
import { FaUser, FaSearch, FaUserPlus, FaCheck, FaTimes } from "react-icons/fa";

export default function UserSearch() {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userRelationships, setUserRelationships] = useState({});
  const [loadingRelationships, setLoadingRelationships] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      console.log("Searching for:", searchQuery);
      
      // Get usernames document
      const usernamesRef = doc(db, "users", "usernames");
      const usernamesSnap = await getDoc(usernamesRef);
      
      console.log("Usernames document exists:", usernamesSnap.exists());
      
      if (!usernamesSnap.exists()) {
        console.log("No usernames document found");
        setSearchResults([]);
        return;
      }

      const usernamesData = usernamesSnap.data();
      console.log("All usernames:", Object.keys(usernamesData));
      
      const matchingUsernames = Object.keys(usernamesData).filter(username =>
        username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      console.log("Matching usernames:", matchingUsernames);

      // Get user profiles for matching usernames
      const userProfiles = [];
      for (const username of matchingUsernames) {
        const userId = usernamesData[username];
        console.log(`Getting profile for ${username} (${userId})`);
        
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          userProfiles.push({
            uid: userId,
            username: username,
            ...userData
          });
          console.log(`Found profile for ${username}`);
        } else {
          console.log(`No profile found for ${username}`);
        }
      }

      console.log("User profiles found:", userProfiles.length);

      // Filter out current user and blocked users
      let filteredResults = userProfiles.filter(user => user.uid !== currentUser?.uid);

      if (currentUser) {
        const currentUserRef = doc(db, "users", currentUser.uid);
        const currentUserSnap = await getDoc(currentUserRef);
        
        if (currentUserSnap.exists()) {
          const currentUserData = currentUserSnap.data();
          const blockedUsers = currentUserData.blocked || [];
          
          filteredResults = filteredResults.filter(user => 
            !blockedUsers.includes(user.uid)
          );
        }
      }

      console.log("Final results:", filteredResults.length);
      setSearchResults(filteredResults);
      
      // Fetch relationships for the current user
      if (currentUser && filteredResults.length > 0) {
        await fetchUserRelationships(filteredResults);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      toast.error("Failed to search users");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRelationships = async (users) => {
    if (!currentUser) return;
    
    setLoadingRelationships(true);
    try {
      const currentUserRef = doc(db, "users", currentUser.uid);
      const currentUserSnap = await getDoc(currentUserRef);
      
      if (!currentUserSnap.exists()) return;
      
      const currentUserData = currentUserSnap.data();
      const relationships = {};
      
      users.forEach(user => {
        const isFriend = currentUserData.friends?.includes(user.uid) || false;
        const hasSentRequest = currentUserData.sentRequests?.includes(user.uid) || false;
        const hasReceivedRequest = currentUserData.receivedRequests?.includes(user.uid) || false;
        const isBlocked = currentUserData.blocked?.includes(user.uid) || false;
        
        relationships[user.uid] = {
          isFriend,
          hasSentRequest,
          hasReceivedRequest,
          isBlocked
        };
      });
      
      setUserRelationships(relationships);
    } catch (error) {
      console.error("Error fetching relationships:", error);
    } finally {
      setLoadingRelationships(false);
    }
  };

  const handleAddFriend = async (targetUser) => {
    if (!currentUser) {
      toast.error("Please log in to add friends");
      return;
    }

    try {
      const currentUserRef = doc(db, "users", currentUser.uid);
      const targetUserRef = doc(db, "users", targetUser.uid);

      // Get current user data to check existing requests
      const currentUserSnap = await getDoc(currentUserRef);
      const currentUserData = currentUserSnap.data();
      
      // Get target user data
      const targetUserSnap = await getDoc(targetUserRef);
      const targetUserData = targetUserSnap.data();

      // Add to sent requests
      await updateDoc(currentUserRef, {
        sentRequests: [...(currentUserData.sentRequests || []), targetUser.uid]
      });

      // Add to received requests
      await updateDoc(targetUserRef, {
        receivedRequests: [...(targetUserData.receivedRequests || []), currentUser.uid]
      });

      // Update local state
      setUserRelationships(prev => ({
        ...prev,
        [targetUser.uid]: {
          ...prev[targetUser.uid],
          hasSentRequest: true
        }
      }));

      toast.success("Friend request sent!");
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Failed to send friend request");
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

      // Update local state
      setUserRelationships(prev => ({
        ...prev,
        [targetUser.uid]: {
          ...prev[targetUser.uid],
          isFriend: true,
          hasReceivedRequest: false
        }
      }));

      toast.success("Friend request accepted!");
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

      // Update local state
      setUserRelationships(prev => ({
        ...prev,
        [targetUser.uid]: {
          ...prev[targetUser.uid],
          hasReceivedRequest: false
        }
      }));

      toast.success("Friend request declined");
    } catch (error) {
      console.error("Error declining friend request:", error);
      toast.error("Failed to decline friend request");
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Find Friends</h1>
        
        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <FaSearch />
              {loading ? "Searching..." : "Search"}
            </button>
          </form>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-md">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                Found {searchResults.length} user{searchResults.length !== 1 ? 's' : ''}
              </h2>
              
              <div className="space-y-4">
                {searchResults.map((user) => {
                  const relationship = userRelationships[user.uid] || {};
                  
                  return (
                    <div key={user.uid} className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <div className="flex-shrink-0">
                        {user.profilePicture ? (
                          <img
                            src={user.profilePicture}
                            alt={user.username}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
                            <FaUser className="text-2xl text-gray-600" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {user.username}
                        </h3>
                        {user.bio && (
                          <p className="text-gray-600 text-sm mt-1">{user.bio}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                          <span>Member since {new Date(user.createdAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{user.friends?.length || 0} friends</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Friend Request Buttons */}
                        {currentUser && user.uid !== currentUser.uid && (
                          <>
                            {relationship.isFriend ? (
                              <span className="px-3 py-2 bg-green-100 text-green-700 rounded-md text-sm font-medium">
                                ✓ Friends
                              </span>
                            ) : relationship.hasSentRequest ? (
                              <span className="px-3 py-2 bg-yellow-100 text-yellow-700 rounded-md text-sm font-medium">
                                Request Sent
                              </span>
                            ) : relationship.hasReceivedRequest ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleAcceptFriend(user)}
                                  disabled={loadingRelationships}
                                  className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 flex items-center gap-1 text-sm"
                                >
                                  <FaCheck />
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleDeclineFriend(user)}
                                  disabled={loadingRelationships}
                                  className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:opacity-50 flex items-center gap-1 text-sm"
                                >
                                  <FaTimes />
                                  Decline
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAddFriend(user)}
                                disabled={loadingRelationships}
                                className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 flex items-center gap-1 text-sm"
                              >
                                <FaUserPlus />
                                Add Friend
                              </button>
                            )}
                          </>
                        )}
                        
                        <Link
                          to={`/user/${user.username}`}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm"
                        >
                          View Profile
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {searchQuery && !loading && searchResults.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">No users found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

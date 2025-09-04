// pages/ProfileSettings.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import Layout from "../Layout";
import { Link } from "react-router-dom";
import { FaUser, FaUserPlus, FaUserCheck, FaUserTimes, FaCamera } from "react-icons/fa";

export default function ProfileSettings() {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState({
    username: "",
    bio: "",
    profilePicture: ""
  });
  const [newBio, setNewBio] = useState("");
  const [newProfilePicture, setNewProfilePicture] = useState("");
  const [friendRequests, setFriendRequests] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser) return;

      try {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setProfile({
            username: userData.username || "",
            bio: userData.bio || "",
            profilePicture: userData.profilePicture || ""
          });
          setNewBio(userData.bio || "");
          setNewProfilePicture(userData.profilePicture || "");
          
          // Get friend requests
          const receivedRequests = userData.receivedRequests || [];
          const friendsList = userData.friends || [];
          
          // Fetch friend request details
          const requestDetails = [];
          for (const requestId of receivedRequests) {
            const requestUserRef = doc(db, "users", requestId);
            const requestUserSnap = await getDoc(requestUserRef);
            if (requestUserSnap.exists()) {
              requestDetails.push({
                uid: requestId,
                ...requestUserSnap.data()
              });
            }
          }
          setFriendRequests(requestDetails);

          // Fetch friends details
          const friendsDetails = [];
          for (const friendId of friendsList) {
            const friendRef = doc(db, "users", friendId);
            const friendSnap = await getDoc(friendRef);
            if (friendSnap.exists()) {
              friendsDetails.push({
                uid: friendId,
                ...friendSnap.data()
              });
            }
          }
          setFriends(friendsDetails);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser]);

  const handleSaveProfile = async () => {
    if (!currentUser) return;

    setSaving(true);
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        bio: newBio,
        profilePicture: newProfilePicture
      });

      setProfile(prev => ({
        ...prev,
        bio: newBio,
        profilePicture: newProfilePicture
      }));

      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptRequest = async (requestUserId) => {
    try {
      const currentUserRef = doc(db, "users", currentUser.uid);
      const requestUserRef = doc(db, "users", requestUserId);

      // Get current user data to get their actual friends list
      const currentUserSnap = await getDoc(currentUserRef);
      const currentUserData = currentUserSnap.data();
      
      // Get request user data to get their actual friends list
      const requestUserSnap = await getDoc(requestUserRef);
      const requestUserData = requestUserSnap.data();

      // Add to friends list for both users
      await updateDoc(currentUserRef, {
        friends: [...(currentUserData.friends || []), requestUserId],
        receivedRequests: friendRequests.filter(r => r.uid !== requestUserId).map(r => r.uid)
      });

      await updateDoc(requestUserRef, {
        friends: [...(requestUserData.friends || []), currentUser.uid],
        sentRequests: (requestUserData.sentRequests || []).filter(id => id !== currentUser.uid)
      });

      // Update local state
      const acceptedUser = friendRequests.find(r => r.uid === requestUserId);
      setFriends(prev => [...prev, acceptedUser]);
      setFriendRequests(prev => prev.filter(r => r.uid !== requestUserId));

      toast.success("Friend request accepted!");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error("Failed to accept friend request");
    }
  };

  const handleDeclineRequest = async (requestUserId) => {
    try {
      const currentUserRef = doc(db, "users", currentUser.uid);
      const requestUserRef = doc(db, "users", requestUserId);

      // Remove from received requests
      await updateDoc(currentUserRef, {
        receivedRequests: friendRequests.filter(r => r.uid !== requestUserId).map(r => r.uid)
      });

      // Remove from sent requests
      await updateDoc(requestUserRef, {
        sentRequests: [] // Remove from sent requests
      });

      // Update local state
      setFriendRequests(prev => prev.filter(r => r.uid !== requestUserId));

      toast.success("Friend request declined");
    } catch (error) {
      console.error("Error declining friend request:", error);
      toast.error("Failed to decline friend request");
    }
  };

  const handleRemoveFriend = async (friendUserId) => {
    try {
      const currentUserRef = doc(db, "users", currentUser.uid);
      const friendUserRef = doc(db, "users", friendUserId);

      // Get current user data to get their actual friends list
      const currentUserSnap = await getDoc(currentUserRef);
      const currentUserData = currentUserSnap.data();
      
      // Get friend user data to get their actual friends list
      const friendUserSnap = await getDoc(friendUserRef);
      const friendUserData = friendUserSnap.data();

      // Remove from friends list for both users
      await updateDoc(currentUserRef, {
        friends: (currentUserData.friends || []).filter(id => id !== friendUserId)
      });

      await updateDoc(friendUserRef, {
        friends: (friendUserData.friends || []).filter(id => id !== currentUser.uid)
      });

      // Update local state
      setFriends(prev => prev.filter(f => f.uid !== friendUserId));

      toast.success("Friend removed");
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("Failed to remove friend");
    }
  };

  if (!currentUser) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p>Please log in to view your profile settings.</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p>Loading profile...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Profile Settings</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Edit Profile</h2>
            
            <div className="space-y-6">
              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  {newProfilePicture ? (
                    <img
                      src={newProfilePicture}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center">
                      <FaUser className="text-3xl text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="url"
                      placeholder="Enter image URL..."
                      value={newProfilePicture}
                      onChange={(e) => setNewProfilePicture(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Paste a URL to your profile picture
                    </p>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                <textarea
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {newBio.length}/500 characters
                </p>
              </div>

              {/* Username (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={profile.username}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Username cannot be changed
                </p>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Friend Requests & Friends */}
          <div className="space-y-6">
            {/* Friend Requests */}
            {friendRequests.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Friend Requests ({friendRequests.length})</h2>
                <div className="space-y-3">
                  {friendRequests.map((request) => (
                    <div key={request.uid} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                      {request.profilePicture ? (
                        <img
                          src={request.profilePicture}
                          alt={request.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                          <FaUser className="text-lg text-gray-600" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <h3 className="font-medium">{request.username}</h3>
                        {request.bio && (
                          <p className="text-sm text-gray-600">{request.bio}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcceptRequest(request.uid)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleDeclineRequest(request.uid)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Friends ({friends.length})</h2>
              {friends.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No friends yet</p>
              ) : (
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <div key={friend.uid} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                      {friend.profilePicture ? (
                        <img
                          src={friend.profilePicture}
                          alt={friend.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                          <FaUser className="text-lg text-gray-600" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <Link
                          to={`/user/${friend.username}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {friend.username}
                        </Link>
                        {friend.bio && (
                          <p className="text-sm text-gray-600">{friend.bio}</p>
                        )}
                      </div>
                      
                      <button
                        onClick={() => handleRemoveFriend(friend.uid)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

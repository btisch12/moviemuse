import { Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { FaUser, FaUserFriends, FaSearch, FaChartBar } from "react-icons/fa";

export default function Layout({ children }) {
  const { currentUser, logout } = useAuth();
  const [username, setUsername] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSocialDropdown, setShowSocialDropdown] = useState(false);
  const [friendRequests, setFriendRequests] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUsername(userData.username || "");
          setFriendRequests(userData.receivedRequests?.length || 0);
        }
      }
    };

    fetchUserData();
  }, [currentUser]);

  return (
    <>
      <nav className="bg-white shadow mb-6 relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                     <div className="text-xl font-bold text-gray-800">
             <Link to={currentUser ? "/dashboard" : "/"}>MovieMuse</Link>
           </div>

                     <div className="flex items-center space-x-6 text-sm font-medium text-gray-600 relative">
             <Link to={currentUser ? "/dashboard" : "/"}>Home</Link>

            {currentUser && (
              <>
                <div
                  className="relative"
                  onMouseEnter={() => setShowDropdown(true)}
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  <span className="cursor-pointer hover:underline">My Movies</span>

                  <div
                    className={`absolute left-0 mt-2 w-36 bg-white shadow-md rounded transition-all duration-200 ease-in-out ${
                      showDropdown ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible"
                    }`}
                  >
                    <Link
                      to="/watchlist"
                      className="block px-4 py-2 hover:bg-gray-100 whitespace-nowrap"
                    >
                      Watchlist
                    </Link>
                    <Link
                      to="/watching"
                      className="block px-4 py-2 hover:bg-gray-100 whitespace-nowrap"
                    >
                      Watching
                    </Link>
                    <Link
                      to="/watched"
                      className="block px-4 py-2 hover:bg-gray-100 whitespace-nowrap"
                    >
                      Watched
                    </Link>
                    <Link 
                      to="/discover" 
                      className="block px-4 py-2 hover:bg-gray-100 whitespace-nowrap"
                      >
                        Discover
                    </Link>
                  </div>
                </div>

                <div
                  className="relative"
                  onMouseEnter={() => setShowSocialDropdown(true)}
                  onMouseLeave={() => setShowSocialDropdown(false)}
                >
                  <span className="cursor-pointer hover:underline flex items-center gap-1">
                    <FaUserFriends />
                    Social
                    {friendRequests > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                        {friendRequests}
                      </span>
                    )}
                  </span>

                  <div
                    className={`absolute left-0 mt-2 w-48 bg-white shadow-md rounded transition-all duration-200 ease-in-out ${
                      showSocialDropdown ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible"
                    }`}
                  >
                                         <Link
                       to="/search-users"
                       className="block px-4 py-2 hover:bg-gray-100 whitespace-nowrap flex items-center gap-2"
                     >
                       <FaSearch />
                       Find Friends
                     </Link>
                     <Link
                       to="/my-friends"
                       className="block px-4 py-2 hover:bg-gray-100 whitespace-nowrap flex items-center gap-2"
                     >
                       <FaUserFriends />
                       My Friends
                     </Link>
                    <Link
                      to="/profile-settings"
                      className="block px-4 py-2 hover:bg-gray-100 whitespace-nowrap flex items-center gap-2"
                    >
                      <FaUser />
                      Profile Settings
                    </Link>
                    <Link
                      to="/knn-analysis"
                      className="block px-4 py-2 hover:bg-gray-100 whitespace-nowrap flex items-center gap-2"
                    >
                      <FaChartBar />
                      KNN Analysis
                    </Link>
                  </div>
                </div>
              </>
            )}

            {!currentUser ? (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            ) : (
              <>
                <button
                  onClick={logout}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Logout
                </button>
                <Link 
                  to="/profile" 
                  className="text-gray-800 font-semibold hover:text-blue-600 transition-colors cursor-pointer"
                >
                  Hi, {username || currentUser.email}
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {children}
      </main>
    </>
  );
}

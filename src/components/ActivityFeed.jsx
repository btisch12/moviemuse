// src/components/ActivityFeed.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { getFriendActivity } from "../services/socialRecs";
import { Link } from "react-router-dom";
import { FaUser, FaStar, FaEye } from "react-icons/fa";

export default function ActivityFeed() {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!currentUser) return;
      setLoading(true);
      
      try {
        const activityData = await getFriendActivity(db, currentUser.uid, 8);
        setActivities(activityData);
      } catch (error) {
        console.error("Error fetching friend activity:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [currentUser]);

  if (!currentUser) return null;

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInHours = Math.floor((now - activityTime) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <FaEye className="text-blue-500" />
          Friend Activity
        </h3>
        {loading && <span className="text-sm text-gray-500">Loading...</span>}
      </div>

      {activities.length === 0 && !loading ? (
        <div className="text-center py-8">
          <FaUser className="text-4xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            No friend activity yet.
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Add friends to see what they're watching!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity, index) => (
            <div key={`${activity.friendId}-${activity.content.id}-${index}`} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <FaUser className="text-blue-600 text-sm" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {activity.friendUsername || "Friend"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">
                    {activity.type === 'watched' ? 'watched' : 'rated'}
                  </span>
                  <Link 
                    to={activity.content.media_type === 'tv' ? `/tv/${activity.content.id}` : `/movie/${activity.content.id}`}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 truncate"
                  >
                    {activity.content.title}
                  </Link>
                </div>
                
                {activity.content.rating && (
                  <div className="flex items-center gap-1 mt-1">
                    <FaStar className="text-yellow-400 text-xs" />
                    <span className="text-xs text-gray-600">
                      {activity.content.rating}/5
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {activities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link 
            to="/search-users" 
            className="text-sm text-blue-600 hover:text-blue-800 text-center block"
          >
            Find more friends →
          </Link>
        </div>
      )}
    </div>
  );
}

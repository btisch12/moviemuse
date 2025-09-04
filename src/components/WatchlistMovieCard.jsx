import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { doc, setDoc, deleteField } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import { FaTrash, FaCheck, FaEye } from "react-icons/fa";
import { useState } from "react";

export default function WatchlistMovieCard({ movie, onRemove }) {
  const { currentUser } = useAuth();
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const removeFromWatchlist = async () => {
    try {
      const userRef = doc(db, "watchlists", currentUser.uid);
      // Use different key format for TV shows
      const key = movie.media_type === 'tv' ? `tv_${movie.id}` : String(movie.id);
      await setDoc(userRef, { [key]: deleteField() }, { merge: true });
      onRemove(movie.id);
      toast.success(`${movie.title} removed from watchlist`);
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      toast.error("Failed to remove from watchlist");
    }
  };

  const moveToWatched = () => {
    setShowRatingModal(true);
  };

    const handleRatingSubmit = async () => {
    try {
      // Use different key format for TV shows
      const key = movie.media_type === 'tv' ? `tv_${movie.id}` : String(movie.id);
      
      // Remove from watchlist
      const watchlistRef = doc(db, "watchlists", currentUser.uid);
      await setDoc(watchlistRef, { [key]: deleteField() }, { merge: true });
      
      // Add to watched with rating
      const watchedRef = doc(db, "watched", currentUser.uid);
      await setDoc(
        watchedRef,
        {
          [key]: {
            id: movie.id,
            title: movie.title,
            poster: movie.poster_path || movie.poster,
            rating: rating,
            comment: comment.trim() || null,
            media_type: movie.media_type || 'movie',
            watchedAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );
      
      onRemove(movie.id);
      setShowRatingModal(false);
      setRating(0);
      setComment("");
      toast.success(`${movie.title} moved to watched with ${rating}/5 rating`);
    } catch (error) {
      console.error("Error moving to watched:", error);
      toast.error("Failed to move to watched");
    }
  };

  const handleSkipRating = async () => {
    try {
      const key = movie.media_type === 'tv' ? `tv_${movie.id}` : String(movie.id);
      
      // Remove from watchlist
      const watchlistRef = doc(db, "watchlists", currentUser.uid);
      await setDoc(watchlistRef, { [key]: deleteField() }, { merge: true });
      
      // Add to watched without rating
      const watchedRef = doc(db, "watched", currentUser.uid);
      await setDoc(
        watchedRef,
        {
          [key]: {
            id: movie.id,
            title: movie.title,
            poster: movie.poster_path || movie.poster,
            rating: null,
            comment: null,
            media_type: movie.media_type || 'movie',
            watchedAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );
      
      onRemove(movie.id);
      setShowRatingModal(false);
      setRating(0);
      setComment("");
      toast.success(`${movie.title} moved to watched (no rating)`);
    } catch (error) {
      console.error("Error moving to watched:", error);
      toast.error("Failed to move to watched");
    }
  };

  const handleRatingCancel = () => {
    setShowRatingModal(false);
    setRating(0);
    setComment("");
  };

  const moveToWatching = async () => {
    try {
      // Use different key format for TV shows
      const key = movie.media_type === 'tv' ? `tv_${movie.id}` : String(movie.id);
      
      // Remove from watchlist
      const watchlistRef = doc(db, "watchlists", currentUser.uid);
      await setDoc(watchlistRef, { [key]: deleteField() }, { merge: true });
      
      // Add to watching
      const watchingRef = doc(db, "watching", currentUser.uid);
      await setDoc(
        watchingRef,
        {
          [key]: {
            id: movie.id,
            title: movie.title,
            poster: movie.poster_path || movie.poster,
            media_type: movie.media_type || 'movie',
            startedAt: new Date().toISOString(),
          },
        },
        { merge: true }
      );
      
      onRemove(movie.id);
      toast.success(`${movie.title} moved to currently watching`);
    } catch (error) {
      console.error("Error moving to watching:", error);
      toast.error("Failed to move to currently watching");
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden flex items-center p-3 gap-3">
             <Link to={movie.media_type === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`} className="flex-shrink-0">
        {movie.poster_path || movie.poster ? (
          <img
            src={`https://image.tmdb.org/t/p/w342${movie.poster_path || movie.poster}`}
            alt={movie.title}
            className="w-20 h-30 object-cover rounded"
          />
        ) : (
          <div className="w-20 h-30 bg-gray-200 flex items-center justify-center text-gray-400 text-xs rounded">
            No image
          </div>
        )}
      </Link>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 truncate">{movie.title}</h3>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        {/* Move to Watched */}
        <button
          onClick={moveToWatched}
          className="flex items-center gap-1 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-medium rounded-md transition-all duration-150 hover:scale-105"
        >
          <FaCheck className="text-xs" />
          Watched
        </button>

        {/* Move to Currently Watching */}
        <button
          onClick={moveToWatching}
          className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs font-medium rounded-md transition-all duration-150 hover:scale-105"
        >
          <FaEye className="text-xs" />
          Watching
        </button>

        {/* Remove from Watchlist */}
        <button
          onClick={removeFromWatchlist}
          className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-medium rounded-md transition-all duration-150 hover:scale-105"
        >
          <FaTrash className="text-xs" />
          Remove
                 </button>
       </div>

       {/* Rating Modal */}
       {showRatingModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
             <h3 className="text-lg font-semibold mb-4 text-center">
               Rate "{movie.title}"
             </h3>
             
             <div className="flex justify-center gap-2 mb-6">
               {[1, 2, 3, 4, 5].map((star) => (
                 <button
                   key={star}
                   onClick={() => setRating(star)}
                   className={`transition transform duration-150 text-2xl ${
                     star <= rating
                       ? "text-yellow-400 scale-110"
                       : "text-gray-300 hover:scale-105"
                   }`}
                 >
                   ★
                 </button>
               ))}
                            </div>

               <div className="mb-4">
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                   Comment (optional)
                 </label>
                 <textarea
                   value={comment}
                   onChange={(e) => setComment(e.target.value)}
                   placeholder="Share your thoughts about this movie..."
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                   rows="3"
                   maxLength="500"
                 />
                 <div className="text-xs text-gray-500 mt-1 text-right">
                   {comment.length}/500
                 </div>
               </div>

               <div className="flex gap-3">
               <button
                 onClick={handleRatingCancel}
                 className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
               >
                 Cancel
               </button>
               <button
                 onClick={handleSkipRating}
                 className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
               >
                 Skip Rating
               </button>
               <button
                 onClick={handleRatingSubmit}
                 disabled={rating === 0}
                 className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 Submit Rating
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }

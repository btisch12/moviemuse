import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { doc, setDoc, deleteField } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { FaStar, FaArchive } from "react-icons/fa";
import { useState } from "react";

export default function WatchedMovieCard({ movie, onRatingChange, onRemove }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  const handleRating = async (newRating) => {
    try {
      const watchedRef = doc(db, "watched", currentUser.uid);
      const updatedMovie = {
        ...movie,
        rating: newRating,
        watchedAt: Date.now(),
      };

      // Use different key format for TV shows
      const key = movie.media_type === 'tv' ? `tv_${movie.id}` : String(movie.id);

      await setDoc(
        watchedRef,
        {
          [key]: updatedMovie,
        },
        { merge: true }
      );

      onRatingChange(movie.id, newRating);
      toast.success(`Rated ${movie.title} ${newRating}/5 stars`);
    } catch (error) {
      console.error("Error updating rating:", error);
      toast.error("Failed to update rating");
    }
  };

  const handleArchive = () => {
    setShowArchiveModal(true);
  };

  const confirmArchive = async () => {
    try {
      const watchedRef = doc(db, "watched", currentUser.uid);
      // Use different key format for TV shows
      const key = movie.media_type === 'tv' ? `tv_${movie.id}` : String(movie.id);
      
      await setDoc(watchedRef, { [key]: deleteField() }, { merge: true });
      
      onRemove(movie.id);
      setShowArchiveModal(false);
      toast.success(`${movie.title} archived from watched list`);
    } catch (error) {
      console.error("Error archiving movie:", error);
      toast.error("Failed to archive movie");
    }
  };

  const cancelArchive = () => {
    setShowArchiveModal(false);
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
        {movie.comment && (
          <p className="text-xs text-gray-600 mt-1 line-clamp-2 italic">
            "{movie.comment}"
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-1">
          <FaStar className="text-yellow-400 text-sm" />
          <span className="text-sm text-gray-600">
            {movie.rating ? `${movie.rating}/5` : "Not rated"}
          </span>
        </div>
        <button
          onClick={() => navigate(movie.media_type === 'tv' ? `/tv/${movie.id}` : `/movie/${movie.id}`)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-medium rounded-md transition-all duration-150 hover:scale-105"
        >
          Change Rating
        </button>
        <button
          onClick={handleArchive}
          className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-gray-600 text-xs opacity-50 hover:opacity-100 transition-all duration-150"
          title="Archive movie"
        >
          <FaArchive className="text-xs" />
        </button>
      </div>

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-center">
              Archive "{movie.title}"?
            </h3>
            
            <p className="text-sm text-gray-600 mb-6 text-center">
              Are you sure you want to archive this watched movie? It will disappear from your watched list unless you add it back.
            </p>

            <div className="flex gap-3">
              <button
                onClick={cancelArchive}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                No
              </button>
              <button
                onClick={confirmArchive}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Yes, Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

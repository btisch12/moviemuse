import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc, deleteField } from "firebase/firestore";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import { FaPlus, FaCheck, FaEye } from "react-icons/fa";

export default function MovieCard({ movie }) {
  const { currentUser } = useAuth();
  const [addedTo, setAddedTo] = useState({
    watchlist: false,
    watching: false,
    watched: false,
  });

  useEffect(() => {
    const checkLists = async () => {
      if (!currentUser) return;

      try {
        const [watchlistSnap, watchingSnap, watchedSnap] = await Promise.all([
          getDoc(doc(db, "watchlists", currentUser.uid)),
          getDoc(doc(db, "watching", currentUser.uid)),
          getDoc(doc(db, "watched", currentUser.uid)),
        ]);

        // Use different key format for TV shows
        const key = movie.media_type === 'tv' ? `tv_${movie.id}` : String(movie.id);

        setAddedTo({
          watchlist: watchlistSnap.exists() && key in watchlistSnap.data(),
          watching: watchingSnap.exists() && key in watchingSnap.data(),
          watched: watchedSnap.exists() && key in watchedSnap.data(),
        });
      } catch (error) {
        console.error("Error checking content lists:", error);
      }
    };

    checkLists();
  }, [currentUser, movie.id, movie.media_type]);

  const handleAdd = async (type) => {
    if (!currentUser) {
      toast.error("You must be logged in to save content.");
      return;
    }

    // Map the button types to the correct collection names
    const collectionMap = {
      watchlist: "watchlists",
      watching: "watching", 
      watched: "watched"
    };

    const collectionName = collectionMap[type];
    const ref = doc(db, collectionName, currentUser.uid);
    
    try {
      // Create content object with media type
      const contentData = {
        id: movie.id,
        title: movie.title || movie.name || "Unknown Title",
        poster: movie.poster_path || movie.poster || null,
        media_type: movie.media_type || 'movie',
        savedAt: new Date().toISOString(),
      };
      
      // Use different key format for TV shows to avoid conflicts
      const key = movie.media_type === 'tv' ? `tv_${movie.id}` : String(movie.id);
      
      // If adding to watched, remove from other lists first
      if (type === 'watched') {
        const watchlistRef = doc(db, "watchlists", currentUser.uid);
        const watchingRef = doc(db, "watching", currentUser.uid);
        
        await Promise.all([
          setDoc(watchlistRef, { [key]: deleteField() }, { merge: true }),
          setDoc(watchingRef, { [key]: deleteField() }, { merge: true }),
        ]);
      }
      
      await setDoc(
        ref,
        {
          [key]: contentData
        },
        { merge: true }
      );

      // Update local state
      if (type === 'watched') {
        setAddedTo({ watchlist: false, watching: false, watched: true });
      } else {
        setAddedTo((prev) => ({ ...prev, [type]: true }));
      }
      
      toast.success(`${contentData.title} added to ${type}`);
    } catch (error) {
      console.error("Error adding content to list:", error);
      
      if (error.code === 'permission-denied') {
        toast.error("Permission denied. Please check your Firebase security rules.");
      } else if (error.code === 'unavailable') {
        toast.error("Firebase is unavailable. Please check your internet connection.");
      } else {
        toast.error(`Failed to add content to ${type}: ${error.message}`);
      }
    }
  };

  const colorMap = {
    watchlist: "bg-red-100 hover:bg-red-200 text-red-700",
    watching: "bg-yellow-100 hover:bg-yellow-200 text-yellow-700",
    watched: "bg-green-100 hover:bg-green-200 text-green-700",
  };

  const iconMap = {
    watchlist: <FaPlus />,
    watching: <FaEye />,
    watched: <FaCheck />,
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
        {movie._recommendationReason && (
          <p className="text-xs text-gray-500 mt-1">{movie._recommendationReason}</p>
        )}
        {addedTo.watched && (
          <p className="text-xs text-green-600 font-medium">✓ Watched</p>
        )}
      </div>

             <div className="flex gap-2 flex-shrink-0">
         {["watchlist", "watching", "watched"].map((type) => {
           // If content is watched, disable watchlist and watching buttons
           const isDisabled = addedTo[type] || (addedTo.watched && type !== 'watched');
           
           return (
             <button
               key={type}
               onClick={() => handleAdd(type)}
               disabled={isDisabled}
               className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150
                 ${colorMap[type]} ${
                 isDisabled
                   ? "opacity-60 cursor-not-allowed"
                   : "hover:scale-105"
               }`}
             >
               {iconMap[type]}
               {type.charAt(0).toUpperCase() + type.slice(1)}
             </button>
           );
         })}
       </div>
    </div>
  );
}

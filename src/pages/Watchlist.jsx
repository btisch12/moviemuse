import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import Layout from "../Layout";
import WatchlistMovieCard from "../components/WatchlistMovieCard";

export default function Watchlist() {
  const { currentUser } = useAuth();
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchWatchlist = async () => {
      const userRef = doc(db, "watchlists", currentUser.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const movies = Object.values(docSnap.data());
        movies.sort((a, b) => b.savedAt - a.savedAt);
        setWatchlist(movies);
      } else {
        setWatchlist([]);
      }
    };

    fetchWatchlist();
  }, [currentUser]);

  const removeFromWatchlist = async (movieID) => {
    setWatchlist((prev) => prev.filter((m) => m.id !== movieID));
  };

  if (!currentUser) {
    return (
      <Layout>
        <div className="text-center py-10 text-lg text-gray-700 dark:text-gray-300">
          Please log in to view your watchlist.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white text-center">
        🎬 My Watchlist
      </h1>

      {watchlist.length === 0 ? (
        <p className="text-center text-gray-600 dark:text-gray-400">
          Your watchlist is currently empty.
        </p>
      ) : (
                 <div className="space-y-2">
          {watchlist.map((movie) => (
            <WatchlistMovieCard
              key={movie.id}
              movie={movie}
              onRemove={removeFromWatchlist}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}

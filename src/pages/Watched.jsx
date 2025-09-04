import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import Layout from "../Layout";
import WatchedMovieCard from "../components/WatchedMovieCard";

export default function Watched() {
  const { currentUser } = useAuth();
  const [watched, setWatched] = useState([]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchWatched = async () => {
      const watchedRef = doc(db, "watched", currentUser.uid);
      const docSnap = await getDoc(watchedRef);

      if (docSnap.exists()) {
        const movies = Object.values(docSnap.data());
        movies.sort((a, b) => b.watchedAt - a.watchedAt);
        setWatched(movies);
      } else {
        setWatched([]);
      }
    };

    fetchWatched();
  }, [currentUser]);

  const handleRating = async (movieId, newRating) => {
    setWatched((prev) =>
      prev.map((m) => (m.id === movieId ? { ...m, rating: newRating } : m))
    );
  };

  const handleRemove = (movieId) => {
    setWatched((prev) => prev.filter((m) => m.id !== movieId));
  };



  if (!currentUser) {
    return (
      <Layout>
        <div className="p-8 text-center text-lg text-gray-700">
          Please log in to view your watched list.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">📺 Watched Movies</h1>

      {watched.length === 0 ? (
        <p className="text-center text-gray-600">
          You haven't rated any movies yet.
        </p>
      ) : (
                 <div className="space-y-2">
          {watched.map((movie) => (
            <WatchedMovieCard
              key={movie.id}
              movie={movie}
              onRatingChange={handleRating}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}

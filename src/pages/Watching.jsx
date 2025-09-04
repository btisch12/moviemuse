import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import Layout from "../Layout";
import WatchingMovieCard from "../components/WatchingMovieCard";

export default function Watching() {
  const { currentUser } = useAuth();
  const [watching, setWatching] = useState([]);

  useEffect(() => {
    if (!currentUser) return;

    const fetchWatching = async () => {
      const watchingRef = doc(db, "watching", currentUser.uid);
      const docSnap = await getDoc(watchingRef);

      if (docSnap.exists()) {
        const movies = Object.values(docSnap.data());
        movies.sort((a, b) => b.startedAt - a.startedAt);
        setWatching(movies);
      } else {
        setWatching([]);
      }
    };

    fetchWatching();
  }, [currentUser]);

  const handleRemove = async (movieId) => {
    setWatching((prev) => prev.filter((movie) => movie.id !== movieId));
  };

  if (!currentUser) {
    return (
      <Layout>
        <div className="p-8 text-center text-lg text-gray-700">
          Please log in to view your watching list.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-3xl font-bold mb-6">🎬 Currently Watching</h1>

      {watching.length === 0 ? (
        <p className="text-center text-gray-600">
          You haven't added any movies to Watching.
        </p>
      ) : (
                 <div className="space-y-2">
          {watching.map((movie) => (
            <WatchingMovieCard
              key={movie.id}
              movie={movie}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </Layout>
  );
}

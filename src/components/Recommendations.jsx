// src/components/Recommendations.jsx
import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { getSocialRecommendations } from "../services/socialRecs";
import MovieCard from "./MovieCard";

export default function Recommendations({ title = "Recommended for You" }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState([]);

  useEffect(() => {
    const run = async () => {
      if (!currentUser) return;
      setLoading(true);
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      const items = await getSocialRecommendations({
        db,
        uid: currentUser.uid,
        apiKey,
        limit: 18,
      });
      setRecs(items);
      setLoading(false);
    };
    run();
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <section className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">{title}</h2>
        {loading && <span className="text-sm text-gray-500">Loading…</span>}
      </div>

      {recs.length === 0 && !loading ? (
        <p className="text-gray-600">
          Not enough data yet. Rate a few movies to unlock personalized recommendations!
        </p>
      ) : (
        <div className="space-y-2">
          {recs.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </section>
  );
}

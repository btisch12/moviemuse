import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import Layout from "../Layout";
import MovieCard from "../components/MovieCard";

export default function Discover() {
  const { currentUser } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrendingContent = async () => {
      try {
        const apiKey = import.meta.env.VITE_TMDB_API_KEY;
        
        // Fetch both trending movies and TV shows
        const [movieResponse, tvResponse] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}`),
          fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${apiKey}`)
        ]);
        
        const [movieData, tvData] = await Promise.all([
          movieResponse.json(),
          tvResponse.json()
        ]);

        // Format and combine results
        const movies = (movieData.results || []).map(movie => ({
          ...movie,
          media_type: 'movie',
          title: movie.title,
          original_title: movie.original_title
        }));
        
        const tvShows = (tvData.results || []).map(tv => ({
          ...tv,
          media_type: 'tv',
          title: tv.name,
          original_title: tv.original_name
        }));

        // Combine and sort by popularity
        let combined = [...movies, ...tvShows].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

        // Filter out content that's already in user's lists
        if (currentUser) {
          try {
            // Fetch user's lists
            const [watchlistSnap, watchingSnap, watchedSnap] = await Promise.all([
              getDoc(doc(db, "watchlists", currentUser.uid)),
              getDoc(doc(db, "watching", currentUser.uid)),
              getDoc(doc(db, "watched", currentUser.uid))
            ]);

            // Get all IDs from user's lists
            const userListIds = new Set();
            
            // Add watchlist IDs
            if (watchlistSnap.exists()) {
              Object.keys(watchlistSnap.data()).forEach(id => userListIds.add(id));
            }
            
            // Add watching IDs
            if (watchingSnap.exists()) {
              Object.keys(watchingSnap.data()).forEach(id => userListIds.add(id));
            }
            
            // Add watched IDs
            if (watchedSnap.exists()) {
              Object.keys(watchedSnap.data()).forEach(id => userListIds.add(id));
            }

            // Filter out content that's already in user's lists
            combined = combined.filter(content => {
              const key = content.media_type === 'tv' ? `tv_${content.id}` : String(content.id);
              return !userListIds.has(key);
            });
          } catch (error) {
            console.error("Error fetching user lists:", error);
            // Continue without filtering if there's an error
          }
        }

        setMovies(combined);
      } catch (error) {
        console.error("Error fetching trending content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingContent();
  }, [currentUser]);

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-4">Discover Trending Movies</h1>
          <p>Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Discover Trending Movies & TV Shows</h1>
        
        {movies.length > 0 ? (
                         <div className="space-y-2">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-600">No movies found.</p>
        )}
      </div>
    </Layout>
  );
}

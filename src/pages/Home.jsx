import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import Layout from "../Layout";
import { useNavigate, useLocation } from "react-router-dom";
import Recommendations from "../components/Recommendations";
import MovieCard from "../components/MovieCard";
import ActivityFeed from "../components/ActivityFeed";

export default function Home() {
  const { currentUser } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const navigate = useNavigate();
  const location = useLocation();

  // Restore query from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    if (q) {
      setQuery(q);
      fetchSearchResults(q);
    }
  }, [location.search]);



  const fetchSearchResults = async (searchQuery) => {
    try {
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      
      // Search for both movies and TV shows
      const [movieRes, tvRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${searchQuery}`),
        fetch(`https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${searchQuery}`)
      ]);
      
      const [movieData, tvData] = await Promise.all([
        movieRes.json(),
        tvRes.json()
      ]);

      // Combine and format results
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
      const combined = [...movies, ...tvShows].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      setResults(combined);
    } catch (error) {
      console.error("Error fetching search results:", error);
    }
  };



  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    navigate(`/?q=${encodeURIComponent(query)}`);
    await fetchSearchResults(query);
  };



  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-10 text-gray-900 dark:text-white">
            🎬 MovieMuse
          </h1>

          <form
            onSubmit={handleSearch}
            className="flex flex-col md:flex-row items-center gap-4 justify-center mb-12"
          >
            <input
              type="text"
              placeholder="Search for movies and TV shows..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full md:w-2/3 px-5 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Search
            </button>
          </form>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <div className="mb-16">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
              Search Results
            </h2>
            <div className="space-y-2">
              {results.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        {currentUser && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recommendations */}
            <div className="lg:col-span-2">
              <Recommendations userId={currentUser.uid} />
            </div>
            
            {/* Activity Feed */}
            <div className="lg:col-span-1">
              <ActivityFeed />
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}


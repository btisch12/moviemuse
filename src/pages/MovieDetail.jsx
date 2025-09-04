import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";
import Layout from "../Layout";
import { Button } from "../components/ui/button";
import { FaArrowLeft } from "react-icons/fa";

export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [ratingSaved, setRatingSaved] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [isOnWatchlist, setIsOnWatchlist] = useState(false);
  const [streamingProviders, setStreamingProviders] = useState(null);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchMovieAndRating = async () => {
      const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${import.meta.env.VITE_TMDB_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      setMovie(data);

      if (currentUser) {
        const watchedRef = doc(db, "watched", currentUser.uid);
        const watchlistRef = doc(db, "watchlists", currentUser.uid);

        const [watchedSnap, watchlistSnap] = await Promise.all([
          getDoc(watchedRef),
          getDoc(watchlistRef),
        ]);

        let savedRating = 0;

        if (watchedSnap.exists() && watchedSnap.data()[id]) {
          savedRating = watchedSnap.data()[id].rating || 0;
          setComment(watchedSnap.data()[id].comment || "");
          setIsWatched(true);
        } else if (watchlistSnap.exists() && watchlistSnap.data()[id]) {
          savedRating = watchlistSnap.data()[id].rating || 0;
          setComment(watchlistSnap.data()[id].comment || "");
          setIsOnWatchlist(true);
        }

        setRating(savedRating);
      }
    };

    fetchMovieAndRating();
  }, [id, currentUser]);

  // Fetch streaming providers
  useEffect(() => {
    const fetchStreamingProviders = async () => {
      setLoadingProviders(true);
      try {
        const url = `https://api.themoviedb.org/3/movie/${id}/watch/providers?api_key=${import.meta.env.VITE_TMDB_API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        
        // Get US streaming data 
        const usData = data.results?.US;
        if (usData) {
          setStreamingProviders({
            streaming: usData.flatrate || [],
            rent: usData.rent || [],
            buy: usData.buy || [],
            free: usData.free || []
          });
        }
      } catch (error) {
        console.error("Error fetching streaming providers:", error);
      } finally {
        setLoadingProviders(false);
      }
    };

    if (id) {
      fetchStreamingProviders();
    }
  }, [id]);

  const handleRating = async (star) => {
    setRating(star);

    if (!currentUser) {
      toast.error("You must be logged in to rate movies!");
      return;
    }

    const movieData = {
      id: movie.id,
      title: movie.title,
      poster: movie.poster_path,
      rating: star,
      comment: comment.trim() || null,
      watchedAt: Date.now(),
    };

    const watchlistRef = doc(db, "watchlists", currentUser.uid);
    const watchedRef = doc(db, "watched", currentUser.uid);

    await Promise.all([
      setDoc(watchlistRef, { [movie.id]: movieData }, { merge: true }),
      setDoc(watchedRef, { [movie.id]: movieData }, { merge: true }),
    ]);

    // Show "Saved!" message briefly
    setRatingSaved(true);
    setTimeout(() => setRatingSaved(false), 2500);
  };

    const saveToWatchlist = async () => {
    if (!currentUser) {
      toast.error("You must be logged in to save movies!");
      return;
    }

    try {
      const userRef = doc(db, "watchlists", currentUser.uid);
      await setDoc(
        userRef,
        {
          [movie.id]: {
            id: movie.id,
            title: movie.title,
            poster: movie.poster_path,
            rating,
            comment: comment.trim() || null,
            media_type: 'movie',
            savedAt: Date.now(),
          },
        },
        { merge: true }
      );

      toast.success(`${movie.title} saved to your watchlist!`);
      setIsOnWatchlist(true);
    } catch (error) {
      console.error("Error saving to watchlist:", error);
      toast.error("Failed to save to watchlist");
    }
  };

  if (!movie) {
    return (
      <Layout>
        <div className="p-6 text-center text-gray-700 dark:text-white">Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white transition-colors"
          >
            <FaArrowLeft className="text-sm" />
            Back
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-bold mb-6 text-gray-900 dark:text-white">
            {movie.title}
          </h1>

        {movie.poster_path && (
          <img
            src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
            alt={movie.title}
            className="w-60 md:w-72 lg:w-80 mx-auto rounded-lg shadow-md mb-6"
          />
        )}

        <div className="text-gray-700 dark:text-gray-200 space-y-2 mb-6 text-left">
          <p><strong>Release Date:</strong> {movie.release_date}</p>
          <p><strong>Overview:</strong> {movie.overview}</p>
          <p><strong>TMDB Rating:</strong> {movie.vote_average}</p>
        </div>

        {/* Streaming Providers Section */}
        <div className="mb-6 text-left">
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Where to Watch</h3>
          {loadingProviders ? (
            <p className="text-gray-500 dark:text-gray-400">Loading streaming options...</p>
          ) : streamingProviders ? (
            <div className="space-y-3">
              {streamingProviders.streaming.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-600 dark:text-green-400 mb-2">Streaming</h4>
                  <div className="flex flex-wrap gap-2">
                    {streamingProviders.streaming.map((provider) => (
                      <div key={provider.provider_id} className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                        <img
                          src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                          alt={provider.provider_name}
                          className="w-6 h-6 rounded"
                        />
                        <span className="text-sm font-medium">{provider.provider_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {streamingProviders.rent.length > 0 && (
                <div>
                  <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">Rent</h4>
                  <div className="flex flex-wrap gap-2">
                    {streamingProviders.rent.map((provider) => (
                      <div key={provider.provider_id} className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                        <img
                          src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                          alt={provider.provider_name}
                          className="w-6 h-6 rounded"
                        />
                        <span className="text-sm font-medium">{provider.provider_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {streamingProviders.buy.length > 0 && (
                <div>
                  <h4 className="font-medium text-purple-600 dark:text-purple-400 mb-2">Buy</h4>
                  <div className="flex flex-wrap gap-2">
                    {streamingProviders.buy.map((provider) => (
                      <div key={provider.provider_id} className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-lg">
                        <img
                          src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                          alt={provider.provider_name}
                          className="w-6 h-6 rounded"
                        />
                        <span className="text-sm font-medium">{provider.provider_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {streamingProviders.free.length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-600 dark:text-orange-400 mb-2">Free</h4>
                  <div className="flex flex-wrap gap-2">
                    {streamingProviders.free.map((provider) => (
                      <div key={provider.provider_id} className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
                        <img
                          src={`https://image.tmdb.org/t/p/original${provider.logo_path}`}
                          alt={provider.provider_name}
                          className="w-6 h-6 rounded"
                        />
                        <span className="text-sm font-medium">{provider.provider_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {!streamingProviders.streaming.length && 
               !streamingProviders.rent.length && 
               !streamingProviders.buy.length && 
               !streamingProviders.free.length && (
                <p className="text-gray-500 dark:text-gray-400">No streaming information available for this title.</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">Streaming information not available.</p>
          )}
        </div>

        {currentUser && (
          <div className="mb-6">
            <p className="mb-2 text-lg font-medium dark:text-gray-300">Your Rating:</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  className={`transition transform duration-150 text-3xl ${
                    star <= rating
                      ? "text-yellow-400 scale-110"
                      : "text-gray-300 hover:scale-105"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            {ratingSaved && (
              <p className="mt-2 text-green-600 font-medium transition-opacity duration-300">
                ⭐️ Rating saved!
              </p>
            )}
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Comment (optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts about this movie..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows="3"
                maxLength="500"
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                {comment.length}/500
              </div>
            </div>
          </div>
        )}

        {isWatched ? (
          <div className="mt-4 px-6 py-2 bg-green-100 text-green-700 rounded-md font-medium">
            ✅ You watched this!
          </div>
        ) : isOnWatchlist ? (
          <div className="mt-4 px-6 py-2 bg-blue-100 text-blue-700 rounded-md font-medium">
            📋 On Watchlist!
          </div>
        ) : (
          <Button onClick={saveToWatchlist} className="mt-4 px-6 py-2">
            Save to Watchlist
          </Button>
                 )}
        </div>
      </div>
    </Layout>
  );
 }

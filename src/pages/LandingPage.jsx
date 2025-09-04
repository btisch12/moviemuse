// src/pages/LandingPage.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaStar, FaUsers, FaHeart, FaSearch, FaPlay, FaTv } from "react-icons/fa";

export default function LandingPage() {
  const [trendingMovies, setTrendingMovies] = useState([]);
  const [trendingTV, setTrendingTV] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrendingContent = async () => {
      try {
        const apiKey = import.meta.env.VITE_TMDB_API_KEY;
        
        // Fetch trending movies and TV shows
        const [movieResponse, tvResponse] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${apiKey}`),
          fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${apiKey}`)
        ]);

        const [movieData, tvData] = await Promise.all([
          movieResponse.json(),
          tvResponse.json()
        ]);

        setTrendingMovies(movieData.results?.slice(0, 6) || []);
        setTrendingTV(tvData.results?.slice(0, 6) || []);
      } catch (error) {
        console.error("Error fetching trending content:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrendingContent();
  }, []);

  const renderContentCard = (item, type) => (
    <div key={item.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="relative">
        <img
          src={`https://image.tmdb.org/t/p/w500${item.poster_path}`}
          alt={item.title || item.name}
          className="w-full h-64 object-cover"
        />
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
          {type === 'movie' ? <FaPlay className="inline mr-1" /> : <FaTv className="inline mr-1" />}
          {type === 'movie' ? 'Movie' : 'TV Show'}
        </div>
        <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs flex items-center">
          <FaStar className="text-yellow-400 mr-1" />
          {item.vote_average?.toFixed(1) || 'N/A'}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">
          {item.title || item.name}
        </h3>
        <p className="text-gray-600 text-sm mt-1 line-clamp-2">
          {item.overview}
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="text-2xl font-bold text-gray-900">
              🎬 MovieMuse
            </div>
            <div className="flex space-x-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Login
              </Link>
                             <Link
                 to="/register"
                 className="bg-gradient-to-r from-blue-600 to-purple-600 text-white !text-white px-4 py-2 rounded-md text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-md hover:shadow-lg"
               >
                 Get Started
               </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
                     <h1 className="text-5xl font-bold text-gray-900 mb-6">
             Discover Your Next Favorite
             <span className="text-white bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 rounded-lg shadow-lg"> Movie & TV Show</span>
           </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            MovieMuse combines the power of social networking with intelligent recommendations 
            to help you find amazing content that matches your taste and discover what your friends love.
          </p>
                     <div className="flex justify-center space-x-4">
             <Link
               to="/register"
               className="bg-gradient-to-r from-blue-600 to-purple-600 text-white !text-white px-8 py-4 rounded-lg text-lg font-bold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center"
             >
               <FaHeart className="mr-2 text-xl" />
               Start Exploring
             </Link>
             <Link
               to="/login"
               className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-600 hover:text-white transition-all duration-300"
             >
               Sign In
             </Link>
           </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose MovieMuse?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaSearch className="text-blue-600 text-2xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Recommendations</h3>
              <p className="text-gray-600">
                Our KNN algorithm learns your preferences and suggests movies and TV shows 
                that match your taste perfectly.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaUsers className="text-green-600 text-2xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Social Discovery</h3>
              <p className="text-gray-600">
                Connect with friends, see what they're watching, and get recommendations 
                based on your social network.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaStar className="text-purple-600 text-2xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Track & Rate</h3>
              <p className="text-gray-600">
                Keep track of what you've watched, what you want to watch, and rate 
                your favorites to improve recommendations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trending Content Section */}
      <div className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Trending This Week
          </h2>
          
          {/* Movies */}
          <div className="mb-12">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <FaPlay className="mr-2 text-blue-600" />
              Popular Movies
            </h3>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-lg h-80 animate-pulse">
                    <div className="bg-gray-300 h-64 rounded-t-lg"></div>
                    <div className="p-4">
                      <div className="bg-gray-300 h-4 rounded mb-2"></div>
                      <div className="bg-gray-300 h-3 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingMovies.map(movie => renderContentCard(movie, 'movie'))}
              </div>
            )}
          </div>

          {/* TV Shows */}
          <div className="mb-12">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <FaTv className="mr-2 text-green-600" />
              Popular TV Shows
            </h3>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-lg h-80 animate-pulse">
                    <div className="bg-gray-300 h-64 rounded-t-lg"></div>
                    <div className="p-4">
                      <div className="bg-gray-300 h-4 rounded mb-2"></div>
                      <div className="bg-gray-300 h-3 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingTV.map(show => renderContentCard(show, 'tv'))}
              </div>
            )}
          </div>

          {/* CTA Section */}
          <div className="text-center bg-white rounded-lg shadow-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Start Your Movie Journey?
            </h3>
            <p className="text-gray-600 mb-6">
              Join thousands of users who are discovering amazing content with MovieMuse.
            </p>
                         <Link
               to="/register"
               className="bg-gradient-to-r from-blue-600 to-purple-600 text-white !text-white px-8 py-4 rounded-lg text-lg font-bold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl inline-flex items-center"
             >
               <FaHeart className="mr-2 text-xl" />
               Create Your Account
             </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2024 MovieMuse. Discover, track, and share your favorite movies and TV shows.
          </p>
        </div>
      </footer>
    </div>
  );
}

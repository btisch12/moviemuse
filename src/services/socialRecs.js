// src/services/socialRecs.js
import { doc, getDoc, collection, getDocs } from "firebase/firestore";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbJson(path, apiKey, params = "") {
  const url = `${TMDB_BASE}${path}?api_key=${apiKey}${params ? `&${params}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

// Calculate cosine similarity between two users based on their watched content
function calculateUserSimilarity(user1Watched, user2Watched) {
  const user1Ratings = new Map();
  const user2Ratings = new Map();
  
  // Create rating maps for both users
  user1Watched.forEach(item => {
    const key = `${item.media_type || 'movie'}_${item.id}`;
    user1Ratings.set(key, item.rating || 0);
  });
  
  user2Watched.forEach(item => {
    const key = `${item.media_type || 'movie'}_${item.id}`;
    user2Ratings.set(key, item.rating || 0);
  });
  
  // Find common items
  const commonItems = new Set([...user1Ratings.keys()].filter(key => user2Ratings.has(key)));
  
  if (commonItems.size === 0) return 0;
  
  // Calculate cosine similarity
  let dotProduct = 0;
  let user1Norm = 0;
  let user2Norm = 0;
  
  for (const itemKey of commonItems) {
    const rating1 = user1Ratings.get(itemKey);
    const rating2 = user2Ratings.get(itemKey);
    
    dotProduct += rating1 * rating2;
    user1Norm += rating1 * rating1;
    user2Norm += rating2 * rating2;
  }
  
  if (user1Norm === 0 || user2Norm === 0) return 0;
  
  return dotProduct / (Math.sqrt(user1Norm) * Math.sqrt(user2Norm));
}

// Generate a human-readable reason for why something was recommended
function generateRecommendationReason(reasons) {
  if (!reasons || reasons.length === 0) return null;
  
  // Sort reasons by similarity and rating
  const sortedReasons = reasons.sort((a, b) => {
    const scoreA = a.similarity * a.rating;
    const scoreB = b.similarity * b.rating;
    return scoreB - scoreA;
  });
  
  const topReason = sortedReasons[0];
  
  // Handle special cases
  if (topReason.username === 'Similar content algorithm') {
    return 'Because you liked similar content';
  }
  
  if (topReason.username === 'Trending content') {
    return 'Trending this week';
  }
  
  // If it's a friend, mention that
  if (topReason.isFriend) {
    return `Because ${topReason.username} (your friend) watched this`;
  }
  
  // If multiple people recommended it
  if (reasons.length > 1) {
    const friendCount = reasons.filter(r => r.isFriend).length;
    const totalCount = reasons.length;
    
    if (friendCount > 0) {
      return `Because ${friendCount} friends and ${totalCount - friendCount} similar users watched this`;
    } else {
      return `Because ${totalCount} similar users watched this`;
    }
  }
  
  // Single user recommendation
  return `Because ${topReason.username} watched this`;
}

// Get all users' watched content for similarity calculation
async function getAllUsersWatched(db) {
  const usersRef = collection(db, "users");
  const usersSnap = await getDocs(usersRef);
  const users = [];
  
  // Limit to first 100 users for performance 
  const userDocs = usersSnap.docs.slice(0, 100);
  
  for (const userDoc of userDocs) {
    if (userDoc.id === "usernames") continue; // Skip the usernames mapping document
    
    const userData = userDoc.data();
    const watchedSnap = await getDoc(doc(db, "watched", userDoc.id));
    
    if (watchedSnap.exists()) {
      const watchedData = watchedSnap.data();
      const watchedItems = Object.values(watchedData);
      
      // Only include users with at least 3 watched items for meaningful similarity
      if (watchedItems.length >= 3) {
        users.push({
          uid: userDoc.id,
          username: userData.username,
          watched: watchedItems,
          friends: userData.friends || []
        });
      }
    }
  }
  
  return users;
}

// Find K nearest neighbors for a user
async function findKNearestNeighbors(db, targetUserId, k = 10) {
  const targetUserSnap = await getDoc(doc(db, "users", targetUserId));
  if (!targetUserSnap.exists()) return [];
  
  const targetUserData = targetUserSnap.data();
  const targetWatchedSnap = await getDoc(doc(db, "watched", targetUserId));
  const targetWatched = targetWatchedSnap.exists() ? Object.values(targetWatchedSnap.data()) : [];
  
  // Get all users
  const allUsers = await getAllUsersWatched(db);
  
  // Calculate similarities
  const similarities = [];
  
  for (const user of allUsers) {
    if (user.uid === targetUserId) continue; // Skip self
    
    const similarity = calculateUserSimilarity(targetWatched, user.watched);
    
    // Boost similarity for friends
    let socialBoost = 1.0;
    if (targetUserData.friends && targetUserData.friends.includes(user.uid)) {
      socialBoost = 1.5; // 50% boost for friends
    }
    
    similarities.push({
      user: user,
      similarity: similarity * socialBoost,
      isFriend: targetUserData.friends && targetUserData.friends.includes(user.uid)
    });
  }
  
  // Sort by similarity and return top K
  similarities.sort((a, b) => b.similarity - a.similarity);
  return similarities.slice(0, k);
}

// Get recommendations from similar users
async function getRecommendationsFromNeighbors(neighbors, targetUserWatched) {
  const recommendations = new Map(); // contentKey -> { content, score, count }
  
  for (const neighbor of neighbors) {
    if (neighbor.similarity <= 0) continue; // Skip users with no similarity
    
    for (const watchedItem of neighbor.user.watched) {
      const contentKey = `${watchedItem.media_type || 'movie'}_${watchedItem.id}`;
      
      // Skip if target user has already watched this
      const targetUserHasWatched = targetUserWatched.some(item => 
        `${item.media_type || 'movie'}_${item.id}` === contentKey
      );
      
      if (targetUserHasWatched) continue;
      
      const existing = recommendations.get(contentKey);
      const rating = watchedItem.rating || 0;
      const score = neighbor.similarity * rating;
      
      if (existing) {
        existing.score += score;
        existing.count += 1;
        // Add this neighbor to the reasons
        existing.reasons.push({
          username: neighbor.user.username,
          rating: rating,
          similarity: neighbor.similarity,
          isFriend: neighbor.isFriend
        });
      } else {
        recommendations.set(contentKey, {
          content: {
            id: watchedItem.id,
            title: watchedItem.title,
            poster_path: watchedItem.poster,
            media_type: watchedItem.media_type || 'movie'
          },
          score: score,
          count: 1,
          avgRating: rating,
          reasons: [{
            username: neighbor.user.username,
            rating: rating,
            similarity: neighbor.similarity,
            isFriend: neighbor.isFriend
          }]
        });
      }
    }
  }
  
  // Convert to array and sort by score
  const recommendationsArray = Array.from(recommendations.values());
  recommendationsArray.sort((a, b) => b.score - a.score);
  
  return recommendationsArray;
}

// Enhanced recommendation function that combines social KNN with content-based filtering
export async function getSocialRecommendations({ db, uid, apiKey, limit = 18 }) {
  const startTime = performance.now();
  
  try {
    // Get target user's watched content
    const targetWatchedSnap = await getDoc(doc(db, "watched", uid));
    const targetWatched = targetWatchedSnap.exists() ? Object.values(targetWatchedSnap.data()) : [];
    
    // Get user's lists to exclude
    const [watchlistSnap, watchingSnap] = await Promise.all([
      getDoc(doc(db, "watchlists", uid)),
      getDoc(doc(db, "watching", uid))
    ]);
    
    const excludeSet = new Set();
    if (watchlistSnap.exists()) {
      Object.keys(watchlistSnap.data()).forEach(key => excludeSet.add(key));
    }
    if (watchingSnap.exists()) {
      Object.keys(watchingSnap.data()).forEach(key => excludeSet.add(key));
    }
    
    // Find K nearest neighbors
    const neighbors = await findKNearestNeighbors(db, uid, 15);
    
    let recommendations = [];
    
    if (neighbors.length > 0 && neighbors.some(n => n.similarity > 0)) {
             // Get recommendations from similar users
       const socialRecs = await getRecommendationsFromNeighbors(neighbors, targetWatched);
      
      // Filter out excluded content
      const filteredRecs = socialRecs.filter(rec => !excludeSet.has(rec.content.id.toString()));
      
      // Enhance with TMDB data for better content information
      const enhancedRecs = await Promise.all(
        filteredRecs.slice(0, limit * 2).map(async (rec) => {
          try {
            const endpoint = rec.content.media_type === 'tv' 
              ? `/tv/${rec.content.id}` 
              : `/movie/${rec.content.id}`;
            const tmdbData = await tmdbJson(endpoint, apiKey);
            
            return {
              ...rec,
              content: {
                ...rec.content,
                title: tmdbData.title || tmdbData.name || rec.content.title,
                poster_path: tmdbData.poster_path || rec.content.poster_path,
                vote_average: tmdbData.vote_average,
                overview: tmdbData.overview,
                popularity: tmdbData.popularity
              }
            };
          } catch (error) {
            console.warn(`Failed to fetch TMDB data for ${rec.content.id}:`, error);
            return rec;
          }
        })
      );
      
      recommendations = enhancedRecs;
    }
    
    // Fallback to content-based recommendations if no social recommendations
    if (recommendations.length === 0) {
      console.log("No social recommendations found, falling back to content-based");
      
      // Use top rated watched content as seeds
      const topRated = targetWatched
        .filter(item => item.rating && item.rating >= 4)
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 3);
      
      if (topRated.length > 0) {
        const similarContent = await Promise.all(
          topRated.map(item => {
            const endpoint = item.media_type === 'tv' 
              ? `/tv/${item.id}/similar` 
              : `/movie/${item.id}/similar`;
            return tmdbJson(endpoint, apiKey, "page=1");
          })
        );
        
        const allSimilar = similarContent.flatMap(data => data.results || []);
        const counts = new Map();
        
        for (const item of allSimilar) {
          const key = `${item.media_type || 'movie'}_${item.id}`;
          const count = counts.get(key) || 0;
          counts.set(key, count + 1);
        }
        
                 recommendations = Array.from(counts.entries())
           .map(([key, count]) => {
             const [, id] = key.split('_');
             const item = allSimilar.find(i => i.id.toString() === id);
            return {
              content: item,
              score: count,
              count: count,
              avgRating: item.vote_average || 0,
              reasons: [{
                username: 'Similar content algorithm',
                rating: item.vote_average || 0,
                similarity: 1,
                isFriend: false
              }]
            };
          })
          .filter(rec => !excludeSet.has(rec.content.id.toString()));
      }
    }
    
    // Final fallback to trending content
    if (recommendations.length === 0) {
      console.log("No content-based recommendations found, falling back to trending");
      const [movieData, tvData] = await Promise.all([
        tmdbJson(`/trending/movie/week`, apiKey),
        tmdbJson(`/trending/tv/week`, apiKey)
      ]);
      
      const trending = [
        ...(movieData.results || []).map(m => ({ ...m, media_type: 'movie', title: m.title })),
        ...(tvData.results || []).map(t => ({ ...t, media_type: 'tv', title: t.name }))
      ];
      
      recommendations = trending
        .filter(item => !excludeSet.has(item.id.toString()))
        .map(item => ({
          content: item,
          score: item.popularity || 0,
          count: 1,
          avgRating: item.vote_average || 0,
          reasons: [{
            username: 'Trending content',
            rating: item.vote_average || 0,
            similarity: 1,
            isFriend: false
          }]
        }));
    }
    
    // Sort by score and return final recommendations
    recommendations.sort((a, b) => b.score - a.score);
    
    const finalRecommendations = recommendations.slice(0, limit).map(rec => ({
      id: rec.content.id,
      title: rec.content.title,
      poster_path: rec.content.poster_path,
      vote_average: rec.content.vote_average,
      overview: rec.content.overview,
      popularity: rec.content.popularity,
      media_type: rec.content.media_type || 'movie',
      _socialScore: rec.score,
      _recommendationCount: rec.count,
      _recommendationReason: rec.reasons ? generateRecommendationReason(rec.reasons) : null
    }));
    
    // Debug logging (only in development)
    if (import.meta.env.DEV) {
      const { logRecommendationStats, trackRecommendationPerformance, validateRecommendations } = await import('../utils/recommendationDebug.js');
      logRecommendationStats(finalRecommendations, neighbors, uid);
      trackRecommendationPerformance(startTime, finalRecommendations, neighbors);
      validateRecommendations(finalRecommendations, targetWatched);
      
      // Run comprehensive KNN analysis
      const { quickKNNAnalysis } = await import('../utils/knnAnalysis.js');
      await quickKNNAnalysis(db, uid, finalRecommendations, startTime, performance.now(), neighbors);
    }
    
    return finalRecommendations;
    
  } catch (error) {
    console.error("Social recommendations error:", error);
    return [];
  }
}

// Get friend activity for social feed
export async function getFriendActivity(db, uid, limit = 10) {
  try {
    const userSnap = await getDoc(doc(db, "users", uid));
    if (!userSnap.exists()) return [];
    
    const userData = userSnap.data();
    const friends = userData.friends || [];
    
    if (friends.length === 0) return [];
    
    const activities = [];
    
    for (const friendId of friends.slice(0, 5)) { // Limit to 5 friends for performance
      // Skip if this is the current user
      if (friendId === uid) continue;
      
      // Fetch friend's user data to get their username
      const friendUserSnap = await getDoc(doc(db, "users", friendId));
      if (!friendUserSnap.exists()) continue;
      
      const friendUserData = friendUserSnap.data();
      const friendUsername = friendUserData.username || 'Unknown User';
      
      const friendWatchedSnap = await getDoc(doc(db, "watched", friendId));
      if (friendWatchedSnap.exists()) {
        const watchedData = friendWatchedSnap.data();
        const recentWatched = Object.values(watchedData)
          .sort((a, b) => new Date(b.watchedAt) - new Date(a.watchedAt))
          .slice(0, 3);
        
        for (const item of recentWatched) {
          activities.push({
            type: 'watched',
            friendId: friendId,
            friendUsername: friendUsername,
            content: item,
            timestamp: item.watchedAt
          });
        }
      }
    }
    
    // Sort by timestamp and return recent activities
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return activities.slice(0, limit);
    
  } catch (error) {
    console.error("Friend activity error:", error);
    return [];
  }
}

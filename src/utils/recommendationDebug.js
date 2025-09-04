// src/utils/recommendationDebug.js

// Debug utility for the social recommendation system
export function logRecommendationStats(recommendations, neighbors, targetUserId) {
  console.group('🎯 Social Recommendation Stats');
  
  console.log('📊 Target User ID:', targetUserId);
  console.log('👥 Similar Users Found:', neighbors.length);
  console.log('🎬 Recommendations Generated:', recommendations.length);
  
  if (neighbors.length > 0) {
    console.log('🔗 Top Similar Users:');
    neighbors.slice(0, 5).forEach((neighbor, index) => {
      console.log(`  ${index + 1}. ${neighbor.user.username} (similarity: ${neighbor.similarity.toFixed(3)}, friend: ${neighbor.isFriend})`);
    });
  }
  
  if (recommendations.length > 0) {
    console.log('🏆 Top Recommendations:');
    recommendations.slice(0, 5).forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec.title} (score: ${rec._socialScore?.toFixed(2) || 'N/A'}, count: ${rec._recommendationCount || 0})`);
    });
  }
  
  console.groupEnd();
}

// Calculate recommendation diversity
export function calculateRecommendationDiversity(recommendations) {
  if (recommendations.length === 0) return 0;
  
  const genres = new Set();
  const years = new Set();
  
  recommendations.forEach(rec => {
    if (rec.genre_ids) {
      rec.genre_ids.forEach(genreId => genres.add(genreId));
    }
    if (rec.release_date) {
      const year = new Date(rec.release_date).getFullYear();
      years.add(year);
    }
  });
  
  return {
    genreDiversity: genres.size,
    yearDiversity: years.size,
    totalRecommendations: recommendations.length
  };
}

// Monitor recommendation performance
export function trackRecommendationPerformance(startTime, recommendations, neighbors) {
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  console.log('⚡ Recommendation Performance:', {
    duration: `${duration.toFixed(2)}ms`,
    recommendationsGenerated: recommendations.length,
    similarUsersProcessed: neighbors.length,
    recommendationsPerSecond: (recommendations.length / (duration / 1000)).toFixed(2)
  });
  
  return duration;
}

// Validate recommendation quality
export function validateRecommendations(recommendations, targetUserWatched) {
  const validation = {
    totalRecommendations: recommendations.length,
    uniqueContent: new Set(recommendations.map(r => r.id)).size,
    alreadyWatched: 0,
    hasRatings: 0,
    hasSocialScore: 0
  };
  
  const targetUserWatchedIds = new Set(
    targetUserWatched.map(item => `${item.media_type || 'movie'}_${item.id}`)
  );
  
  recommendations.forEach(rec => {
    const recKey = `${rec.media_type || 'movie'}_${rec.id}`;
    if (targetUserWatchedIds.has(recKey)) {
      validation.alreadyWatched++;
    }
    if (rec.vote_average) {
      validation.hasRatings++;
    }
    if (rec._socialScore) {
      validation.hasSocialScore++;
    }
  });
  
  console.log('✅ Recommendation Validation:', validation);
  return validation;
}

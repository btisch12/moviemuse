// src/utils/knnAnalysis.js

import { doc, getDoc, collection, getDocs } from "firebase/firestore";

// Comprehensive KNN Analysis Toolkit

export class KNNAnalyzer {
  constructor(db) {
    this.db = db;
    this.analysisResults = {};
  }

  // 1. User Similarity Analysis
  async analyzeUserSimilarity(targetUserId) {
    console.group('🔍 User Similarity Analysis');
    
    const targetUserSnap = await getDoc(doc(this.db, "users", targetUserId));
    if (!targetUserSnap.exists()) {
      console.log('❌ Target user not found');
      console.groupEnd();
      return null;
    }

    const targetUserData = targetUserSnap.data();
    const targetWatchedSnap = await getDoc(doc(this.db, "watched", targetUserId));
    const targetWatched = targetWatchedSnap.exists() ? Object.values(targetWatchedSnap.data()) : [];

    console.log('📊 Target User Stats:');
    console.log(`  - Username: ${targetUserData.username}`);
    console.log(`  - Friends: ${targetUserData.friends?.length || 0}`);
    console.log(`  - Watched Items: ${targetWatched.length}`);
    console.log(`  - Average Rating: ${this.calculateAverageRating(targetWatched)}`);

    // Get all users for comparison
    const usersRef = collection(this.db, "users");
    const usersSnap = await getDocs(usersRef);
    const allUsers = [];

    for (const userDoc of usersSnap.docs) {
      if (userDoc.id === "usernames" || userDoc.id === targetUserId) continue;
      
      const userData = userDoc.data();
      const watchedSnap = await getDoc(doc(this.db, "watched", userDoc.id));
      
      if (watchedSnap.exists()) {
        const watchedItems = Object.values(watchedSnap.data());
        if (watchedItems.length >= 3) {
          allUsers.push({
            uid: userDoc.id,
            username: userData.username,
            watched: watchedItems,
            friends: userData.friends || [],
            isFriend: targetUserData.friends?.includes(userDoc.id) || false
          });
        }
      }
    }

    // Calculate similarities
    const similarities = allUsers.map(user => ({
      ...user,
      similarity: this.calculateCosineSimilarity(targetWatched, user.watched),
      commonItems: this.findCommonItems(targetWatched, user.watched).length
    }));

    // Sort by similarity
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Analysis results
    const analysis = {
      totalUsersAnalyzed: similarities.length,
      usersWithSimilarity: similarities.filter(s => s.similarity > 0).length,
      averageSimilarity: similarities.reduce((sum, s) => sum + s.similarity, 0) / similarities.length,
      topSimilarUsers: similarities.slice(0, 10),
      friendSimilarities: similarities.filter(s => s.isFriend),
      nonFriendSimilarities: similarities.filter(s => !s.isFriend),
      similarityDistribution: this.calculateSimilarityDistribution(similarities)
    };

    console.log('📈 Similarity Analysis:');
    console.log(`  - Total users analyzed: ${analysis.totalUsersAnalyzed}`);
    console.log(`  - Users with similarity > 0: ${analysis.usersWithSimilarity}`);
    console.log(`  - Average similarity: ${analysis.averageSimilarity.toFixed(3)}`);
    console.log(`  - Friend average similarity: ${this.calculateAverageSimilarity(analysis.friendSimilarities)}`);
    console.log(`  - Non-friend average similarity: ${this.calculateAverageSimilarity(analysis.nonFriendSimilarities)}`);

    console.log('🏆 Top 5 Similar Users:');
    analysis.topSimilarUsers.slice(0, 5).forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} (${user.similarity.toFixed(3)}, ${user.commonItems} common items, friend: ${user.isFriend})`);
    });

    console.groupEnd();
    return analysis;
  }

  // 2. Recommendation Quality Analysis
  async analyzeRecommendationQuality(targetUserId, recommendations) {
    console.group('🎯 Recommendation Quality Analysis');
    
    const targetWatchedSnap = await getDoc(doc(this.db, "watched", targetUserId));
    const targetWatched = targetWatchedSnap.exists() ? Object.values(targetWatchedSnap.data()) : [];

    const analysis = {
      totalRecommendations: recommendations.length,
      uniqueRecommendations: new Set(recommendations.map(r => r.id)).size,
      averageRating: recommendations.reduce((sum, r) => sum + (r.vote_average || 0), 0) / recommendations.length,
      socialRecommendations: recommendations.filter(r => r._socialScore).length,
      contentBasedRecommendations: recommendations.filter(r => !r._socialScore).length,
      genreDistribution: this.analyzeGenreDistribution(recommendations),
      yearDistribution: this.analyzeYearDistribution(recommendations),
      diversityScore: this.calculateDiversityScore(recommendations)
    };

    console.log('📊 Recommendation Stats:');
    console.log(`  - Total recommendations: ${analysis.totalRecommendations}`);
    console.log(`  - Unique recommendations: ${analysis.uniqueRecommendations}`);
    console.log(`  - Average TMDB rating: ${analysis.averageRating.toFixed(2)}`);
    console.log(`  - Social recommendations: ${analysis.socialRecommendations}`);
    console.log(`  - Content-based recommendations: ${analysis.contentBasedRecommendations}`);
    console.log(`  - Diversity score: ${analysis.diversityScore.toFixed(3)}`);

    console.log('🎭 Genre Distribution:');
    Object.entries(analysis.genreDistribution).forEach(([genre, count]) => {
      console.log(`  - ${genre}: ${count}`);
    });

    console.groupEnd();
    return analysis;
  }

  // 3. Performance Analysis
  async analyzePerformance(startTime, endTime, neighbors, recommendations) {
    console.group('⚡ Performance Analysis');
    
    const duration = endTime - startTime;
    const analysis = {
      totalDuration: duration,
      neighborsProcessed: neighbors.length,
      recommendationsGenerated: recommendations.length,
      recommendationsPerSecond: recommendations.length / (duration / 1000),
      averageTimePerNeighbor: duration / neighbors.length,
      performanceScore: this.calculatePerformanceScore(duration, neighbors.length, recommendations.length)
    };

    console.log('⏱️ Performance Metrics:');
    console.log(`  - Total duration: ${duration.toFixed(2)}ms`);
    console.log(`  - Neighbors processed: ${analysis.neighborsProcessed}`);
    console.log(`  - Recommendations generated: ${analysis.recommendationsGenerated}`);
    console.log(`  - Recommendations per second: ${analysis.recommendationsPerSecond.toFixed(2)}`);
    console.log(`  - Average time per neighbor: ${analysis.averageTimePerNeighbor.toFixed(2)}ms`);
    console.log(`  - Performance score: ${analysis.performanceScore.toFixed(3)}`);

    console.groupEnd();
    return analysis;
  }

  // 4. Social Network Analysis
  async analyzeSocialNetwork(targetUserId) {
    console.group('🌐 Social Network Analysis');
    
    const targetUserSnap = await getDoc(doc(this.db, "users", targetUserId));
    if (!targetUserSnap.exists()) {
      console.log('❌ Target user not found');
      console.groupEnd();
      return null;
    }

    const targetUserData = targetUserSnap.data();
    const friends = targetUserData.friends || [];

    const friendAnalysis = {
      totalFriends: friends.length,
      friendsWithWatchedContent: 0,
      averageFriendWatchedCount: 0,
      friendRecommendationPotential: 0,
      socialInfluenceScore: 0
    };

    let totalWatchedByFriends = 0;
    let friendsWithContent = 0;

    for (const friendId of friends) {
      const friendWatchedSnap = await getDoc(doc(this.db, "watched", friendId));
      if (friendWatchedSnap.exists()) {
        const watchedCount = Object.keys(friendWatchedSnap.data()).length;
        totalWatchedByFriends += watchedCount;
        friendsWithContent++;
      }
    }

    friendAnalysis.friendsWithWatchedContent = friendsWithContent;
    friendAnalysis.averageFriendWatchedCount = friendsWithContent > 0 ? totalWatchedByFriends / friendsWithContent : 0;
    friendAnalysis.friendRecommendationPotential = friendsWithContent / friends.length;
    friendAnalysis.socialInfluenceScore = this.calculateSocialInfluenceScore(friends.length, friendAnalysis.friendRecommendationPotential);

    console.log('👥 Social Network Stats:');
    console.log(`  - Total friends: ${friendAnalysis.totalFriends}`);
    console.log(`  - Friends with watched content: ${friendAnalysis.friendsWithWatchedContent}`);
    console.log(`  - Average watched count per friend: ${friendAnalysis.averageFriendWatchedCount.toFixed(1)}`);
    console.log(`  - Friend recommendation potential: ${(friendAnalysis.friendRecommendationPotential * 100).toFixed(1)}%`);
    console.log(`  - Social influence score: ${friendAnalysis.socialInfluenceScore.toFixed(3)}`);

    console.groupEnd();
    return friendAnalysis;
  }

  // 5. Cold Start Analysis
  async analyzeColdStart(targetUserId) {
    console.group('❄️ Cold Start Analysis');
    
    const targetWatchedSnap = await getDoc(doc(this.db, "watched", targetUserId));
    const targetWatched = targetWatchedSnap.exists() ? Object.values(targetWatchedSnap.data()) : [];

    const analysis = {
      watchedCount: targetWatched.length,
      ratedCount: targetWatched.filter(item => item.rating).length,
      averageRating: this.calculateAverageRating(targetWatched),
      ratingDistribution: this.calculateRatingDistribution(targetWatched),
      coldStartLevel: this.determineColdStartLevel(targetWatched),
      recommendationReliability: this.calculateRecommendationReliability(targetWatched)
    };

    console.log('📊 Cold Start Metrics:');
    console.log(`  - Watched items: ${analysis.watchedCount}`);
    console.log(`  - Rated items: ${analysis.ratedCount}`);
    console.log(`  - Average rating: ${analysis.averageRating.toFixed(2)}`);
    console.log(`  - Cold start level: ${analysis.coldStartLevel}`);
    console.log(`  - Recommendation reliability: ${(analysis.recommendationReliability * 100).toFixed(1)}%`);

    console.log('⭐ Rating Distribution:');
    Object.entries(analysis.ratingDistribution).forEach(([rating, count]) => {
      console.log(`  - ${rating} stars: ${count}`);
    });

    console.groupEnd();
    return analysis;
  }

  // 6. Comprehensive System Analysis
  async runComprehensiveAnalysis(targetUserId, recommendations, startTime, endTime, neighbors) {
    console.group('🔬 COMPREHENSIVE KNN ANALYSIS');
    
    const results = {
      timestamp: new Date().toISOString(),
      targetUserId,
      userSimilarity: await this.analyzeUserSimilarity(targetUserId),
      recommendationQuality: await this.analyzeRecommendationQuality(targetUserId, recommendations),
      performance: await this.analyzePerformance(startTime, endTime, neighbors, recommendations),
      socialNetwork: await this.analyzeSocialNetwork(targetUserId),
      coldStart: await this.analyzeColdStart(targetUserId)
    };

    // Calculate overall system score
    results.overallScore = this.calculateOverallScore(results);
    
    console.log('🏆 Overall System Score:', results.overallScore.toFixed(3));
    console.log('📋 Analysis Summary:');
    console.log(`  - User similarity strength: ${this.getScoreDescription(results.userSimilarity?.averageSimilarity || 0)}`);
    console.log(`  - Recommendation quality: ${this.getScoreDescription(results.recommendationQuality?.diversityScore || 0)}`);
    console.log(`  - Performance efficiency: ${this.getScoreDescription(results.performance?.performanceScore || 0)}`);
    console.log(`  - Social network strength: ${this.getScoreDescription(results.socialNetwork?.socialInfluenceScore || 0)}`);
    console.log(`  - Cold start handling: ${this.getScoreDescription(results.coldStart?.recommendationReliability || 0)}`);

    console.groupEnd();
    
    // Store results for later analysis
    this.analysisResults = results;
    return results;
  }

  // Helper methods
  calculateCosineSimilarity(user1Watched, user2Watched) {
    const user1Ratings = new Map();
    const user2Ratings = new Map();
    
    user1Watched.forEach(item => {
      const key = `${item.media_type || 'movie'}_${item.id}`;
      user1Ratings.set(key, item.rating || 0);
    });
    
    user2Watched.forEach(item => {
      const key = `${item.media_type || 'movie'}_${item.id}`;
      user2Ratings.set(key, item.rating || 0);
    });
    
    const commonItems = new Set([...user1Ratings.keys()].filter(key => user2Ratings.has(key)));
    
    if (commonItems.size === 0) return 0;
    
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

  findCommonItems(user1Watched, user2Watched) {
    const user1Items = new Set(user1Watched.map(item => `${item.media_type || 'movie'}_${item.id}`));
    const user2Items = new Set(user2Watched.map(item => `${item.media_type || 'movie'}_${item.id}`));
    
    return [...user1Items].filter(item => user2Items.has(item));
  }

  calculateAverageRating(watchedItems) {
    const ratedItems = watchedItems.filter(item => item.rating);
    if (ratedItems.length === 0) return 0;
    return ratedItems.reduce((sum, item) => sum + item.rating, 0) / ratedItems.length;
  }

  calculateAverageSimilarity(similarities) {
    if (similarities.length === 0) return 0;
    return similarities.reduce((sum, s) => sum + s.similarity, 0) / similarities.length;
  }

  calculateSimilarityDistribution(similarities) {
    const distribution = {
      '0.0-0.1': 0,
      '0.1-0.2': 0,
      '0.2-0.3': 0,
      '0.3-0.4': 0,
      '0.4-0.5': 0,
      '0.5+': 0
    };

    similarities.forEach(s => {
      if (s.similarity < 0.1) distribution['0.0-0.1']++;
      else if (s.similarity < 0.2) distribution['0.1-0.2']++;
      else if (s.similarity < 0.3) distribution['0.2-0.3']++;
      else if (s.similarity < 0.4) distribution['0.3-0.4']++;
      else if (s.similarity < 0.5) distribution['0.4-0.5']++;
      else distribution['0.5+']++;
    });

    return distribution;
  }

  analyzeGenreDistribution(recommendations) {
    const genres = {};
    recommendations.forEach(rec => {
      if (rec.genre_ids) {
        rec.genre_ids.forEach(genreId => {
          genres[genreId] = (genres[genreId] || 0) + 1;
        });
      }
    });
    return genres;
  }

  analyzeYearDistribution(recommendations) {
    const years = {};
    recommendations.forEach(rec => {
      if (rec.release_date) {
        const year = new Date(rec.release_date).getFullYear();
        years[year] = (years[year] || 0) + 1;
      }
    });
    return years;
  }

  calculateDiversityScore(recommendations) {
    if (recommendations.length === 0) return 0;
    
    const uniqueGenres = new Set();
    const uniqueYears = new Set();
    
    recommendations.forEach(rec => {
      if (rec.genre_ids) {
        rec.genre_ids.forEach(genreId => uniqueGenres.add(genreId));
      }
      if (rec.release_date) {
        const year = new Date(rec.release_date).getFullYear();
        uniqueYears.add(year);
      }
    });
    
    const genreDiversity = uniqueGenres.size / Math.min(recommendations.length, 20); // Normalize
    const yearDiversity = uniqueYears.size / Math.min(recommendations.length, 20);
    
    return (genreDiversity + yearDiversity) / 2;
  }

  calculatePerformanceScore(duration, neighbors, recommendations) {
    const timeScore = Math.max(0, 1 - (duration / 10000)); // Prefer under 10 seconds
    const neighborScore = Math.min(1, neighbors / 50); // Prefer more neighbors up to 50
    const recommendationScore = Math.min(1, recommendations / 20); // Prefer more recommendations up to 20
    
    return (timeScore + neighborScore + recommendationScore) / 3;
  }

  calculateSocialInfluenceScore(friendCount, recommendationPotential) {
    const friendScore = Math.min(1, friendCount / 20); // Prefer more friends up to 20
    return (friendScore + recommendationPotential) / 2;
  }

  calculateRatingDistribution(watchedItems) {
    const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    watchedItems.forEach(item => {
      if (item.rating) {
        distribution[item.rating.toString()]++;
      }
    });
    return distribution;
  }

  determineColdStartLevel(watchedItems) {
    if (watchedItems.length === 0) return 'Very Cold';
    if (watchedItems.length < 5) return 'Cold';
    if (watchedItems.length < 15) return 'Warm';
    return 'Hot';
  }

  calculateRecommendationReliability(watchedItems) {
    const ratedItems = watchedItems.filter(item => item.rating);
    if (watchedItems.length === 0) return 0;
    return Math.min(1, ratedItems.length / 10); // More reliable with more rated items
  }

  calculateOverallScore(results) {
    const weights = {
      similarity: 0.25,
      quality: 0.25,
      performance: 0.20,
      social: 0.15,
      coldStart: 0.15
    };

    const scores = {
      similarity: results.userSimilarity?.averageSimilarity || 0,
      quality: results.recommendationQuality?.diversityScore || 0,
      performance: results.performance?.performanceScore || 0,
      social: results.socialNetwork?.socialInfluenceScore || 0,
      coldStart: results.coldStart?.recommendationReliability || 0
    };

    return Object.keys(weights).reduce((total, key) => {
      return total + (scores[key] * weights[key]);
    }, 0);
  }

  getScoreDescription(score) {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    if (score >= 0.2) return 'Poor';
    return 'Very Poor';
  }

  // Export analysis results
  exportAnalysisResults() {
    return this.analysisResults;
  }
}

// Convenience function for quick analysis
export async function quickKNNAnalysis(db, targetUserId, recommendations, startTime, endTime, neighbors) {
  const analyzer = new KNNAnalyzer(db);
  return await analyzer.runComprehensiveAnalysis(targetUserId, recommendations, startTime, endTime, neighbors);
}

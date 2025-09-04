// src/pages/KNNAnalysis.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import Layout from "../Layout";
import { KNNAnalyzer } from "../utils/knnAnalysis";
import { getSocialRecommendations } from "../services/socialRecs";
import { FaChartBar, FaUsers, FaRocket, FaNetworkWired, FaSnowflake, FaCog } from "react-icons/fa";

export default function KNNAnalysis() {
  const { currentUser } = useAuth();
  const [analysisResults, setAnalysisResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState('comprehensive');
  const [analysisHistory, setAnalysisHistory] = useState([]);

  const runAnalysis = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    const startTime = performance.now();
    
    try {
      const analyzer = new KNNAnalyzer(db);
      
      // Get recommendations first
      const apiKey = import.meta.env.VITE_TMDB_API_KEY;
      const recommendations = await getSocialRecommendations({
        db,
        uid: currentUser.uid,
        apiKey,
        limit: 18,
      });
      
      const endTime = performance.now();
      
      // Run comprehensive analysis
      const results = await analyzer.runComprehensiveAnalysis(
        currentUser.uid,
        recommendations,
        startTime,
        endTime,
        [] // neighbors will be calculated in the analysis
      );
      
      setAnalysisResults(results);
      
      // Add to history
      setAnalysisHistory(prev => [{
        timestamp: new Date().toLocaleString(),
        score: results.overallScore,
        type: selectedAnalysis
      }, ...prev.slice(0, 9)]);
      
    } catch (error) {
      console.error("Analysis error:", error);
    } finally {
      setLoading(false);
    }
  };

  const runSpecificAnalysis = async (analysisType) => {
    if (!currentUser) return;
    
    setLoading(true);
    
    try {
      const analyzer = new KNNAnalyzer(db);
      let results = {};
      
      switch (analysisType) {
        case 'similarity':
          results = await analyzer.analyzeUserSimilarity(currentUser.uid);
          break;
        case 'quality':
          const recommendations = await getSocialRecommendations({
            db,
            uid: currentUser.uid,
            apiKey: import.meta.env.VITE_TMDB_API_KEY,
            limit: 18,
          });
          results = await analyzer.analyzeRecommendationQuality(currentUser.uid, recommendations);
          break;
        case 'social':
          results = await analyzer.analyzeSocialNetwork(currentUser.uid);
          break;
        case 'coldstart':
          results = await analyzer.analyzeColdStart(currentUser.uid);
          break;
        default:
          return;
      }
      
      setAnalysisResults({ [analysisType]: results });
      
    } catch (error) {
      console.error("Specific analysis error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-blue-600';
    if (score >= 0.4) return 'text-yellow-600';
    if (score >= 0.2) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreDescription = (score) => {
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Fair';
    if (score >= 0.2) return 'Poor';
    return 'Very Poor';
  };

  if (!currentUser) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-lg text-gray-700">Please log in to access KNN analysis.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">KNN System Analysis</h1>
          <p className="text-gray-600">
            Comprehensive analysis of your K-Nearest Neighbors recommendation system performance.
          </p>
        </div>

        {/* Analysis Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex flex-wrap gap-4 items-center">
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FaCog className={loading ? 'animate-spin' : ''} />
              {loading ? 'Running Analysis...' : 'Run Comprehensive Analysis'}
            </button>
            
            <div className="flex gap-2">
              <button
                onClick={() => runSpecificAnalysis('similarity')}
                disabled={loading}
                className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50 flex items-center gap-2"
              >
                <FaUsers />
                User Similarity
              </button>
              <button
                onClick={() => runSpecificAnalysis('quality')}
                disabled={loading}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 disabled:opacity-50 flex items-center gap-2"
              >
                <FaChartBar />
                Recommendation Quality
              </button>
              <button
                onClick={() => runSpecificAnalysis('social')}
                disabled={loading}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50 flex items-center gap-2"
              >
                <FaNetworkWired />
                Social Network
              </button>
              <button
                onClick={() => runSpecificAnalysis('coldstart')}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
              >
                <FaSnowflake />
                Cold Start
              </button>
            </div>
          </div>
        </div>

        {/* Analysis History */}
        {analysisHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Analysis History</h2>
            <div className="space-y-2">
              {analysisHistory.map((analysis, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{analysis.timestamp}</span>
                    <span className="text-sm font-medium">{analysis.type}</span>
                  </div>
                  <span className={`font-semibold ${getScoreColor(analysis.score)}`}>
                    {analysis.score.toFixed(3)} ({getScoreDescription(analysis.score)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysisResults && (
          <div className="space-y-8">
            {/* Overall Score */}
            {analysisResults.overallScore && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <FaRocket />
                  Overall System Score
                </h2>
                <div className="text-center">
                  <div className={`text-6xl font-bold mb-2 ${getScoreColor(analysisResults.overallScore)}`}>
                    {analysisResults.overallScore.toFixed(3)}
                  </div>
                  <div className="text-xl text-gray-600 mb-4">
                    {getScoreDescription(analysisResults.overallScore)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold">Similarity</div>
                      <div className={getScoreColor(analysisResults.userSimilarity?.averageSimilarity || 0)}>
                        {(analysisResults.userSimilarity?.averageSimilarity || 0).toFixed(3)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">Quality</div>
                      <div className={getScoreColor(analysisResults.recommendationQuality?.diversityScore || 0)}>
                        {(analysisResults.recommendationQuality?.diversityScore || 0).toFixed(3)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">Performance</div>
                      <div className={getScoreColor(analysisResults.performance?.performanceScore || 0)}>
                        {(analysisResults.performance?.performanceScore || 0).toFixed(3)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">Social</div>
                      <div className={getScoreColor(analysisResults.socialNetwork?.socialInfluenceScore || 0)}>
                        {(analysisResults.socialNetwork?.socialInfluenceScore || 0).toFixed(3)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">Cold Start</div>
                      <div className={getScoreColor(analysisResults.coldStart?.recommendationReliability || 0)}>
                        {(analysisResults.coldStart?.recommendationReliability || 0).toFixed(3)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Detailed Results */}
            {Object.entries(analysisResults).map(([key, data]) => {
              if (key === 'overallScore' || key === 'timestamp' || key === 'targetUserId') return null;
              
              return (
                <div key={key} className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-4 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()} Analysis
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(data).map(([metric, value]) => {
                      if (typeof value === 'object' && value !== null) return null;
                      
                      return (
                        <div key={metric} className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-medium text-gray-600 capitalize">
                            {metric.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="text-lg font-semibold">
                            {typeof value === 'number' ? value.toFixed(3) : value}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Analysis Tips */}
        <div className="bg-blue-50 rounded-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Analysis Tips</h3>
          <div className="space-y-2 text-blue-800">
            <p>• <strong>Similarity Score:</strong> Higher values indicate better user matching</p>
            <p>• <strong>Quality Score:</strong> Measures recommendation diversity and relevance</p>
            <p>• <strong>Performance Score:</strong> Evaluates system speed and efficiency</p>
            <p>• <strong>Social Score:</strong> Assesses friend network effectiveness</p>
            <p>• <strong>Cold Start Score:</strong> Measures how well the system handles new users</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

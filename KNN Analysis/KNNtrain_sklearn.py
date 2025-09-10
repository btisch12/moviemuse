# pip install pandas openpyxl scikit-learn numpy
import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics import mean_squared_error, mean_absolute_error
from sklearn.model_selection import train_test_split
import json

def load_data():
    """Load data from Excel files (or CSV files)"""
    try:
        # Try to load from Excel files first
        ratings = pd.read_excel("ratings.xlsx")
        links = pd.read_excel("links.xlsx")
        print("Loaded data from Excel files")
    except FileNotFoundError:
        # Fallback to CSV files if Excel files don't exist
        ratings = pd.read_csv("ratings.csv")
        links = pd.read_csv("links.csv")
        print("Loaded data from CSV files")
    
    # Handle duplicates in ratings data
    print(f"Original ratings shape: {ratings.shape}")
    ratings = ratings.drop_duplicates(subset=['userId', 'movieId'], keep='last')
    print(f"After removing duplicates: {ratings.shape}")
    
    return ratings, links

def create_user_movie_matrix(ratings):
    """Create a user-movie rating matrix"""
    # Pivot the ratings to create a user-movie matrix
    # Handle duplicates by taking the last rating for each user-movie pair
    user_movie_matrix = ratings.pivot_table(
        index='userId', 
        columns='movieId', 
        values='rating', 
        aggfunc='last'  # Take the last rating if there are duplicates
    )
    
    # Fill NaN values with 0 (no rating)
    user_movie_matrix = user_movie_matrix.fillna(0)
    
    return user_movie_matrix

def train_knn_model(user_movie_matrix, k=40):
    """Train KNN model for user-based collaborative filtering"""
    # Use cosine similarity for KNN
    knn = NearestNeighbors(n_neighbors=k, metric='cosine', algorithm='brute')
    knn.fit(user_movie_matrix)
    
    return knn

def get_recommendations(user_movie_matrix, knn_model, user_id, n_recommendations=10):
    """Get movie recommendations for a specific user"""
    if user_id not in user_movie_matrix.index:
        return []
    
    # Get user's ratings
    user_ratings = user_movie_matrix.loc[user_id]
    
    # Find similar users
    user_idx = user_movie_matrix.index.get_loc(user_id)
    distances, indices = knn_model.kneighbors([user_movie_matrix.iloc[user_idx]])
    
    # Get movies that the user hasn't rated (rating = 0)
    unrated_movies = user_ratings[user_ratings == 0].index
    
    if len(unrated_movies) == 0:
        return []
    
    # Calculate predicted ratings based on similar users
    similar_users = user_movie_matrix.index[indices[0]]
    similar_user_ratings = user_movie_matrix.loc[similar_users, unrated_movies]
    
    # Weighted average based on similarity (inverse of distance)
    weights = 1 / (distances[0] + 1e-6)  # Add small epsilon to avoid division by zero
    predicted_ratings = np.average(similar_user_ratings, weights=weights, axis=0)
    
    # Create recommendations
    recommendations = []
    for movie_id, predicted_rating in zip(unrated_movies, predicted_ratings):
        if predicted_rating > 0:  # Only recommend movies with positive predicted ratings
            recommendations.append({
                'movieId': int(movie_id),
                'score': float(predicted_rating)
            })
    
    # Sort by predicted rating and take top N
    recommendations.sort(key=lambda x: x['score'], reverse=True)
    return recommendations[:n_recommendations]

def calculate_precision_recall_at_k(actual_ratings, predicted_recommendations, k=10, threshold=3.5):
    """Calculate Precision@k and Recall@k for a user"""
    # Get actual highly rated movies (above threshold)
    actual_high_rated = set(actual_ratings[actual_ratings >= threshold].index)
    
    # Get top-k predicted recommendations
    predicted_movies = set([rec['movieId'] for rec in predicted_recommendations[:k]])
    
    # Calculate intersection
    relevant_recommended = actual_high_rated.intersection(predicted_movies)
    
    # Calculate precision and recall
    precision = len(relevant_recommended) / len(predicted_movies) if len(predicted_movies) > 0 else 0
    recall = len(relevant_recommended) / len(actual_high_rated) if len(actual_high_rated) > 0 else 0
    
    return precision, recall

def evaluate_model(ratings, user_movie_matrix, knn_model, test_size=0.25, k=10):
    """Evaluate the model using train-test split with multiple metrics"""
    # Split data by user to ensure proper evaluation
    np.random.seed(42)
    
    # Get unique users
    unique_users = ratings['userId'].unique()
    test_users = np.random.choice(unique_users, size=int(len(unique_users) * test_size), replace=False)
    
    # Split ratings
    train_ratings = ratings[~ratings['userId'].isin(test_users)]
    test_ratings = ratings[ratings['userId'].isin(test_users)]
    
    print(f"Training on {len(train_ratings)} ratings from {len(unique_users) - len(test_users)} users")
    print(f"Testing on {len(test_ratings)} ratings from {len(test_users)} users")
    
    # Recreate user-movie matrix with only training data
    train_matrix = train_ratings.pivot_table(
        index='userId', 
        columns='movieId', 
        values='rating', 
        aggfunc='last'
    ).fillna(0)
    
    # Retrain model on training data
    train_knn = NearestNeighbors(n_neighbors=40, metric='cosine', algorithm='brute')
    train_knn.fit(train_matrix)
    
    # Evaluation metrics
    predictions = []
    actuals = []
    precision_scores = []
    recall_scores = []
    
    # Evaluate on test set
    for user_id in test_users:
        if user_id in train_matrix.index:
            # Get actual test ratings for this user
            user_test_ratings = test_ratings[test_ratings['userId'] == user_id]
            
            if len(user_test_ratings) > 0:
                # Get recommendations for this user
                user_recommendations = get_recommendations(train_matrix, train_knn, user_id, n_recommendations=k)
                
                # Calculate precision and recall
                user_actual_ratings = user_test_ratings.set_index('movieId')['rating']
                precision, recall = calculate_precision_recall_at_k(user_actual_ratings, user_recommendations, k=k)
                precision_scores.append(precision)
                recall_scores.append(recall)
                
                # Calculate RMSE and MAE for rated movies
                for _, row in user_test_ratings.iterrows():
                    movie_id = row['movieId']
                    actual_rating = row['rating']
                    
                    if movie_id in train_matrix.columns:
                        # Get prediction for this user-movie pair
                        user_idx = train_matrix.index.get_loc(user_id)
                        distances, indices = train_knn.kneighbors([train_matrix.iloc[user_idx]])
                        
                        similar_users = train_matrix.index[indices[0]]
                        similar_ratings = train_matrix.loc[similar_users, movie_id]
                        weights = 1 / (distances[0] + 1e-6)
                        predicted_rating = np.average(similar_ratings, weights=weights)
                        
                        predictions.append(predicted_rating)
                        actuals.append(actual_rating)
    
    # Calculate final metrics
    metrics = {}
    
    if len(predictions) > 0:
        metrics['RMSE'] = np.sqrt(mean_squared_error(actuals, predictions))
        metrics['MAE'] = mean_absolute_error(actuals, predictions)
        print(f"Evaluated {len(predictions)} predictions")
    
    if len(precision_scores) > 0:
        metrics['Precision@10'] = np.mean(precision_scores)
        metrics['Recall@10'] = np.mean(recall_scores)
        print(f"Evaluated precision/recall for {len(precision_scores)} users")
    
    return metrics

def main():
    # Load data
    ratings, links = load_data()
    
    # Create user-movie matrix
    user_movie_matrix = create_user_movie_matrix(ratings)
    print(f"Created user-movie matrix with {user_movie_matrix.shape[0]} users and {user_movie_matrix.shape[1]} movies")
    
    # Train KNN model
    knn_model = train_knn_model(user_movie_matrix, k=40)
    print("Trained KNN model")
    
    # Evaluate model
    metrics = evaluate_model(ratings, user_movie_matrix, knn_model, test_size=0.25, k=10)
    
    print("\n=== Model Performance ===")
    for metric, value in metrics.items():
        print(f"{metric}: {value:.4f}")
    
    # Generate recommendations for all users
    export = {}
    for user_id in user_movie_matrix.index:
        recommendations = get_recommendations(user_movie_matrix, knn_model, user_id, n_recommendations=10)
        
        # Map movieId to tmdbId using the links data
        mid2tmdb = dict(zip(links.movieId, links.tmdbId.fillna(-1).astype(int)))
        
        export[str(user_id)] = [
            {
                "movieId": rec["movieId"],
                "tmdbId": int(mid2tmdb.get(rec["movieId"], -1)),
                "score": rec["score"]
            }
            for rec in recommendations
            if mid2tmdb.get(rec["movieId"], None) not in (None, -1)
        ]
    
    # Save recommendations
    with open("knn_recs_sklearn.json", "w") as f:
        json.dump(export, f, indent=2)
    print("\nWrote knn_recs_sklearn.json")
    
    # Show sample recommendations for first user
    first_user = list(export.keys())[0]
    print(f"\nSample recommendations for user {first_user}:")
    for i, rec in enumerate(export[first_user][:5], 1):
        print(f"{i}. Movie ID: {rec['movieId']}, TMDB ID: {rec['tmdbId']}, Score: {rec['score']:.3f}")
    
    # Show summary statistics
    print(f"\n=== Summary ===")
    print(f"Total users: {len(export)}")
    print(f"Average recommendations per user: {np.mean([len(recs) for recs in export.values()]):.1f}")
    print(f"Total recommendations: {sum(len(recs) for recs in export.values())}")

if __name__ == "__main__":
    main()

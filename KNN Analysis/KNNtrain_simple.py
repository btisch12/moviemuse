# pip install pandas openpyxl scikit-learn numpy
import pandas as pd
import numpy as np
from sklearn.neighbors import NearestNeighbors
from sklearn.metrics import mean_squared_error, mean_absolute_error
import json

def load_data():
    """Load data from CSV files"""
    ratings = pd.read_csv("ratings.csv")
    links = pd.read_csv("links.csv")
    print(f"Loaded {len(ratings)} ratings from {ratings['userId'].nunique()} users and {ratings['movieId'].nunique()} movies")
    return ratings, links

def create_user_movie_matrix(ratings):
    """Create a user-movie rating matrix"""
    user_movie_matrix = ratings.pivot_table(
        index='userId', 
        columns='movieId', 
        values='rating', 
        aggfunc='last'
    ).fillna(0)
    return user_movie_matrix

def train_knn_model(user_movie_matrix, k=40):
    """Train KNN model for user-based collaborative filtering"""
    knn = NearestNeighbors(n_neighbors=k, metric='cosine', algorithm='brute')
    knn.fit(user_movie_matrix)
    return knn

def get_recommendations(user_movie_matrix, knn_model, user_id, n_recommendations=10):
    """Get movie recommendations for a specific user"""
    if user_id not in user_movie_matrix.index:
        return []
    
    user_ratings = user_movie_matrix.loc[user_id]
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
    weights = 1 / (distances[0] + 1e-6)
    
    # Calculate predicted ratings for each unrated movie
    recommendations = []
    for movie_id in unrated_movies:
        # Get ratings for this movie from similar users
        movie_ratings = similar_user_ratings[movie_id].values  # Convert to numpy array
        weights_array = weights  # Already numpy array
        
        # Only consider users who actually rated this movie (rating > 0)
        valid_mask = movie_ratings > 0
        valid_ratings = movie_ratings[valid_mask]
        valid_weights = weights_array[valid_mask]
        
        if len(valid_ratings) > 0:
            # Calculate weighted average
            predicted_rating = np.average(valid_ratings, weights=valid_weights)
            
            if predicted_rating > 0:
                recommendations.append({
                    'movieId': int(movie_id),
                    'score': float(predicted_rating)
                })
    
    # Sort by predicted rating and take top N
    recommendations.sort(key=lambda x: x['score'], reverse=True)
    return recommendations[:n_recommendations]

def evaluate_basic(ratings, user_movie_matrix, knn_model):
    """Basic evaluation using a random rating split"""
    # Use a simple random split of ratings (not users)
    np.random.seed(42)
    
    # Create a random mask for train/test split
    mask = np.random.rand(len(ratings)) < 0.8  # 80% train, 20% test
    train_ratings = ratings[mask]
    test_ratings = ratings[~mask]
    
    print(f"Training on {len(train_ratings)} ratings")
    print(f"Testing on {len(test_ratings)} ratings")
    
    # Create training matrix
    train_matrix = train_ratings.pivot_table(
        index='userId', 
        columns='movieId', 
        values='rating', 
        aggfunc='last'
    ).fillna(0)
    
    # Retrain model on training data only
    train_knn = NearestNeighbors(n_neighbors=40, metric='cosine', algorithm='brute')
    train_knn.fit(train_matrix)
    
    predictions = []
    actuals = []
    
    # Sample test ratings for evaluation (to avoid too many computations)
    test_sample = test_ratings.sample(n=min(1000, len(test_ratings)), random_state=42)
    
    for _, row in test_sample.iterrows():
        user_id = row['userId']
        movie_id = row['movieId']
        actual_rating = row['rating']
        
        # Only predict if user and movie exist in training data
        if user_id in train_matrix.index and movie_id in train_matrix.columns:
            try:
                # Get prediction using only training data
                user_idx = train_matrix.index.get_loc(user_id)
                distances, indices = train_knn.kneighbors([train_matrix.iloc[user_idx]])
                
                similar_users = train_matrix.index[indices[0]]
                similar_ratings = train_matrix.loc[similar_users, movie_id]
                
                # Only proceed if we have valid ratings from similar users
                valid_ratings = similar_ratings[similar_ratings > 0]
                if len(valid_ratings) > 0:
                    weights = 1 / (distances[0] + 1e-6)
                    valid_weights = weights[similar_ratings > 0]
                    predicted_rating = np.average(valid_ratings, weights=valid_weights)
                    
                    predictions.append(predicted_rating)
                    actuals.append(actual_rating)
            except:
                continue
    
    if len(predictions) > 0:
        rmse = np.sqrt(mean_squared_error(actuals, predictions))
        mae = mean_absolute_error(actuals, predictions)
        print(f"Evaluated {len(predictions)} predictions")
        return {'RMSE': rmse, 'MAE': mae}
    else:
        print("No valid predictions could be made")
        return {}

def main():
    # Load data
    ratings, links = load_data()
    
    # Create user-movie matrix
    user_movie_matrix = create_user_movie_matrix(ratings)
    print(f"Created user-movie matrix with {user_movie_matrix.shape[0]} users and {user_movie_matrix.shape[1]} movies")
    
    # Train KNN model
    knn_model = train_knn_model(user_movie_matrix, k=40)
    print("Trained KNN model")
    
    # Basic evaluation
    print("\nEvaluating model...")
    metrics = evaluate_basic(ratings, user_movie_matrix, knn_model)
    
    if metrics:
        print("\n=== Model Performance ===")
        for metric, value in metrics.items():
            print(f"{metric}: {value:.4f}")
    else:
        print("Could not calculate evaluation metrics")
    
    # Generate recommendations for all users
    print("\nGenerating recommendations...")
    export = {}
    for user_id in user_movie_matrix.index:
        recommendations = get_recommendations(user_movie_matrix, knn_model, user_id, n_recommendations=10)
        
        # Map movieId to tmdbId
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
    with open("knn_recs_simple.json", "w") as f:
        json.dump(export, f, indent=2)
    print("Wrote knn_recs_simple.json")
    
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

# pip install scikit-surprise pandas openpyxl
from surprise import Dataset, Reader, KNNBasic, accuracy
from surprise.model_selection import train_test_split
import pandas as pd, json
import numpy as np

# Load data from Excel files (or CSV files)
# You can use either format - just change the file extension and method
try:
    # Try to load from Excel files first
    ratings = pd.read_excel("ratings.xlsx")  # columns: userId,movieId,rating,timestamp
    links   = pd.read_excel("links.xlsx")    # columns: movieId,imdbId,tmdbId
    print("Loaded data from Excel files")
except FileNotFoundError:
    # Fallback to CSV files if Excel files don't exist
    ratings = pd.read_csv("ratings.csv")  # columns: userId,movieId,rating,timestamp
    links   = pd.read_csv("links.csv")    # columns: movieId,imdbId,tmdbId
    print("Loaded data from CSV files")

reader = Reader(rating_scale=(0.5, 5.0))
data = Dataset.load_from_df(ratings[['userId','movieId','rating']], reader)

trainset, testset = train_test_split(data, test_size=0.25, random_state=42)

# User-based KNN with cosine similarity + mean-centering
sim_options = {'name': 'cosine', 'user_based': True}
algo = KNNBasic(k=40, min_k=3, sim_options=sim_options, verbose=False)
algo.fit(trainset)

preds = algo.test(testset)
rmse = accuracy.rmse(preds, verbose=False)
mae  = accuracy.mae(preds,  verbose=False)
print({"RMSE": rmse, "MAE": mae})

# Build Top-N recommendations per user (exclude seen items)
from collections import defaultdict
def top_n(predictions, n=10):
    recs = defaultdict(list)
    for uid, iid, true_r, est, _ in predictions:
        recs[uid].append((iid, est))
    for uid in recs:
        recs[uid] = sorted(recs[uid], key=lambda x: x[1], reverse=True)[:n]
    return recs

# Re-score all pairs for Top-N (predict for all unknowns)
anti_testset = trainset.build_anti_testset()
full_preds = algo.test(anti_testset)
topn = top_n(full_preds, n=10)

# Calculate Precision@10 and Recall@10
def calculate_precision_recall_at_k(test_ratings, recommendations, k=10, threshold=3.5):
    """Calculate Precision@k and Recall@k for all users"""
    precision_scores = []
    recall_scores = []
    
    for user_id in recommendations:
        # Get actual highly rated movies for this user in test set
        user_test_ratings = test_ratings[test_ratings['userId'] == user_id]
        actual_high_rated = set(user_test_ratings[user_test_ratings['rating'] >= threshold]['movieId'])
        
        # Get top-k predicted recommendations
        predicted_movies = set([movie_id for movie_id, _ in recommendations[user_id][:k]])
        
        # Calculate intersection
        relevant_recommended = actual_high_rated.intersection(predicted_movies)
        
        # Calculate precision and recall
        precision = len(relevant_recommended) / len(predicted_movies) if len(predicted_movies) > 0 else 0
        recall = len(relevant_recommended) / len(actual_high_rated) if len(actual_high_rated) > 0 else 0
        
        precision_scores.append(precision)
        recall_scores.append(recall)
    
    return np.mean(precision_scores), np.mean(recall_scores)

# Convert testset back to DataFrame for evaluation
test_df = pd.DataFrame(testset, columns=['userId', 'movieId', 'rating'])
precision_at_10, recall_at_10 = calculate_precision_recall_at_k(test_df, topn, k=10)

print(f"Precision@10: {precision_at_10:.4f}")
print(f"Recall@10: {recall_at_10:.4f}")

# Map movieId -> tmdbId for your app
mid2tmdb = dict(zip(links.movieId, links.tmdbId.fillna(-1).astype(int)))
export = {
    str(user): [
        {"movieId": int(mid), "tmdbId": int(mid2tmdb.get(int(mid), -1)), "score": float(score)}
        for (mid, score) in items if mid2tmdb.get(int(mid), None) not in (None, -1)
    ]
    for user, items in topn.items()
}

with open("knn_recs_movieLens.json", "w") as f:
    json.dump(export, f, indent=2)
print("Wrote knn_recs_movieLens.json")

# Show summary statistics
print(f"\n=== Summary ===")
print(f"Total users: {len(export)}")
print(f"Average recommendations per user: {np.mean([len(recs) for recs in export.values()]):.1f}")
print(f"Total recommendations: {sum(len(recs) for recs in export.values())}")

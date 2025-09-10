import pandas as pd
import numpy as np

# Create sample ratings data
np.random.seed(42)
n_users = 100
n_movies = 50
n_ratings = 1000

# Generate sample ratings
user_ids = np.random.randint(1, n_users + 1, n_ratings)
movie_ids = np.random.randint(1, n_movies + 1, n_ratings)
ratings = np.random.choice([0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0], n_ratings)
timestamps = np.random.randint(1000000000, 1600000000, n_ratings)

# Create ratings DataFrame
ratings_df = pd.DataFrame({
    'userId': user_ids,
    'movieId': movie_ids,
    'rating': ratings,
    'timestamp': timestamps
})

# Create sample links data
movie_ids_links = list(range(1, n_movies + 1))
imdb_ids = [f"tt{np.random.randint(1000000, 9999999)}" for _ in range(n_movies)]
tmdb_ids = np.random.randint(1, 100000, n_movies)

links_df = pd.DataFrame({
    'movieId': movie_ids_links,
    'imdbId': imdb_ids,
    'tmdbId': tmdb_ids
})

# Save to Excel files
ratings_df.to_excel("ratings.xlsx", index=False)
links_df.to_excel("links.xlsx", index=False)

print("Created sample Excel files:")
print("- ratings.xlsx (contains user ratings)")
print("- links.xlsx (contains movie metadata)")
print("\nYou can now run KNNtrain.py with these Excel files!")

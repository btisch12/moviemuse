# Simple visualization script for KNN results
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import json
from collections import Counter

def load_data():
    """Load the data"""
    ratings = pd.read_csv("ratings.csv")
    with open("knn_recs_simple.json", "r") as f:
        recommendations = json.load(f)
    return ratings, recommendations

def create_simple_plots(ratings, recommendations):
    """Create simple but informative plots"""
    
    # Set up the figure
    fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(15, 12))
    fig.suptitle('KNN Recommendation System Analysis', fontsize=16, fontweight='bold')
    
    # 1. Rating Distribution
    rating_counts = ratings['rating'].value_counts().sort_index()
    ax1.bar(rating_counts.index, rating_counts.values, color='skyblue', alpha=0.7)
    ax1.set_title('Movie Rating Distribution', fontweight='bold')
    ax1.set_xlabel('Rating')
    ax1.set_ylabel('Count')
    ax1.grid(True, alpha=0.3)
    
    # 2. User Activity
    user_activity = ratings.groupby('userId').size()
    ax2.hist(user_activity.values, bins=30, color='lightgreen', alpha=0.7, edgecolor='black')
    ax2.set_title('Ratings per User', fontweight='bold')
    ax2.set_xlabel('Number of Ratings')
    ax2.set_ylabel('Number of Users')
    ax2.grid(True, alpha=0.3)
    
    # 3. Recommendation Scores
    all_scores = []
    for user_recs in recommendations.values():
        all_scores.extend([rec['score'] for rec in user_recs])
    
    ax3.hist(all_scores, bins=20, color='purple', alpha=0.7, edgecolor='black')
    ax3.set_title('Recommendation Score Distribution', fontweight='bold')
    ax3.set_xlabel('Score')
    ax3.set_ylabel('Count')
    ax3.grid(True, alpha=0.3)
    
    # 4. Model Performance
    metrics = ['RMSE', 'MAE']
    values = [0.9863, 0.7613]
    colors = ['#FF6B6B', '#4ECDC4']
    
    bars = ax4.bar(metrics, values, color=colors, alpha=0.7, edgecolor='black')
    ax4.set_title('Model Performance', fontweight='bold')
    ax4.set_ylabel('Error Value')
    ax4.grid(True, alpha=0.3)
    
    # Add value labels
    for bar, value in zip(bars, values):
        height = bar.get_height()
        ax4.text(bar.get_x() + bar.get_width()/2., height + 0.01,
                f'{value:.4f}', ha='center', va='bottom', fontweight='bold')
    
    plt.tight_layout()
    plt.savefig('knn_analysis_summary.png', dpi=300, bbox_inches='tight')
    plt.show()

def print_summary_stats(ratings, recommendations):
    """Print summary statistics"""
    print("\n" + "="*50)
    print("KNN RECOMMENDATION SYSTEM SUMMARY")
    print("="*50)
    
    # Data stats
    print(f"\n📊 DATA OVERVIEW:")
    print(f"   Total Ratings: {len(ratings):,}")
    print(f"   Unique Users: {ratings['userId'].nunique():,}")
    print(f"   Unique Movies: {ratings['movieId'].nunique():,}")
    print(f"   Average Rating: {ratings['rating'].mean():.2f}")
    
    # Recommendation stats
    total_recs = sum(len(recs) for recs in recommendations.values())
    print(f"\n🎯 RECOMMENDATIONS:")
    print(f"   Users with Recommendations: {len(recommendations):,}")
    print(f"   Total Recommendations: {total_recs:,}")
    print(f"   Average per User: {total_recs/len(recommendations):.1f}")
    
    # Score stats
    all_scores = []
    for user_recs in recommendations.values():
        all_scores.extend([rec['score'] for rec in user_recs])
    
    print(f"\n📈 SCORE ANALYSIS:")
    print(f"   Average Score: {np.mean(all_scores):.3f}")
    print(f"   Score Range: {min(all_scores):.3f} - {max(all_scores):.3f}")
    
    # Model performance
    print(f"\n🔬 MODEL PERFORMANCE:")
    print(f"   RMSE: 0.9863 (Good for MovieLens)")
    print(f"   MAE: 0.7613 (Reasonable performance)")
    print(f"   Predictions Tested: 906")
    
    print("\n" + "="*50)

def main():
    print("Creating KNN analysis visualizations...")
    
    # Load data
    ratings, recommendations = load_data()
    
    # Create plots
    print("Generating plots...")
    create_simple_plots(ratings, recommendations)
    
    # Print summary
    print_summary_stats(ratings, recommendations)
    
    print("\n✅ Visualization complete!")
    print("📁 Generated: knn_analysis_summary.png")

if __name__ == "__main__":
    main()

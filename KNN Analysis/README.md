# KNN Analysis with Excel Files

This project performs KNN-based movie recommendations and supports both Excel (.xlsx) and CSV file formats.

## Setup

### Option 1: Easy Installation (Recommended for Windows)
Install dependencies that work well on Windows:
```bash
pip install pandas openpyxl scikit-learn numpy
```

### Option 2: Full Installation (May have issues on Windows)
Install all dependencies including scikit-surprise:
```bash
pip install -r requirements.txt
```

**Note:** If you encounter installation issues with `scikit-surprise` on Windows, use Option 1 and run `KNNtrain_sklearn.py` instead.

## Adding Excel Files

### Option 1: Use Sample Data
Run the sample data generator:
```bash
python create_sample_excel.py
```
This creates `ratings.xlsx` and `links.xlsx` with sample data.

### Option 2: Use Your Own Excel Files
Create Excel files with the following structure:

**ratings.xlsx** should have columns:
- `userId`: User identifier (integer)
- `movieId`: Movie identifier (integer) 
- `rating`: Rating value (0.5 to 5.0)
- `timestamp`: Unix timestamp (optional)

**links.xlsx** should have columns:
- `movieId`: Movie identifier (integer)
- `imdbId`: IMDB identifier (string)
- `tmdbId`: TMDB identifier (integer)

## Running the Analysis

### Option 1: Using scikit-learn (Recommended for Windows)
```bash
python KNNtrain_sklearn.py
```

### Option 2: Using scikit-surprise (Original)
```bash
python KNNtrain.py
```

Both scripts will automatically detect and use Excel files if available, otherwise fall back to CSV files.

## Output

The analysis generates:
- `knn_recs_sklearn.json` (when using scikit-learn version)
- `knn_recs_movieLens.json` (when using scikit-surprise version)
- Console output with comprehensive evaluation metrics:
  - **RMSE** (Root Mean Square Error)
  - **MAE** (Mean Absolute Error)
  - **Precision@10** (Precision at top 10 recommendations)
  - **Recall@10** (Recall at top 10 recommendations)

## File Format Support

- ✅ Excel (.xlsx) files
- ✅ CSV files  
- ✅ Automatic format detection

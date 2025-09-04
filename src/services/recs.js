// src/services/recs.js
import { doc, getDoc } from "firebase/firestore";

const TMDB_BASE = "https://api.themoviedb.org/3";

async function tmdbJson(path, apiKey, params = "") {
  const url = `${TMDB_BASE}${path}?api_key=${apiKey}${params ? `&${params}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

async function fetchSimilar(contentId, apiKey, mediaType = 'movie') {
  const endpoint = mediaType === 'tv' ? `/tv/${contentId}/similar` : `/movie/${contentId}/similar`;
  const data = await tmdbJson(endpoint, apiKey, "page=1");
  return data.results ?? [];
}

async function fetchTrending(apiKey) {
  const [movieData, tvData] = await Promise.all([
    tmdbJson(`/trending/movie/week`, apiKey),
    tmdbJson(`/trending/tv/week`, apiKey)
  ]);
  
  const movies = (movieData.results || []).map(movie => ({
    ...movie,
    media_type: 'movie',
    title: movie.title
  }));
  
  const tvShows = (tvData.results || []).map(tv => ({
    ...tv,
    media_type: 'tv',
    title: tv.name
  }));
  
  return [...movies, ...tvShows];
}

async function getUserLists(db, uid) {
  // Pull user lists (IDs) to exclude from recs
  const getIds = async (col) => {
    const snap = await getDoc(doc(db, col, uid));
    return snap.exists() ? Object.keys(snap.data()).map(String) : [];
  };

  const [watchlist, watching, watched] = await Promise.all([
    getIds("watchlists"),
    getIds("watching"),
    getIds("watched"),
  ]);

  return {
    exclude: new Set([...watchlist, ...watching, ...watched]),
    // Also return watched separately for potential future use
    watched: new Set(watched),
  };
}

async function getUserWatched(db, uid) {
  const snap = await getDoc(doc(db, "watched", uid));
  if (!snap.exists()) return [];

  // watched doc: { [movieId]: { id, title, poster, rating, watchedAt } }
  const arr = Object.values(snap.data());
  // Sort: highest rating → most recent
  arr.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.watchedAt ?? 0) - (a.watchedAt ?? 0));
  return arr;
}

export async function getRecommendations({ db, uid, apiKey, limit = 18 }) {
  try {
    const [{ exclude, watched }, watchedArr] = await Promise.all([
      getUserLists(db, uid),
      getUserWatched(db, uid),
    ]);

    // Seed selection
    const seeds = watchedArr.slice(0, 3); // up to 3 strong signals

    let candidates = [];
    if (seeds.length > 0) {
      const allSimilar = await Promise.all(seeds.map((m) => fetchSimilar(m.id, apiKey, m.media_type || 'movie')));
      // Flatten and tag by occurrences
      const counts = new Map(); // id -> {content, count}
      for (const list of allSimilar) {
        for (const m of list) {
          if (!m || !m.id) continue;
          const key = `${m.media_type || 'movie'}_${m.id}`;
          const entry = counts.get(key) || { content: m, count: 0 };
          entry.count += 1;
          counts.set(key, entry);
        }
      }
      candidates = Array.from(counts.values()).map(({ content, count }) => ({
        ...content,
        _seedHits: count,
      }));
    } else {
      // Cold start
      candidates = await fetchTrending(apiKey);
      candidates = candidates.map((m) => ({ ...m, _seedHits: 0 }));
    }

    // Filter out anything user already has (including watched content)
    candidates = candidates.filter((m) => {
      const key = m.media_type === 'tv' ? `tv_${m.id}` : String(m.id);
      return !exclude.has(key);
    });

    // Score & sort
    const scored = candidates.map((m) => {
      const vote = m.vote_average || 0;
      const pop = m.popularity || 0;
      const seedHits = m._seedHits || 0;
      // simple linear score
      const score = seedHits * 2 + vote * 0.7 + Math.min(pop, 200) * 0.01;
      return { ...m, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);

    // Return trimmed & normalized shape you already use
    return scored.slice(0, limit).map((m) => ({
      id: m.id,
      title: m.title,
      poster_path: m.poster_path,
      vote_average: m.vote_average,
      overview: m.overview,
      popularity: m.popularity,
      media_type: m.media_type || 'movie',
    }));
  } catch (e) {
    console.error("getRecommendations error:", e);
    return [];
  }
}

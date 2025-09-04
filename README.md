# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.


# 🎬 MovieMuse

MovieMuse is a social movie and TV tracking web app that lets users discover, rate, and share what they’re watching. Built with React, Firebase, and the TMDB API, the app provides personalized recommendations, watchlists, and social features similar to Goodreads — but for movies.

---

## 📖 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Usage](#usage)
- [Architecture](#architecture)
- [Roadmap / Future Work](#roadmap--future-work)
- [Acknowledgments](#acknowledgments)
- [License](#license)

---

## 🔎 Overview
MovieMuse was developed as a Master’s in Computer Science capstone project.  
The goal of this project is to create a clean, user-friendly platform for tracking movies and TV shows while exploring **recommendation systems, real-time databases, and scalable app design**.

---

## ✨ Features
- 🔑 **User Authentication** (Firebase Email/Password + Google login)
- 📺 **Movie & TV Search** powered by TMDB API
- ⭐ **Lists**: Watchlist, Watching, and Watched
- 📝 **Reviews & Ratings** with star system and comments
- 👥 **Social Features**: Follow users, view activity feed, friend requests
- 🎯 **Recommendations**: Personalized suggestions based on trending + user data
- 📱 **Responsive UI** with Tailwind + shadcn/ui

---

## 📸 Screenshots
> Add images or GIFs here (e.g., Home Page, Search, Movie Detail, Profile, Activity Feed)

Example:
![MovieMuse Home](./screenshots/home.png)
![Movie Detail](./screenshots/movie-detail.png)

---

## 🛠 Tech Stack
- **Frontend:** React.js, React Router, Tailwind CSS, shadcn/ui  
- **Backend & Database:** Firebase Authentication, Firebase Firestore  
- **APIs:** [TMDB API](https://www.themoviedb.org/documentation/api)  
- **Recommendation Engine:** K-Nearest Neighbors (KNN) with MovieLens dataset  
- **Hosting:** Firebase Hosting  

---

## ⚡ Installation

### 1. Clone the repository
```bash
git clone https://github.com/your-username/moviemuse.git
cd moviemuse

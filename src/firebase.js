// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBlo7yANPV9JcsQEhPVLZrg4_QAwONmG6E",
  authDomain: "moviemuse-a67d2.firebaseapp.com",
  projectId: "moviemuse-a67d2",
  storageBucket: "moviemuse-a67d2.firebasestorage.app",
  messagingSenderId: "127586314426",
  appId: "1:127586314426:web:6951550c1fcfdedaf27a83"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, collection, query, where, getDocs } from "firebase/firestore";
import Layout from "../Layout";

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const usernameExists = async (name) => {
    try {
      console.log("Checking username:", name);
      const q = query(collection(db, "users"), where("username", "==", name));
      const snapshot = await getDocs(q);
      console.log("Username check result:", !snapshot.empty);
      return !snapshot.empty;
    } catch (error) {
      console.error("Username check error:", error);
      throw error;
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    
    console.log("Starting registration process...");

    try {
      // Skip username check 
      console.log("Creating user account...");
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      console.log("User created successfully:", user.uid);

      console.log("Saving user data to Firestore...");
      
      // Save user data
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        username: username,
        bio: "",
        profilePicture: "",
        friends: [],
        blocked: [],
        sentRequests: [],
        receivedRequests: [],
        createdAt: Date.now(),
      });
      
      // Save username mapping for search functionality
      await setDoc(doc(db, "users", "usernames"), {
        [username]: user.uid
      }, { merge: true });
      
      console.log("User data saved successfully");

      alert("Account created!");
              navigate("/dashboard");
    } catch (err) {
      console.error("Registration error:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      
      // Provide more user-friendly error messages
      let errorMessage = "Registration failed. Please try again.";
      
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = "An account with this email already exists.";
      } else if (err.code === 'auth/weak-password') {
        errorMessage = "Password should be at least 6 characters long.";
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = "Email/password accounts are not enabled. Please contact support.";
      } else if (err.code === 'permission-denied') {
        errorMessage = "Permission denied. Please check your Firebase configuration.";
      }
      
      setError(errorMessage);
    }
  };

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-12 p-6 bg-white rounded shadow">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">Create an Account</h1>

        <form onSubmit={handleRegister} className="space-y-4">
          <input
            type="text"
            placeholder="Choose a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Register
          </button>
        </form>
      </div>
    </Layout>
  );
}

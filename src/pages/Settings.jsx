import { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Layout from "../Layout";
import { Button } from "../components/ui/button"; // shadcn button

export default function Settings() {
  const { currentUser } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!currentUser) return;

    const fetchUserData = async () => {
      const userRef = doc(db, "users", currentUser.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUsername(data.username || "");
        setEmail(currentUser.email || "");
      }
    };

    fetchUserData();
  }, [currentUser]);

  const handleUsernameSave = async () => {
    const userRef = doc(db, "users", currentUser.uid);
    await setDoc(userRef, { username }, { merge: true });
    alert("Username updated!");
  };

  const handleResetPassword = async () => {
    try {
      await currentUser.sendPasswordResetEmail(currentUser.email); // only works if using Firebase Auth email/password
      alert("Password reset email sent!");
    } catch (error) {
      alert("Failed to send reset email. You may need to do it from the login screen.");
    }
  };

  if (!currentUser) {
    return (
      <Layout>
        <div className="text-center py-12 text-gray-600">Please log in to access settings.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-12 p-6 bg-white dark:bg-gray-900 rounded shadow">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800 dark:text-white">
          Account Settings
        </h1>

        <div className="space-y-6">
          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Email
            </label>
            <input
              type="text"
              value={email}
              readOnly
              className="w-full px-4 py-2 border rounded bg-gray-100 text-gray-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border rounded"
            />
            <Button onClick={handleUsernameSave} className="mt-3 w-full">
              Save Username
            </Button>
          </div>

          <div>
            <label className="block font-semibold mb-1 text-gray-700 dark:text-gray-200">
              Reset Password
            </label>
            <Button onClick={handleResetPassword} className="w-full bg-red-500 hover:bg-red-600">
              Send Reset Email
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

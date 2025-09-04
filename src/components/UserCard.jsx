import { useEffect, useState } from "react";
import { db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { useAuth } from "../AuthContext";

export default function UserCard({ user }) {
  const { currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!currentUser || !user?.uid) return;
      const docRef = doc(db, "following", currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setIsFollowing(docSnap.data().uids?.includes(user.uid));
      }
    };

    checkFollowStatus();
  }, [currentUser, user]);

  const toggleFollow = async () => {
    const followingRef = doc(db, "following", currentUser.uid);
    const followersRef = doc(db, "followers", user.uid);

    if (isFollowing) {
      await updateDoc(followingRef, { uids: arrayRemove(user.uid) });
      await updateDoc(followersRef, { uids: arrayRemove(currentUser.uid) });
    } else {
      await setDoc(followingRef, { uids: arrayUnion(user.uid) }, { merge: true });
      await setDoc(followersRef, { uids: arrayUnion(currentUser.uid) }, { merge: true });
    }

    setIsFollowing((prev) => !prev);
  };

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg shadow-sm bg-white">
      <div>
        <p className="font-semibold">{user.displayName || "Unknown User"}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>
      <button
        onClick={toggleFollow}
        className={`px-3 py-1 rounded text-sm font-medium ${
          isFollowing
            ? "bg-gray-300 text-black hover:bg-gray-400"
            : "bg-blue-500 text-white hover:bg-blue-600"
        }`}
      >
        {isFollowing ? "Unfollow" : "Follow"}
      </button>
    </div>
  );
}

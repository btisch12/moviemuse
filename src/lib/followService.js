import { doc, setDoc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "../firebase";

// Follow a user
export const followUser = async (currentUserId, targetUserId) => {
  const currentRef = doc(db, "followers", currentUserId);
  const targetRef = doc(db, "followers", targetUserId);

  await Promise.all([
    setDoc(currentRef, { following: { [targetUserId]: true } }, { merge: true }),
    setDoc(targetRef, { followers: { [currentUserId]: true } }, { merge: true }),
  ]);
};

// Unfollow a user
export const unfollowUser = async (currentUserId, targetUserId) => {
  const currentRef = doc(db, "followers", currentUserId);
  const targetRef = doc(db, "followers", targetUserId);

  await Promise.all([
    updateDoc(currentRef, { [`following.${targetUserId}`]: deleteField() }),
    updateDoc(targetRef, { [`followers.${currentUserId}`]: deleteField() }),
  ]);
};

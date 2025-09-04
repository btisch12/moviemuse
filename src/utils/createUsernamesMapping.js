import { db } from "../firebase";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";

// This function creates the usernames mapping for existing users
export const createUsernamesMapping = async () => {
  try {
    console.log("Creating usernames mapping...");
    
    // Get all users
    const usersCollection = collection(db, "users");
    const usersSnapshot = await getDocs(usersCollection);
    
    const usernamesMapping = {};
    
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.username && userData.uid) {
        usernamesMapping[userData.username] = userData.uid;
        console.log(`Mapped ${userData.username} to ${userData.uid}`);
      }
    });
    
    // Save the mapping
    await setDoc(doc(db, "users", "usernames"), usernamesMapping);
    
    console.log("Usernames mapping created successfully!");
    console.log("Total mappings:", Object.keys(usernamesMapping).length);
    
    return usernamesMapping;
  } catch (error) {
    console.error("Error creating usernames mapping:", error);
    throw error;
  }
};

// This function checks if the usernames mapping exists
export const checkUsernamesMapping = async () => {
  try {
    const usernamesRef = doc(db, "users", "usernames");
    const usernamesSnap = await getDoc(usernamesRef);
    
    if (usernamesSnap.exists()) {
      const data = usernamesSnap.data();
      console.log("Usernames mapping exists with", Object.keys(data).length, "entries");
      console.log("Usernames:", Object.keys(data));
      return data;
    } else {
      console.log("No usernames mapping found");
      return null;
    }
  } catch (error) {
    console.error("Error checking usernames mapping:", error);
    return null;
  }
};

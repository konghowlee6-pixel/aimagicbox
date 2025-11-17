
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log("✅ Firebase configuration loaded successfully");
console.log("✅ Auth domain:", firebaseConfig.authDomain);

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Email/Password Authentication Functions
export async function signInWithEmail(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log("✅ Email sign-in successful:", userCredential.user.email);
    return userCredential.user;
  } catch (error: any) {
    console.error("❌ Email sign-in error:", error);
    throw error;
  }
}

export async function signUpWithEmail(email: string, password: string, displayName?: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Update profile with display name if provided
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    console.log("✅ Email sign-up successful:", userCredential.user.email);
    return userCredential.user;
  } catch (error: any) {
    console.error("❌ Email sign-up error:", error);
    throw error;
  }
}

export async function resetPassword(email: string) {
  try {
    await sendPasswordResetEmail(auth, email);
    console.log("✅ Password reset email sent to:", email);
  } catch (error: any) {
    console.error("❌ Password reset error:", error);
    throw error;
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
    console.log("✅ User signed out successfully");
  } catch (error: any) {
    console.error("❌ Sign out error:", error);
    throw error;
  }
}

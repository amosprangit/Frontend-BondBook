// services/firebaseInit.ts
import { getApps, initializeApp } from "@react-native-firebase/app";
import { Platform } from "react-native";

console.log("========================================");
console.log("🔍 DEBUG: firebaseInit.ts is loading...");
console.log("📱 Platform:", Platform.OS);
console.log("📦 getApps() BEFORE init:", getApps());

const firebaseConfig = {
  apiKey: "AIzaSyC9i4AY5x1xiX6b40Q5ALH-Vsma1aRp8Uo",
  authDomain: "bondbook-46c02.firebaseapp.com",
  projectId: "bondbook-46c02",
  storageBucket: "bondbook-46c02.firebasestorage.app",
  messagingSenderId: "853348218920",
  appId: "1:853348218920:android:da063f65e064b879de1d1d",
};

console.log("📋 Config loaded:", firebaseConfig);

// Initialize Firebase if not already initialized
if (!getApps().length) {
  try {
    initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized successfully!");
  } catch (error) {
    console.error("❌ Firebase initialization error:", error);
  }
} else {
  console.log("✅ Firebase already initialized, apps:", getApps());
}

console.log("========================================");

// ✅ EXPORT THIS FUNCTION - FIX THE ERROR
export const ensureFirebaseInitialized = () => {
  if (!getApps().length) {
    console.warn("⚠️ Firebase not initialized, initializing now...");
    initializeApp(firebaseConfig);
  }
  return true;
};

import { initializeApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyA3rB7rKIrfdJzCnFdnGvk25n0rd_hHI7M",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "kabutech-hiyas.firebaseapp.com",
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || "https://kabutech-hiyas-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "kabutech-hiyas",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "kabutech-hiyas.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "528459633948",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:528459633948:web:77f88776ee7366827cd6d9",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-T4NCN14Z4D"
};

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getDatabase(app);

import { initializeApp } from 'firebase/app';
// @ts-ignore
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyA3rB7rKIrfdJzCnFdnGvk25n0rd_hHI7M",
  authDomain: "kabutech-hiyas.firebaseapp.com",
  databaseURL: "https://kabutech-hiyas-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "kabutech-hiyas",
  storageBucket: "kabutech-hiyas.firebasestorage.app",
  messagingSenderId: "528459633948",
  appId: "1:528459633948:web:77f88776ee7366827cd6d9",
  measurementId: "G-T4NCN14Z4D"
};

const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getDatabase(app);

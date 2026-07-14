import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAnalytics } from "firebase/analytics"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyCLQFdlbhbIOFNPG0l7jHQFP5imYQ42m5M",
  authDomain: "memio-605ac.firebaseapp.com",
  projectId: "memio-605ac",
  storageBucket: "memio-605ac.firebasestorage.app",
  messagingSenderId: "568755971989",
  appId: "1:568755971989:web:d4d2c5a98e414bf731789c",
  measurementId: "G-EJEQC6ZT9Q"
}

import { getStorage } from "firebase/storage"

// Initialize Firebase
const app = initializeApp(firebaseConfig)
typeof window !== 'undefined' ? getAnalytics(app) : null
export const db = getFirestore(app)
export const auth = getAuth(app)
export const storage = getStorage(app)

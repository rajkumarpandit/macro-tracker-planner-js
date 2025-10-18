// Import Firebase modules
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDv6SMyi6odYTRYN7SYJ5lYsk2mIpEyr4Q",
  authDomain: "macro-tracker-and-planner.firebaseapp.com",
  projectId: "macro-tracker-and-planner",
  storageBucket: "macro-tracker-and-planner.appspot.com",
  messagingSenderId: "639766321681",
  appId: "1:639766321681:web:3390eb8e094be440b2efb0",
  measurementId: "G-6R9NSS475H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };

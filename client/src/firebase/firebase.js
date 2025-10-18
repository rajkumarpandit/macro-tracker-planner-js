// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDv6SMyi6odYTRYN7SYJ5lYsk2mIpEyr4Q",
  authDomain: "macro-tracker-and-planner.firebaseapp.com",
  projectId: "macro-tracker-and-planner",
  storageBucket: "macro-tracker-and-planner.firebasestorage.app",
  messagingSenderId: "639766321681",
  appId: "1:639766321681:web:3390eb8e094be440b2efb0",
  measurementId: "G-6R9NSS475H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db };

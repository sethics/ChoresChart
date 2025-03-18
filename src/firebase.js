// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBJqwxcsLHCdyE2xGOfj1srMCuzkp5V_yM",
  authDomain: "choreschart-fa06a.firebaseapp.com",
  projectId: "choreschart-fa06a",
  storageBucket: "choreschart-fa06a.appspot.com",
  messagingSenderId: "318440427047",
  appId: "1:318440427047:web:7cad1d08159e48b1680802"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };

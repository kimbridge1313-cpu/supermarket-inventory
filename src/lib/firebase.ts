import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCWHo5rAwLZPbD1k2jqJXPtB8G6jCILGXI",
  authDomain: "supermarket-inventory-9d1cd.firebaseapp.com",
  projectId: "supermarket-inventory-9d1cd",
  storageBucket: "supermarket-inventory-9d1cd.firebasestorage.app",
  messagingSenderId: "796755725790",
  appId: "1:796755725790:web:5bf1bcf7ffc3c16a33214f",
  measurementId: "G-QECC031DYP",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; // Добавьте этот импорт
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBwfCaoWHMazVVCi7fMW1S2brPDcse8Bzw",
  authDomain: "mach-fb4d1.firebaseapp.com",
  projectId: "mach-fb4d1",
  storageBucket: "mach-fb4d1.firebasestorage.app",
  messagingSenderId: "962784067519",
  appId: "1:962784067519:web:01307ebf50d70fc4f9eb0a",
  measurementId: "G-9EDL8T5216"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app); // Создайте database instance

// Экспортируйте database явно
export { database };
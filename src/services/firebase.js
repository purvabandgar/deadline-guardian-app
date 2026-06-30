import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCDKB6CwopT2zHo3N7Ov95wEd-ZGF6Quww",
  authDomain: "deadline-guardian-ai-1204e.firebaseapp.com",
  projectId: "deadline-guardian-ai-1204e",
  storageBucket: "deadline-guardian-ai-1204e.firebasestorage.app",
  messagingSenderId: "223766038351",
  appId: "1:223766038351:web:4af54b59318c284c6ae73a"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
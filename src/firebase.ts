import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD_liHKxY4WEgk08Al4B2oDZ0kOwarGN88",
  authDomain: "pmgra-466a2.firebaseapp.com",
  projectId: "pmgra-466a2",
  storageBucket: "pmgra-466a2.firebasestorage.app",
  messagingSenderId: "414114339424",
  appId: "1:414114339424:web:9d3b04f1fff449d7d28105"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Use emulator if we are running locally
if (import.meta.env.DEV) {
  connectFirestoreEmulator(db, 'localhost', 8080);
  connectAuthEmulator(auth, 'http://localhost:9099');
}

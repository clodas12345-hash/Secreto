import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

const firebaseConfig = {
  projectId: "adept-figure-463322-r2",
  appId: "1:743166930754:web:3a68e1e19835829d5c22db",
  apiKey: "AIzaSyAvDwqeL3mu-vghn5GKkabuLPChw23BAww",
  authDomain: "adept-figure-463322-r2.firebaseapp.com",
  storageBucket: "adept-figure-463322-r2.firebasestorage.app",
  messagingSenderId: "743166930754",
  measurementId: "",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Enable offline persistence so getDoc works seamlessly even when offline
enableIndexedDbPersistence(db).catch((err) => {
  console.warn('Firestore persistence warning:', err.code);
});

export const auth = getAuth(app);

import { useEffect } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '../lib/firebase';

export default function TestAuth() {
  useEffect(() => {
    signInAnonymously(auth).then(() => console.log("Anon success")).catch(e => console.error("Anon failed:", e.code));
  }, []);
  return null;
}

import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Vault from './components/Vault';

export default function App() {
  const [cloudUser, setCloudUser] = useState<any>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCloudUser(user);
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.encryptedData) {
              localStorage.setItem('vault_data', data.encryptedData);
            }
          }
        } catch (err) {
          console.warn('Firestore sync skipped (offline mode active):', err);
        }
      }
    });
    return unsub;
  }, []);

  return (
    <Vault onLogout={() => {}} userPin="default" cloudUserId={cloudUser?.uid} />
  );
}

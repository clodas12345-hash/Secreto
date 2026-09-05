import { useState, useEffect } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Auth from './components/Auth';
import Vault from './components/Vault';

export default function App() {
  const [cloudUser, setCloudUser] = useState<any>(null);
  const [authState, setAuthState] = useState<'unauthenticated' | 'authenticated'>('unauthenticated');
  const [activePin, setActivePin] = useState('default');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCloudUser(user);
      if (user) {
        // Fetch encrypted vault data from Firestore
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

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleVisibilityChange = () => {
      // Do not auto-lock if user is picking files/photos from gallery or camera
      if (sessionStorage.getItem('is_picking_file') === 'true') {
        return;
      }

      if (document.visibilityState === 'hidden') {
        timeoutId = setTimeout(() => {
          if (sessionStorage.getItem('is_picking_file') !== 'true') {
            setAuthState('unauthenticated');
          }
        }, 300000); // 5 minutos de tolerancia
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    const handleFocus = () => {
      // Clear picking flag shortly after returning to window focus
      setTimeout(() => {
        sessionStorage.removeItem('is_picking_file');
      }, 4000);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const handleLogout = async () => {
    setAuthState('unauthenticated');
  };

  return (
    <>
      {authState === 'unauthenticated' && (
        <Auth onAuthenticate={(pin) => { setActivePin(pin); setAuthState('authenticated'); }} />
      )}
      {authState === 'authenticated' && (
        <Vault onLogout={handleLogout} userPin={activePin} cloudUserId={cloudUser?.uid} />
      )}
    </>
  );
}

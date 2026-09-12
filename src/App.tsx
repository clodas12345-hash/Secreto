import { useState, useEffect, useCallback, useRef } from 'react';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Vault from './components/Vault';
import LockScreen from './components/LockScreen';
import Game from './components/Game';

export default function App() {
  const [cloudUser, setCloudUser] = useState<any>(null);

  // Security Layer State: starts locked every time the app opens
  const [isLocked, setIsLocked] = useState(true);
  const [isDuressMode, setIsDuressMode] = useState(false);
  const [currentMasterPassword, setCurrentMasterPassword] = useState<string>(() => {
    return (
      localStorage.getItem('app_master_password') ||
      localStorage.getItem('vault_pin') ||
      localStorage.getItem('app_pin') ||
      ''
    );
  });

  const lastActivityRef = useRef<number>(Date.now());

  // Listen to Firebase Auth state
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

  // Handle successful unlock from LockScreen
  const handleUnlock = (passwordUsed: string) => {
    setCurrentMasterPassword(passwordUsed);
    setIsLocked(false);
    setIsDuressMode(false);
    lastActivityRef.current = Date.now();
  };

  // Handle Duress PIN entered
  const handleDuressUnlock = () => {
    setIsDuressMode(true);
    setIsLocked(false);
  };

  // Lock the application
  const handleLock = useCallback(() => {
    setIsLocked(true);
    setIsDuressMode(false);
  }, []);

  // Update password in App state when changed inside Vault Settings
  const handleMasterPasswordChange = (newPass: string) => {
    setCurrentMasterPassword(newPass);
  };

  // Auto-lock timer and visibility listener
  useEffect(() => {
    if (isLocked || isDuressMode) return;

    const getAutoLockSetting = () => {
      return localStorage.getItem('auto_lock_time') || '5m';
    };

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Listen to user interactions
    window.addEventListener('mousemove', handleUserActivity, { passive: true });
    window.addEventListener('mousedown', handleUserActivity, { passive: true });
    window.addEventListener('keydown', handleUserActivity, { passive: true });
    window.addEventListener('touchstart', handleUserActivity, { passive: true });
    window.addEventListener('scroll', handleUserActivity, { passive: true });

    // Inactivity interval check
    const interval = setInterval(() => {
      const setting = getAutoLockSetting();
      if (setting === 'never') return;

      let timeoutMs = 5 * 60 * 1000; // default 5m
      if (setting === 'immediate') timeoutMs = 60 * 1000;
      else if (setting === '1m') timeoutMs = 1 * 60 * 1000;
      else if (setting === '5m') timeoutMs = 5 * 60 * 1000;
      else if (setting === '15m') timeoutMs = 15 * 60 * 1000;

      if (Date.now() - lastActivityRef.current > timeoutMs) {
        handleLock();
      }
    }, 10000);

    // Visibility change handler (lock when user leaves tab/app if set to immediate)
    const handleVisibilityChange = () => {
      const setting = getAutoLockSetting();
      if (setting === 'immediate' && document.visibilityState === 'hidden') {
        handleLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, [isLocked, isDuressMode, handleLock]);

  // If Duress mode was triggered, show camouflage Game
  if (isDuressMode) {
    return (
      <Game 
        onHiddenEscape={() => {
          setIsDuressMode(false);
          setIsLocked(true);
        }} 
      />
    );
  }

  // If locked, always show the Security Lock Screen
  if (isLocked) {
    return (
      <LockScreen
        onUnlock={handleUnlock}
        onDuressUnlock={handleDuressUnlock}
      />
    );
  }

  // When unlocked, render the protected Vault
  return (
    <Vault 
      onLogout={handleLock} 
      userPin={currentMasterPassword || 'default'} 
      cloudUserId={cloudUser?.uid}
      onMasterPasswordChange={handleMasterPasswordChange}
    />
  );
}

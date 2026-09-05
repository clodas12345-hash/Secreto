const fs = require('fs');

const code = `import { Lock, ScanFace, Delete } from "lucide-react";
import { useState, useRef, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface AuthProps {
  onAuthenticate: (pin: string) => void;
  error?: string;
}

export default function Auth({ onAuthenticate, error }: AuthProps) {
  const isFirstRun = !localStorage.getItem('app_pin');
  const [pin, setPin] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [localError, setLocalError] = useState('');
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const hasPrompted = localStorage.getItem('biometric_prompted');
    if (!hasPrompted) {
      setShowBiometricPrompt(true);
    }
  }, []);

  const handleBiometricChoice = (allow: boolean) => {
    localStorage.setItem('biometric_prompted', 'true');
    localStorage.setItem('biometric_enabled', allow ? 'true' : 'false');
    setShowBiometricPrompt(false);
  };

  const handleKeyPress = (num: number) => {
    if (pin.length < 8) {
      setPin(prev => prev + num.toString());
      setLocalError('');
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setLocalError('');
  };

  const logAttempt = (pinUsed: string, success: boolean, isDuress: boolean, photoBase64: string | null = null) => {
    const attempts = JSON.parse(localStorage.getItem('access_attempts') || '[]');
    attempts.unshift({
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString('pt-BR'),
      pinUsed,
      success,
      isDuress,
      photoBase64
    });
    localStorage.setItem('access_attempts', JSON.stringify(attempts.slice(0, 50)));
  };

  const captureIntruder = async () => {
    let isCovered = false;
    let photo = null;
    let hasCameraError = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        await new Promise(resolve => {
            videoRef.current!.onloadedmetadata = () => {
                setTimeout(resolve, 1500);
            };
            setTimeout(resolve, 2000);
        });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context && videoRef.current.videoWidth > 0) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          let brightnessSum = 0;
          for (let i = 0; i < data.length; i += 4) {
            brightnessSum += (data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114);
          }
          
          const avgBrightness = brightnessSum / (data.length / 4);
          if (avgBrightness < 35) isCovered = true;
          
          photo = canvas.toDataURL('image/jpeg', 0.6);
        }
        stream.getTracks().forEach((track) => track.stop());
      }
    } catch (err) {
      console.error("Camera access denied", err);
      hasCameraError = true;
    }
    return { hasCameraError, isCovered, photo };
  };

  const handleUnlock = async () => {
    if (isScanning || pin.length === 0) return;
    setLocalError('');
    setIsScanning(true);
    
    const savedPin = localStorage.getItem('app_pin');
    const duressPin = localStorage.getItem('duress_pin') || '0000';
    const cleanPin = pin.trim();
    const isDuress = cleanPin === duressPin;

    const email = \`u\${cleanPin}@ft.com\`;
    const password = \`Vault_\${cleanPin}_2026!\`;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      if (!isDuress) localStorage.setItem('app_pin', cleanPin);
      logAttempt(cleanPin, true, isDuress);
      onAuthenticate(cleanPin);
    } catch (e: any) {
      console.error('Sign In Error:', e.code);
      
      // First run scenario
      if (!savedPin && !isDuress) {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
        } catch(err) {
          console.error("Firebase create failed, falling back to local only", err);
        }
        localStorage.setItem('app_pin', cleanPin);
        logAttempt(cleanPin, true, false);
        onAuthenticate(cleanPin);
        return;
      }
      
      // Offline fallback
      if (savedPin && (cleanPin === savedPin || isDuress)) {
        logAttempt(cleanPin, true, isDuress);
        onAuthenticate(cleanPin);
      } else {
        const { photo } = await captureIntruder();
        logAttempt(cleanPin, false, false, photo);
        setIsScanning(false);
        setLocalError('PIN incorreto');
        setPin('');
      }
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950 text-white selection:bg-blue-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950 to-zinc-950" />
      
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />

      {showBiometricPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl">
            <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
              <ScanFace className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-white font-medium mb-3 text-lg">Permitir Biometria</h3>
            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
              Deseja permitir o uso de biometria para agilizar seus próximos acessos ao cofre?
            </p>
            <div className="flex gap-4">
              <button onClick={() => handleBiometricChoice(false)} className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl font-medium text-sm hover:bg-zinc-700 transition-colors">
                Não
              </button>
              <button onClick={() => handleBiometricChoice(true)} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all">
                Permitir
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-xs flex flex-col items-center">
        
        <div className="mb-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-zinc-900/80 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800 shadow-xl backdrop-blur-md">
            <Lock className="w-7 h-7 text-zinc-300" />
          </div>
          <h1 className="text-2xl font-light tracking-widest text-zinc-100 mb-2 uppercase">
            {isFirstRun ? 'Novo Cofre' : 'Acesso Restrito'}
          </h1>
          <p className="text-xs text-zinc-500 uppercase tracking-widest text-center">
            {isFirstRun ? 'Crie seu PIN mestre' : 'Insira seu PIN de segurança'}
          </p>
        </div>

        <div className="w-full mb-8 flex justify-center items-center h-4 space-x-3">
          {pin.length === 0 ? (
            <span className="text-zinc-700 text-sm tracking-widest">_ _ _ _</span>
          ) : (
            Array.from({ length: pin.length }).map((_, i) => (
              <div key={i} className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-pulse" />
            ))
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 w-full mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
            <button
              key={n}
              onClick={() => handleKeyPress(n)}
              className="h-16 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-200 font-medium text-2xl rounded-2xl border border-zinc-800 shadow-sm active:scale-95 transition-all backdrop-blur-sm"
            >
              {n}
            </button>
          ))}
          <button
            onClick={handleDelete}
            className="h-16 bg-zinc-900/30 hover:bg-zinc-800/80 text-zinc-500 font-medium rounded-2xl flex items-center justify-center active:scale-95 transition-all backdrop-blur-sm"
          >
            <Delete className="w-6 h-6" />
          </button>
          <button
            onClick={() => handleKeyPress(0)}
            className="h-16 bg-zinc-900/50 hover:bg-zinc-800 text-zinc-200 font-medium text-2xl rounded-2xl border border-zinc-800 shadow-sm active:scale-95 transition-all backdrop-blur-sm"
          >
            0
          </button>
          <button
            onClick={handleUnlock}
            disabled={isScanning || pin.length === 0}
            className={\`h-16 rounded-2xl font-bold tracking-wider text-sm transition-all active:scale-95 backdrop-blur-sm flex items-center justify-center \${
              isScanning || pin.length === 0
                ? 'bg-zinc-900/30 text-zinc-600 cursor-not-allowed'
                : 'bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 shadow-[0_0_15px_rgba(37,99,235,0.15)]'
            }\`}
          >
            OK
          </button>
        </div>

        <div className="h-6">
          {(localError || error) && (
            <p className="text-red-400 text-sm text-center font-medium animate-pulse">{localError || error}</p>
          )}
        </div>

        <div className="mt-12 text-center w-full">
          <button 
            onClick={async () => {
              if (window.confirm('Atenção: Resetar o sistema apagará o PIN deste dispositivo. Deseja continuar?')) {
                localStorage.clear();
                await auth.signOut();
                window.location.reload();
              }
            }} 
            className="text-[10px] text-zinc-700 hover:text-zinc-400 uppercase tracking-widest font-medium transition-colors"
          >
            Resetar Sistema
          </button>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/Auth.tsx', code);

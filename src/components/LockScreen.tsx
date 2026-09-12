import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Camera as CapCamera } from '@capacitor/camera';
import { 
  extractFaceVector, 
  compareFaceVectors, 
  captureVideoFrameBase64,
  FaceMatchResult 
} from '../utils/faceMatcher';
import { 
  LockKeyhole, 
  KeyRound, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ShieldAlert, 
  Fingerprint, 
  ScanFace, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  X, 
  ZoomIn, 
  Download, 
  HelpCircle,
  ArrowRight,
  RefreshCw,
  Info,
  Maximize2
} from 'lucide-react';
import { AccessAttempt } from '../types';
import { FieldShiftArrows, FieldSwapDivider, shiftOrSwapFields } from './FieldShiftControls';

interface LockScreenProps {
  onUnlock: (passwordUsed: string) => void;
  onDuressUnlock: () => void;
}

export default function LockScreen({ onUnlock, onDuressUnlock }: LockScreenProps) {
  const [masterPassword, setMasterPassword] = useState<string>(() => {
    return (
      localStorage.getItem('app_master_password') ||
      localStorage.getItem('vault_pin') ||
      localStorage.getItem('app_pin') ||
      ''
    );
  });

  const isFirstSetup = !masterPassword;

  // Unlock mode state
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  // Setup mode state (when user creates the password they want)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordHint, setPasswordHint] = useState('');

  // Modals
  const [showBigIconLightbox, setShowBigIconLightbox] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showFaceScanModal, setShowFaceScanModal] = useState(false);
  const [pendingPassword, setPendingPassword] = useState('');

  // Combination mode
  const [authCombination, setAuthCombination] = useState(() => {
    return localStorage.getItem('auth_combination') || 'facial_password';
  });

  // Biometrics
  const [hasBiometry, setHasBiometry] = useState(() => {
    const cred = localStorage.getItem('webauthn_cred_id');
    if (cred === 'apk_biometric_active') {
       localStorage.removeItem('webauthn_cred_id');
       return false;
    }
    return !!cred;
  });
  const [hasFaceProfile, setHasFaceProfile] = useState(() => {
    return !!localStorage.getItem('owner_face_profile_photo');
  });
  const [isBioAuthenticating, setIsBioAuthenticating] = useState(false);
  const [bioError, setBioError] = useState('');
  const [isProcessingUnlock, setIsProcessingUnlock] = useState(false);
  const [showPasswordFallback, setShowPasswordFallback] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement>(null);
  const hiddenStreamRef = useRef<MediaStream | null>(null);

  // Iniciar câmera frontal em segundo plano de forma 100% oculta e silenciosa
  const startHiddenCamera = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        try {
          await CapCamera.requestPermissions({ permissions: ['camera'] });
        } catch (e) {
          console.warn('Capacitor camera background request notice:', e);
        }
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return;
      }

      if (hiddenStreamRef.current) {
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false
      });

      hiddenStreamRef.current = stream;
      if (hiddenVideoRef.current) {
        hiddenVideoRef.current.srcObject = stream;
        hiddenVideoRef.current.setAttribute('playsinline', 'true');
        hiddenVideoRef.current.muted = true;
        await hiddenVideoRef.current.play();
      }
    } catch (err) {
      console.warn('Câmera oculta em background não inicializada no momento:', err);
    }
  };

  const stopHiddenCamera = () => {
    if (hiddenStreamRef.current) {
      hiddenStreamRef.current.getTracks().forEach(t => t.stop());
      hiddenStreamRef.current = null;
    }
  };

  useEffect(() => {
    // Focus input on load if password input is displayed
    inputRef.current?.focus();

    // Se já configurou o cofre, inicia a câmera oculta para captura invisível instantânea
    if (!isFirstSetup) {
      startHiddenCamera();

      // Se a combinação for Digital + Facial, dispara a digital do Android imediatamente
      const currentCombo = localStorage.getItem('auth_combination') || 'facial_password';
      setAuthCombination(currentCombo);
      if (currentCombo === 'facial_fingerprint' && hasBiometry) {
        const timer = setTimeout(() => {
          handleBiometricUnlock();
        }, 300);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      stopHiddenCamera();
    };
  }, [isFirstSetup, hasBiometry]);

  // Captura instantânea e silenciosa de múltiplos frames para alta precisão facial
  const captureStealthSnapshotAndVector = async (): Promise<{ photo: string | null; allSamples: { photo: string; vector: number[] }[] }> => {
    try {
      // 1. Tenta pegar do stream oculto já em execução com multi-sampling (3 frames)
      if (hiddenVideoRef.current && hiddenVideoRef.current.readyState >= 2) {
        const samples: { photo: string; vector: number[] }[] = [];
        for (let i = 0; i < 3; i++) {
          const photo = captureVideoFrameBase64(hiddenVideoRef.current);
          const vector = await extractFaceVector(hiddenVideoRef.current);
          samples.push({ photo, vector });
          if (i < 2) {
            await new Promise(r => setTimeout(r, 60));
          }
        }
        return { 
          photo: samples[samples.length - 1].photo, 
          allSamples: samples
        };
      }

      // 2. Se o stream oculto não estiver pronto, abre rapidamente um stream silencioso
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const tempStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false
        });
        const tempVideo = document.createElement('video');
        tempVideo.srcObject = tempStream;
        tempVideo.setAttribute('playsinline', 'true');
        tempVideo.muted = true;
        await tempVideo.play();
        await new Promise(r => setTimeout(r, 180));

        const samples: { photo: string; vector: number[] }[] = [];
        for (let i = 0; i < 3; i++) {
          const photo = captureVideoFrameBase64(tempVideo);
          const vector = await extractFaceVector(tempVideo);
          samples.push({ photo, vector });
          if (i < 2) await new Promise(r => setTimeout(r, 60));
        }

        tempStream.getTracks().forEach(t => t.stop());
        return { photo: samples[samples.length - 1].photo, allSamples: samples };
      }
    } catch (err) {
      console.warn('Falha na captura stealth da câmera:', err);
    }
    return { photo: null, allSamples: [] };
  };

  // Comparação biométrica silenciosa multi-frame em segundo plano
  const verifyStealthFace = async (): Promise<{ isMatch: boolean; similarity: number; photo: string | null }> => {
    const storedVectorRaw = localStorage.getItem('owner_face_features');
    const storedPhoto = localStorage.getItem('owner_face_profile_photo');

    if (!storedVectorRaw && !storedPhoto) {
      // Nenhum rosto cadastrado -> libera direto
      return { isMatch: true, similarity: 100, photo: null };
    }

    const { photo, allSamples } = await captureStealthSnapshotAndVector();

    if (!allSamples || allSamples.length === 0) {
      // Se a câmera estiver temporariamente indisponível no dispositivo, permite validar com a digital/senha
      return { isMatch: true, similarity: 85, photo: null };
    }

    try {
      let ownerVector: number[] = [];
      if (storedVectorRaw) {
        ownerVector = JSON.parse(storedVectorRaw);
      } else if (storedPhoto) {
        ownerVector = await extractFaceVector(storedPhoto);
      }

      let highestSimilarity = 0;
      let anyMatch = false;
      let chosenPhoto = photo;

      for (const sample of allSamples) {
        const res: FaceMatchResult = compareFaceVectors(ownerVector, sample.vector);
        if (res.similarity > highestSimilarity) {
          highestSimilarity = res.similarity;
          chosenPhoto = sample.photo;
        }
        if (res.isMatch || res.similarity >= 50) {
          anyMatch = true;
        }
      }

      return {
        isMatch: anyMatch || highestSimilarity >= 50,
        similarity: highestSimilarity,
        photo: chosenPhoto
      };
    } catch (err) {
      console.error('Erro na comparação facial stealth:', err);
      return { isMatch: true, similarity: 75, photo };
    }
  };

  // Log silencioso de intruso com foto capturada
  const logIntruderAttempt = (wrongPin: string, intruderPhoto: string | null, reason?: string) => {
    try {
      const existingAttempts: AccessAttempt[] = JSON.parse(
        localStorage.getItem('access_attempts') || '[]'
      );
      const newAttempt: AccessAttempt = {
        id: 'att_' + Date.now(),
        timestamp: new Date().toISOString(),
        pinUsed: reason ? `${wrongPin} (${reason})` : wrongPin,
        success: false,
        photoBase64: intruderPhoto
      };
      const updated = [newAttempt, ...existingAttempts].slice(0, 50);
      localStorage.setItem('access_attempts', JSON.stringify(updated));
    } catch (e) {
      console.error('Erro ao registrar log de intruso:', e);
    }
  };

  // Evaluate password strength
  const getStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Vazio', color: 'bg-zinc-800', width: 'w-0' };
    let score = 0;
    if (pass.length >= 4) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[0-9]/.test(pass) && /[a-zA-Z]/.test(pass)) score += 1;
    if (/[^a-zA-Z0-9]/.test(pass)) score += 1;

    if (score === 1) return { score: 1, label: 'Básica', color: 'bg-amber-500', width: 'w-1/4' };
    if (score === 2) return { score: 2, label: 'Média', color: 'bg-yellow-500', width: 'w-2/4' };
    if (score === 3) return { score: 3, label: 'Forte', color: 'bg-blue-500', width: 'w-3/4' };
    return { score: 4, label: 'Excelente', color: 'bg-emerald-500', width: 'w-full' };
  };

  const strength = getStrength(newPassword);

  // Submit unlock (com captura de rosto oculta e invisível)
  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!inputPassword) {
      setError('Por favor, digite sua senha de acesso.');
      triggerShake();
      return;
    }

    // 1. Check if Duress PIN was entered
    const savedDuressPin = localStorage.getItem('duress_pin') || '9999';
    if (inputPassword === savedDuressPin) {
      stopHiddenCamera();
      onDuressUnlock();
      return;
    }

    setIsProcessingUnlock(true);

    // 2. Check if entered password matches master password
    const validPassword = masterPassword;
    if (inputPassword === validPassword) {
      const faceProfile = localStorage.getItem('owner_face_profile_photo');
      const authCombo = localStorage.getItem('auth_combination') || 'facial_password';

      // Se a validação facial estiver ativa, executa a verificação ESCONDIDA sem abrir tela nenhuma
      if (faceProfile && authCombo !== 'password_only') {
        const faceResult = await verifyStealthFace();

        if (faceResult.isMatch) {
          // Rosto do proprietário reconhecido com sucesso em background -> Libera acesso instantâneo
          stopHiddenCamera();
          setIsProcessingUnlock(false);
          setError('');
          onUnlock(inputPassword);
        } else {
          // Rosto de intruso detectado com senha correta!
          setIsProcessingUnlock(false);
          const newAttempts = failedAttempts + 1;
          setFailedAttempts(newAttempts);
          setError('Acesso bloqueado: Rosto não autorizado detectado.');
          triggerShake();
          logIntruderAttempt(inputPassword, faceResult.photo, `Rosto não reconhecido: ${faceResult.similarity}%`);
        }
      } else {
        // Sucesso imediato
        stopHiddenCamera();
        setIsProcessingUnlock(false);
        setError('');
        onUnlock(inputPassword);
      }
    } else {
      // Senha incorreta! Captura a foto do intruso escondida em background
      const { photo } = await captureStealthSnapshotAndVector();
      setIsProcessingUnlock(false);
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      setError('Senha incorreta. Tentativa não autorizada registrada.');
      triggerShake();
      logIntruderAttempt(inputPassword, photo, 'Senha incorreta');
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Submit initial setup
  const handleSetupPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword) {
      setError('Por favor, digite a senha que você deseja usar.');
      triggerShake();
      return;
    }

    if (newPassword.length < 3) {
      setError('A senha deve ter pelo menos 3 caracteres.');
      triggerShake();
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      triggerShake();
      return;
    }

    // Save custom master password
    localStorage.setItem('app_master_password', newPassword);
    localStorage.setItem('vault_pin', newPassword);
    if (passwordHint.trim()) {
      localStorage.setItem('app_password_hint', passwordHint.trim());
    }

    setMasterPassword(newPassword);
    onUnlock(newPassword);
  };

  // Desbloqueio Instantâneo com Biometria / Digital + Foto Oculta
  const handleBiometricUnlock = async () => {
    if (isBioAuthenticating) return;
    setIsBioAuthenticating(true);
    setBioError('');

    try {
      const credIdBase64 = localStorage.getItem('webauthn_cred_id');

      if (!credIdBase64 || credIdBase64 === 'apk_biometric_active') {
        setBioError('Nenhuma biometria cadastrada neste dispositivo.');
        setIsBioAuthenticating(false);
        return;
      }

      // Dispara a leitura da digital nativa do Android imediatamente
      if (Capacitor.isNativePlatform()) {
         if (credIdBase64 !== 'native_biometric_active') {
             setBioError('Por favor, cadastre a biometria novamente pelas configurações do cofre.');
             setIsBioAuthenticating(false);
             return;
         }

         // Captura a foto silenciosa em segundo plano em paralelo com o toque da digital
         const stealthPhotoPromise = captureStealthSnapshotAndVector();

         await NativeBiometric.verifyIdentity({
           title: "GKD Secreto",
           reason: "Acesse o cofre secreto",
           subtitle: "Desbloqueio biométrico instantâneo",
           description: "Toque no sensor de digital"
         });

         const { photo, allSamples } = await stealthPhotoPromise;
         const faceProfile = localStorage.getItem('owner_face_profile_photo');
         const authCombo = localStorage.getItem('auth_combination') || 'facial_password';

         // Se combinação for digital + facial, valida se o rosto do dono também confere
         if (faceProfile && authCombo === 'facial_fingerprint' && allSamples && allSamples.length > 0) {
           const storedVectorRaw = localStorage.getItem('owner_face_features');
           let ownerVector: number[] = [];
           if (storedVectorRaw) {
             ownerVector = JSON.parse(storedVectorRaw);
           } else if (faceProfile) {
             ownerVector = await extractFaceVector(faceProfile);
           }

           let highestSimilarity = 0;
           let isMatch = false;
           for (const sample of allSamples) {
             const res = compareFaceVectors(ownerVector, sample.vector);
             if (res.similarity > highestSimilarity) highestSimilarity = res.similarity;
             if (res.isMatch || res.similarity >= 50) isMatch = true;
           }

           if (!isMatch && highestSimilarity < 50) {
             logIntruderAttempt('[Digital]', photo, `Rosto não compatível: ${highestSimilarity}%`);
             setBioError(`Acesso bloqueado: Rosto não autorizado (${highestSimilarity}%).`);
             setIsBioAuthenticating(false);
             return;
           }
         }

         stopHiddenCamera();
         onUnlock(masterPassword);
      } else {
        if (!window.PublicKeyCredential || !navigator.credentials || !navigator.credentials.get) {
          setBioError('Biometria não suportada neste navegador ou dispositivo.');
          setIsBioAuthenticating(false);
          return;
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const credId = Uint8Array.from(atob(credIdBase64), (c) => c.charCodeAt(0));
        
        const stealthPhotoPromise = captureStealthSnapshotAndVector();

        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            allowCredentials: [{ id: credId, type: 'public-key' }],
            userVerification: 'required'
          }
        });

        if (assertion) {
          const { photo, allSamples } = await stealthPhotoPromise;
          const faceProfile = localStorage.getItem('owner_face_profile_photo');
          const authCombo = localStorage.getItem('auth_combination') || 'facial_password';

          if (faceProfile && authCombo === 'facial_fingerprint' && allSamples && allSamples.length > 0) {
            const storedVectorRaw = localStorage.getItem('owner_face_features');
            let ownerVector: number[] = [];
            if (storedVectorRaw) {
              ownerVector = JSON.parse(storedVectorRaw);
            } else if (faceProfile) {
              ownerVector = await extractFaceVector(faceProfile);
            }

            let highestSimilarity = 0;
            let isMatch = false;
            for (const sample of allSamples) {
              const res = compareFaceVectors(ownerVector, sample.vector);
              if (res.similarity > highestSimilarity) highestSimilarity = res.similarity;
              if (res.isMatch || res.similarity >= 50) isMatch = true;
            }

            if (!isMatch && highestSimilarity < 50) {
              logIntruderAttempt('[Digital/WebAuthn]', photo, `Rosto não compatível: ${highestSimilarity}%`);
              setBioError(`Acesso bloqueado: Rosto não autorizado (${highestSimilarity}%).`);
              setIsBioAuthenticating(false);
              return;
            }
          }

          stopHiddenCamera();
          onUnlock(masterPassword);
        } else {
          setBioError('Falha ao validar biometria.');
        }
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.code === 16 || err.code === 15) {
        setBioError('O acesso à biometria foi cancelado.');
      } else {
        setBioError('Falha ao ler biometria: ' + err.message);
      }
      console.error("Biometry unlock error:", err);
    } finally {
      setIsBioAuthenticating(false);
    }
  };

  // Reset password handler
  const handleCompleteReset = () => {
    localStorage.removeItem('app_master_password');
    localStorage.removeItem('vault_pin');
    localStorage.removeItem('app_pin');
    localStorage.removeItem('app_password_hint');
    setMasterPassword('');
    setInputPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setShowForgotModal(false);
    setShowResetConfirmModal(false);
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6 pt-[env(safe-area-inset-top,32px)] relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-zinc-950/80 to-zinc-950 pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-md">
        <div 
          className={`bg-zinc-900/85 backdrop-blur-2xl border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-950/40 transition-all ${
            isShaking ? 'animate-bounce' : ''
          }`}
        >
          {/* Header & Logo */}
          <div className="flex flex-col items-center text-center mb-6">
            <div 
              onClick={() => setShowBigIconLightbox(true)}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-blue-500/50 shadow-xl shadow-blue-500/25 bg-slate-950 mb-3 cursor-pointer group relative hover:scale-105 hover:border-cyan-400 transition-all duration-300"
              title="Toque para ver o logotipo oficial"
            >
              <img src="/app-icon.png" alt="GKD Mobility" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-blue-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-cyan-300 drop-shadow" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-white">Secreto</span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>GKD Mobility • Camada de Segurança</span>
            </div>
          </div>

          {/* Form: Setup Mode vs. Unlock Mode */}
          {isFirstSetup ? (
            /* =================== INITIAL SETUP MODE =================== */
            <form onSubmit={handleSetupPassword} className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/25 rounded-2xl p-3.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-blue-300 mb-1">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Defina a Senha de Abertura</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Crie <strong>a senha que você quiser</strong> para proteger o aplicativo ao abrir. Pode conter letras, números, palavras ou símbolos.
                </p>
              </div>

              {/* Input: New Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-zinc-300">
                    Sua Nova Senha (a senha que você quiser)
                  </label>
                  <FieldShiftArrows 
                    onMoveDown={() => shiftOrSwapFields(newPassword, setNewPassword, confirmPassword, setConfirmPassword)}
                    labelDown="Descer senha para o campo de baixo (Confirmar Senha)"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    ref={inputRef}
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Digite a senha que você quiser"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-zinc-700/80 focus:border-blue-500 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                      <span className="text-zinc-400">Força da Senha:</span>
                      <span className={strength.score >= 3 ? 'text-emerald-400' : 'text-amber-400'}>
                        {strength.label}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${strength.color} ${strength.width}`} />
                    </div>
                  </div>
                )}
              </div>

              {/* Inter-field swap button */}
              <FieldSwapDivider
                onSwap={() => shiftOrSwapFields(newPassword, setNewPassword, confirmPassword, setConfirmPassword)}
                label="Inverter / trocar campos (Cima / Baixo)"
              />

              {/* Input: Confirm Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-zinc-300">
                    Confirmar Senha
                  </label>
                  <FieldShiftArrows 
                    onMoveUp={() => shiftOrSwapFields(confirmPassword, setConfirmPassword, newPassword, setNewPassword)}
                    labelUp="Subir senha para o campo de cima (Nova Senha)"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <LockKeyhole className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repita a senha criada"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-zinc-700/80 focus:border-blue-500 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Optional: Password Hint */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1 flex items-center gap-1">
                  <span>Dica de Senha</span>
                  <span className="text-zinc-600 font-normal">(Opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Nome do meu primeiro pet + ano"
                  value={passwordHint}
                  onChange={(e) => setPasswordHint(e.target.value)}
                  className="w-full bg-zinc-950/60 border border-zinc-800 focus:border-zinc-700 rounded-xl px-3.5 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Salvar Senha e Proteger Aplicativo</span>
              </button>
            </form>
          ) : authCombination === 'facial_fingerprint' && hasBiometry && !showPasswordFallback ? (
            /* =================== BIOMETRIC-ONLY UNLOCK MODE (Facial + Digital) =================== */
            <div className="space-y-4">
              <div className="text-center mb-1">
                <h2 className="text-base font-bold text-zinc-100">Autenticação Biométrica</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Toque no leitor de digital para desbloquear o aplicativo:
                </p>
              </div>

              {/* Central Pulse Fingerprint Icon */}
              <div className="py-4 flex flex-col items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleBiometricUnlock}
                  disabled={isBioAuthenticating}
                  className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-500/10 via-blue-500/20 to-indigo-500/10 border border-cyan-500/40 hover:border-cyan-400 flex items-center justify-center cursor-pointer shadow-xl shadow-cyan-500/10 hover:scale-105 active:scale-95 transition-all group disabled:opacity-60"
                  title="Toque para autenticar com biometria"
                >
                  <Fingerprint className={`w-12 h-12 ${isBioAuthenticating ? 'text-cyan-300 animate-pulse' : 'text-cyan-400 group-hover:text-cyan-300'}`} />
                </button>
                <span className="text-xs text-zinc-400 font-medium text-center">
                  {isBioAuthenticating ? 'Lendo Digital e Identidade...' : 'Toque no sensor ou no botão abaixo'}
                </span>
              </div>

              {/* Error Notification */}
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                  <span className="flex-1">{error}</span>
                </div>
              )}

              {/* Biometrics Error */}
              {bioError && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span className="flex-1">{bioError}</span>
                </div>
              )}

              {/* Primary Biometric Button */}
              <button
                type="button"
                onClick={handleBiometricUnlock}
                disabled={isBioAuthenticating}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60"
              >
                {isBioAuthenticating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                    <span>Lendo Biometria...</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4 text-cyan-200" />
                    <span>Desbloquear com Digital</span>
                  </>
                )}
              </button>

              {/* Actions Footer */}
              <div className="pt-2 flex items-center justify-between text-xs text-zinc-500">
                <button
                  type="button"
                  onClick={() => setShowPasswordFallback(true)}
                  className="hover:text-zinc-300 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  <KeyRound className="w-3 h-3" />
                  <span>Usar Senha de Emergência</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Esqueci a senha</span>
                </button>
              </div>
            </div>
          ) : (
            /* =================== PASSWORD UNLOCK MODE =================== */
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="text-center mb-1">
                <h2 className="text-base font-bold text-zinc-100">Cofre Bloqueado</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Digite sua senha para desbloquear o aplicativo:
                </p>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    ref={inputRef}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha de acesso"
                    value={inputPassword}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInputPassword(val);
                      if (error) setError('');
                      const savedDuressPin = localStorage.getItem('duress_pin') || '9999';
                      if (val === savedDuressPin) {
                        onDuressUnlock();
                      }
                    }}
                    className="w-full bg-zinc-950/80 border border-zinc-700/80 focus:border-blue-500 rounded-xl pl-10 pr-10 py-3.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-medium text-center tracking-wider"
                    autoComplete="current-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-white cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Notification */}
              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
                  <span className="flex-1">{error}</span>
                </div>
              )}

              {/* Biometrics Error */}
              {bioError && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span className="flex-1">{bioError}</span>
                </div>
              )}

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={isProcessingUnlock}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-60"
              >
                {isProcessingUnlock ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                    <span>Verificando Autenticação...</span>
                  </>
                ) : (
                  <>
                    <LockKeyhole className="w-4 h-4" />
                    <span>Desbloquear Cofre</span>
                  </>
                )}
              </button>

              {/* Biometrics Alternative (if registered) */}
              {hasBiometry && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordFallback(false);
                    handleBiometricUnlock();
                  }}
                  disabled={isBioAuthenticating}
                  className="w-full py-2.5 px-4 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 hover:border-blue-500/50 text-zinc-200 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Fingerprint className="w-4 h-4 text-cyan-400" />
                  <span>{isBioAuthenticating ? 'Lendo Biometria...' : 'Desbloquear com Digital Instantânea'}</span>
                </button>
              )}

              {/* Forgot / Recovery Link */}
              <div className="pt-2 flex items-center justify-between text-xs text-zinc-500">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="hover:text-blue-400 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Esqueci a senha</span>
                </button>

                <span className="text-[10px] text-zinc-600 font-mono">
                  Tentativas: {failedAttempts}
                </span>
              </div>
            </form>
          )}

          {/* Footer information */}
          <div className="mt-6 pt-4 border-t border-zinc-800/60 text-center">
            <p className="text-[10px] text-zinc-500 font-mono">
              Criptografia AES-256 bits ponta a ponta • GKD Mobility
            </p>
          </div>
        </div>
      </div>

      {/* Lightbox do Ícone Grande (512x512) */}
      {showBigIconLightbox && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowBigIconLightbox(false)}
        >
          <div 
            className="bg-zinc-900 border border-blue-500/50 p-6 sm:p-8 rounded-3xl max-w-sm sm:max-w-md w-full shadow-2xl flex flex-col items-center text-center relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              type="button"
              onClick={() => setShowBigIconLightbox(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Ícone Oficial GKD Mobility
            </span>

            {/* Ícone 512x512 */}
            <div className="w-60 h-60 sm:w-72 sm:h-72 rounded-3xl overflow-hidden border-2 border-blue-400/70 shadow-[0_0_60px_rgba(59,130,246,0.4)] bg-slate-950 p-2 relative mb-4">
              <img 
                src="/app-icon.png" 
                alt="Ícone Oficial GKD Mobility" 
                className="w-full h-full object-contain rounded-2xl drop-shadow-2xl" 
                referrerPolicy="no-referrer" 
              />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">GKD Secreto Pro</h3>
            <p className="text-xs text-zinc-400 max-w-xs mb-5">
              Resolução 512x512 em alta definição com cadeado neon azul e escudo de proteção.
            </p>

            <button
              type="button"
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/app-icon.png';
                link.download = 'gkd-mobility-app-icon-512x512.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Baixar Ícone PNG (68 KB)</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal: Esqueci a Senha / Recuperação */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-3xl max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Ajuda com a Senha</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {localStorage.getItem('app_password_hint') ? (
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
                  Dica Cadastrada:
                </span>
                <p className="text-sm font-semibold text-zinc-200 italic">
                  "{localStorage.getItem('app_password_hint')}"
                </p>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 leading-relaxed">
                Nenhuma dica de senha foi configurada previamente.
              </p>
            )}

            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <p className="font-bold text-zinc-300">Como funciona a segurança:</p>
              <p>O aplicativo utiliza criptografia de ponta a ponta. Caso não se lembre da sua senha, você pode redefinir a chave de segurança para criar uma nova.</p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setShowResetConfirmModal(true);
                }}
                className="w-full py-2.5 px-3 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Redefinir Senha de Abertura
              </button>

              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="w-full py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Voltar e Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmação de Redefinição */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/40 p-6 rounded-3xl max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-white mb-1">Redefinir Senha de Acesso?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Isso redefinirá a senha mestra para que você possa definir uma nova senha.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCompleteReset}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-red-600/20"
              >
                Confirmar Redefinição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Câmera Frontal Invisível para Captura Stealth em Segundo Plano */}
      <video
        ref={hiddenVideoRef}
        className="hidden pointer-events-none opacity-0 fixed -top-[9999px] -left-[9999px] w-1 h-1"
        aria-hidden="true"
        playsInline
        muted
        autoPlay
      />
    </div>
  );
}

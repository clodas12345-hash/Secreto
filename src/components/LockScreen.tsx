import React, { useState, useEffect, useRef } from 'react';
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
  Info
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

  // Biometrics
  const [hasBiometry, setHasBiometry] = useState(() => !!localStorage.getItem('webauthn_cred_id'));
  const [isBioAuthenticating, setIsBioAuthenticating] = useState(false);
  const [bioError, setBioError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input on load
    inputRef.current?.focus();
  }, [isFirstSetup]);

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

  // Silent intruder capture function using front camera
  const captureIntruderPhoto = async (wrongInput: string) => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera não suportada');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      await video.play();

      // Small delay for camera auto-focus/exposure
      await new Promise((resolve) => setTimeout(resolve, 400));

      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 480;
      let w = video.videoWidth || 640;
      let h = video.videoHeight || 480;
      if (w > MAX_WIDTH) {
        h = Math.round((h * MAX_WIDTH) / w);
        w = MAX_WIDTH;
      }
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, w, h);
        const photoData = canvas.toDataURL('image/jpeg', 0.5);

        const existingAttempts: AccessAttempt[] = JSON.parse(
          localStorage.getItem('access_attempts') || '[]'
        );
        const newAttempt: AccessAttempt = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          pinUsed: wrongInput,
          success: false,
          photoBase64: photoData
        };
        const updated = [newAttempt, ...existingAttempts].slice(0, 50);
        localStorage.setItem('access_attempts', JSON.stringify(updated));
      }

      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      // Fallback: log attempt without photo if camera is blocked/denied
      const existingAttempts: AccessAttempt[] = JSON.parse(
        localStorage.getItem('access_attempts') || '[]'
      );
      const newAttempt: AccessAttempt = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        pinUsed: wrongInput,
        success: false,
        photoBase64: null
      };
      const updated = [newAttempt, ...existingAttempts].slice(0, 50);
      localStorage.setItem('access_attempts', JSON.stringify(updated));
    }
  };

  // Submit unlock
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
      onDuressUnlock();
      return;
    }

    // 2. Check if entered password matches master password
    const validPassword = masterPassword;
    if (inputPassword === validPassword) {
      // Success!
      setError('');
      onUnlock(inputPassword);
    } else {
      // Wrong password!
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      setError('Senha incorreta. Tentativa não autorizada registrada.');
      triggerShake();

      // Silently capture intruder photo in background
      captureIntruderPhoto(inputPassword);
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

  // Biometric unlock
  const handleBiometricUnlock = async () => {
    setIsBioAuthenticating(true);
    setBioError('');
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const credIdBase64 = localStorage.getItem('webauthn_cred_id');

      if (!credIdBase64 || !navigator.credentials) {
        setBioError('Nenhuma biometria cadastrada neste dispositivo.');
        setIsBioAuthenticating(false);
        return;
      }

      const credId = Uint8Array.from(atob(credIdBase64), (c) => c.charCodeAt(0));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ id: credId, type: 'public-key' }],
          userVerification: 'preferred'
        }
      });

      if (assertion) {
        // Biometric passed, unlock with current master password
        onUnlock(masterPassword);
      }
    } catch (err) {
      setBioError('Falha ou cancelamento na leitura biométrica. Use sua senha.');
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6 pt-[env(safe-area-inset-top,32px)] relative overflow-hidden select-none">
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
          {/* Header & Logo with zoom */}
          <div className="flex flex-col items-center text-center mb-6">
            <div 
              onClick={() => setShowBigIconLightbox(true)}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-blue-500/50 shadow-xl shadow-blue-500/25 bg-slate-950 p-1 cursor-pointer group hover:scale-105 hover:border-cyan-400 transition-all duration-300 relative mb-3"
              title="Toque para ver o ícone em tamanho grande (512x512)"
            >
              <img 
                src="/app-icon.png" 
                alt="GKD Mobility" 
                className="w-full h-full object-contain rounded-xl drop-shadow" 
                referrerPolicy="no-referrer" 
              />
              <div className="absolute inset-0 bg-blue-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
                <ZoomIn className="w-5 h-5 text-cyan-300 drop-shadow" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 mb-1">
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-white">Secreto</span>
              <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded tracking-wider">PRO</span>
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
          ) : (
            /* =================== UNLOCK MODE =================== */
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
                      if (val === masterPassword) {
                        onUnlock(val);
                      } else if (val === savedDuressPin) {
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

              {/* Unlock Action Button */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-sm uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <LockKeyhole className="w-4 h-4" />
                <span>Desbloquear Cofre</span>
              </button>

              {/* Biometrics Alternative (if registered) */}
              {hasBiometry && (
                <button
                  type="button"
                  onClick={handleBiometricUnlock}
                  disabled={isBioAuthenticating}
                  className="w-full py-2.5 px-4 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 hover:border-blue-500/50 text-zinc-200 hover:text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Fingerprint className="w-4 h-4 text-cyan-400" />
                  <span>{isBioAuthenticating ? 'Lendo Biometria...' : 'Desbloquear com Biometria / Touch ID'}</span>
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
    </div>
  );
}

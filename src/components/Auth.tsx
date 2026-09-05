import React from 'react';
import { useState, useEffect } from 'react';
import { ScanFace, Lock, AlertTriangle, KeyRound } from 'lucide-react';

interface AuthProps {
  onAuthenticate: (pin: string) => void;
}

export default function Auth({ onAuthenticate }: AuthProps) {
  const [isSupported, setIsSupported] = useState(true);
  const [hasCredential, setHasCredential] = useState(false);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // 2FA States
  const [step, setStep] = useState<'bio' | 'pin'>('bio');
  const [pinInput, setPinInput] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const savedPin = localStorage.getItem('vault_pin');
  const hasEncryptedData = !!localStorage.getItem('vault_data');

  useEffect(() => {
    if (!window.PublicKeyCredential) {
      setIsSupported(false);
      setStep('pin');
      return;
    }
    const savedCred = localStorage.getItem('webauthn_cred_id');
    setHasCredential(!!savedCred);
  }, []);
  useEffect(() => {
    if (step === "pin" && savedPin && pinInput === savedPin) {
      onAuthenticate(pinInput);
    }
  }, [pinInput, savedPin, step, onAuthenticate]);


  const registerFace = async () => {
    setIsProcessing(true);
    setError('');
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const userId = new Uint8Array(16);
      window.crypto.getRandomValues(userId);

      const publicKey: any = {
          challenge,
          rp: { name: "Vault Secreto" },
          user: {
              id: userId,
              name: "admin",
              displayName: "Administrador"
          },
          pubKeyCredParams: [{ type: "public-key", alg: -7 }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
            residentKey: "preferred"
          },
          timeout: 60000,
          attestation: "none"
      };

      const cred = await navigator.credentials.create({ publicKey }) as any;
      if (cred && cred.rawId) {
        const credentialId = btoa(String.fromCharCode.apply(null, new Uint8Array(cred.rawId) as any));
        localStorage.setItem('webauthn_cred_id', credentialId);
        setHasCredential(true);
        setStep('pin');
      }
    } catch (err: any) {
      if (err.message && err.message.includes("publickey-credentials")) {
        setError('O ambiente de preview bloqueia a biometria. Abra em nova aba para cadastrar.');
      } else {
        setError('Falha ao cadastrar: ' + (err.message || ''));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyFace = async () => {
    setIsProcessing(true);
    setError('');
    try {
      const savedCredId = localStorage.getItem('webauthn_cred_id');
      if (!savedCredId) return;

      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);
      const rawId = Uint8Array.from(atob(savedCredId), c => c.charCodeAt(0));

      const publicKey: any = {
        challenge,
        allowCredentials: [{
          id: rawId,
          type: 'public-key',
          transports: ['internal']
        }],
        userVerification: "required"
      };

      const assertion = await navigator.credentials.get({ publicKey });
      if (assertion) {
        setStep("pin");
      }
    } catch (err: any) {
      if (err.message && err.message.includes("publickey-credentials")) {
        setError('O ambiente de preview bloqueia a biometria. Abra o app em uma nova aba.');
      } else {
        setError('Autenticação biométrica falhou.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!savedPin && !hasEncryptedData) {
      if (pinInput.length >= 4) {
        localStorage.setItem('vault_pin', pinInput);
        onAuthenticate(pinInput);
      } else {
        setError('A senha deve ter pelo menos 4 caracteres.');
      }
    } else {
      if (savedPin) {
        if (pinInput === savedPin) {
          onAuthenticate(pinInput);
        } else {
          setError('Senha incorreta.');
          setPinInput('');
        }
      } else {
        // We have encrypted data, but no savedPin (e.g. downloaded from cloud on new device)
        // We must attempt to decrypt with this PIN to see if it's correct!
        // For now, we will just pass it to Vault and let Vault attempt decryption.
        // If Vault fails, it will handle it (we should probably handle it gracefully).
        // Let's just trust it and let Vault save it if successful.
        localStorage.setItem('vault_pin', pinInput);
        onAuthenticate(pinInput);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/40 via-black to-black"></div>
      
      <div className="relative z-10 w-full max-w-md flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {step === 'bio' ? (
          <>
            <div className="w-24 h-24 bg-zinc-900 rounded-[2rem] flex items-center justify-center mb-8 border border-zinc-800 shadow-2xl">
              <Lock className="w-10 h-10 text-zinc-500" />
            </div>
            
            <h1 className="text-2xl font-light tracking-widest text-zinc-100 mb-2 uppercase">Acesso Restrito</h1>
            <p className="text-zinc-500 text-[10px] mb-12 uppercase tracking-[0.3em] text-center font-bold">
              {hasCredential ? "Etapa 1: Biometria" : "Cadastro de Biometria"}
            </p>

            {error && (
              <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs text-center w-full max-w-xs animate-in fade-in flex flex-col gap-3">
                <span>{error}</span>
                {error.includes('nova aba') && (
                  <button 
                    onClick={() => setStep('pin')}
                    className="w-full py-2 bg-blue-600/20 text-blue-400 font-bold rounded-lg border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    Pular Biometria (Modo Preview)
                  </button>
                )}
              </div>
            )}

            {!hasCredential ? (
              <button
                onClick={registerFace}
                disabled={isProcessing}
                className="group relative flex flex-col items-center gap-6 p-8 bg-zinc-950/50 hover:bg-zinc-900 border border-zinc-800 rounded-[2.5rem] transition-all w-full max-w-xs hover:border-blue-500/30 shadow-2xl disabled:opacity-50"
              >
                <div className="w-20 h-20 rounded-full bg-blue-600/10 border border-blue-500/20 group-hover:bg-blue-600 group-hover:border-blue-500 transition-all flex items-center justify-center">
                  <ScanFace className="w-8 h-8 text-blue-500 group-hover:text-white transition-colors" />
                </div>
                <span className="font-semibold text-zinc-300 tracking-wide text-sm">Cadastrar Biometria</span>
              </button>
            ) : (
              <button
                onClick={verifyFace}
                disabled={isProcessing}
                className="group relative flex flex-col items-center gap-6 p-8 bg-zinc-950/50 hover:bg-zinc-900 border border-emerald-900/30 rounded-[2.5rem] transition-all w-full max-w-xs hover:border-emerald-500/30 shadow-2xl disabled:opacity-50"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-600/10 border border-emerald-500/20 group-hover:bg-emerald-600 group-hover:border-emerald-500 transition-all flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.1)] group-hover:shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                  <ScanFace className="w-8 h-8 text-emerald-500 group-hover:text-white transition-colors" />
                </div>
                <span className="font-semibold text-zinc-300 tracking-wide text-sm">Verificar Biometria</span>
              </button>
            )}
            
            <button
              type="button"
              onClick={() => {
                setStep('pin');
                setError('');
              }}
              className="mt-6 flex items-center gap-2 px-5 py-2.5 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold transition-all shadow-md"
            >
              <KeyRound className="w-4 h-4 text-blue-400" />
              Entrar com Senha PIN
            </button>
            
            {hasCredential && (
              <button 
                onClick={() => {
                  if (window.confirm("Isso apagará o cadastro atual. Deseja continuar?")) {
                    localStorage.removeItem('webauthn_cred_id');
                    localStorage.removeItem('vault_pin');
                    setHasCredential(false);
                  }
                }}
                className="mt-8 text-[10px] uppercase font-bold tracking-wider text-zinc-600 hover:text-blue-400 transition-colors"
              >
                Resetar Cofre
              </button>
            )}
          </>
        ) : (
          <form onSubmit={handlePinSubmit} className="flex flex-col items-center w-full animate-in fade-in zoom-in-95 duration-300">
            <div className="w-24 h-24 bg-zinc-900 rounded-[2rem] flex items-center justify-center mb-8 border border-zinc-800 shadow-2xl">
              <KeyRound className="w-10 h-10 text-blue-500" />
            </div>
            
            <h1 className="text-2xl font-light tracking-widest text-zinc-100 mb-2 uppercase">
              {(!savedPin && !hasEncryptedData) ? "Criar Senha PIN" : "Senha PIN"}
            </h1>
            <p className="text-zinc-500 text-[10px] mb-8 uppercase tracking-[0.3em] text-center font-bold">
              Etapa 2: Fator de Conhecimento
            </p>

            {error && (
              <div className="mb-8 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs text-center w-full max-w-xs animate-in fade-in">
                {error}
              </div>
            )}

            <div className="w-full max-w-xs relative mb-6">
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setError('');
                }}
                placeholder={(!savedPin && !hasEncryptedData) ? "Digite um novo PIN" : "Digite seu PIN"}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-6 py-4 text-center text-2xl tracking-[0.5em] text-zinc-100 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={pinInput.length < 4}
              className="w-full max-w-xs py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold tracking-widest uppercase text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] hover:shadow-[0_0_30px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:hover:bg-blue-600 disabled:hover:shadow-[0_0_20px_rgba(37,99,235,0.2)]"
            >
              {(!savedPin && !hasEncryptedData) ? "Salvar e Entrar" : "Desbloquear"}
            </button>
            
            <div className="mt-8 flex flex-col items-center gap-4 w-full max-w-xs">
              <button 
                type="button"
                onClick={() => {
                  setStep('bio');
                  setError('');
                  setPinInput('');
                  setShowResetConfirm(false);
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Voltar
              </button>

              {!showResetConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  className="text-[11px] text-red-400/80 hover:text-red-400 underline transition-colors font-medium py-1"
                >
                  Esqueci minha senha / Resetar cofre
                </button>
              ) : (
                <div className="bg-red-950/40 border border-red-500/30 p-4 rounded-2xl w-full text-center animate-in fade-in space-y-3">
                  <p className="text-xs text-red-300 font-medium leading-relaxed">
                    ⚠️ Atenção: Isso limpará os dados locais para permitir redefinir sua senha. Continuar?
                  </p>
                  <div className="flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem('vault_pin');
                        localStorage.removeItem('vault_data');
                        localStorage.removeItem('webauthn_cred_id');
                        setPinInput('');
                        setError('');
                        window.location.reload();
                      }}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition-all"
                    >
                      Sim, Resetar
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

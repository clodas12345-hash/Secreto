import React, { useState, useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera, CameraResultType, CameraSource, CameraDirection } from '@capacitor/camera';
import { 
  ScanFace, 
  ShieldCheck, 
  ShieldAlert, 
  Camera, 
  X, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Sparkles,
  LockKeyhole
} from 'lucide-react';
import { 
  extractFaceVector, 
  compareFaceVectors, 
  captureVideoFrameBase64,
  FaceMatchResult 
} from '../utils/faceMatcher';

interface FaceBiometricScannerProps {
  isOpen: boolean;
  mode: 'enroll' | 'verify';
  onClose: () => void;
  onEnrolled?: (photoBase64: string) => void;
  onVerifySuccess?: (similarity: number) => void;
  onVerifyFailed?: (similarity: number, intruderPhoto: string) => void;
  title?: string;
  subtitle?: string;
}

export default function FaceBiometricScanner({
  isOpen,
  mode,
  onClose,
  onEnrolled,
  onVerifySuccess,
  onVerifyFailed,
  title,
  subtitle
}: FaceBiometricScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<'loading' | 'active' | 'scanning' | 'matched' | 'failed' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState('Iniciando câmera frontal...');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);

  // Initialize camera stream
  const startCamera = async () => {
    setCameraState('loading');
    setErrorMessage('');
    setStatusMessage('Acessando sensor de câmera frontal...');
    setMatchScore(null);
    setCapturedSnapshot(null);

    try {
      // Request native system permissions on Android / iOS
      if (Capacitor.isNativePlatform()) {
        try {
          await CapCamera.requestPermissions({ permissions: ['camera'] });
        } catch (permErr) {
          console.warn('Capacitor camera requestPermissions error:', permErr);
        }
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Acesso à câmera via stream não suportado diretamente.');
      }

      // Stop existing stream if any
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.muted = true;
        await videoRef.current.play();
        setCameraState('active');

        if (mode === 'verify') {
          setStatusMessage('Posicione seu rosto no centro para a varredura...');
          // Auto-trigger scanning after camera warms up
          setTimeout(() => {
            runFacialScanVerification();
          }, 800);
        } else {
          setStatusMessage('Posicione seu rosto dentro da moldura para cadastrar.');
        }
      }
    } catch (err: any) {
      console.error('Erro ao iniciar câmera:', err);
      setCameraState('error');
      setErrorMessage(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Permissão de câmera não concedida. Você pode autorizar ou usar a captura direta da Câmera do Aparelho.'
          : 'Não foi possível inicializar a câmera: ' + (err.message || err)
      );
    }
  };

  // Native photo capture fallback (works directly with Android/iOS native camera activities)
  const handleNativeCameraCapture = async () => {
    try {
      setCameraState('loading');
      setStatusMessage('Abrindo Câmera Frontal do Sistema...');
      const photo = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction: CameraDirection.Front,
        promptLabelHeader: 'Biometria Facial',
        promptLabelPhoto: 'Tirar Foto Facial',
        promptLabelPicture: 'Foto Frontal'
      });

      if (photo.dataUrl) {
        setCapturedSnapshot(photo.dataUrl);

        if (mode === 'enroll') {
          setCameraState('scanning');
          setStatusMessage('Mapeando características faciais da foto...');
          const vector = await extractFaceVector(photo.dataUrl);
          localStorage.setItem('owner_face_profile_photo', photo.dataUrl);
          localStorage.setItem('owner_face_features', JSON.stringify(vector));
          localStorage.setItem('owner_face_registered_at', new Date().toISOString());

          setCameraState('matched');
          setStatusMessage('Biometria Facial cadastrada com sucesso!');
          setTimeout(() => {
            onEnrolled?.(photo.dataUrl!);
            stopCamera();
            onClose();
          }, 1200);
        } else {
          // Verification mode
          setCameraState('scanning');
          setStatusMessage('Comparando foto com biometria cadastrada...');
          const storedVectorRaw = localStorage.getItem('owner_face_features');
          const storedPhoto = localStorage.getItem('owner_face_profile_photo');
          let ownerVector: number[] = [];
          if (storedVectorRaw) {
            ownerVector = JSON.parse(storedVectorRaw);
          } else if (storedPhoto) {
            ownerVector = await extractFaceVector(storedPhoto);
          }

          const liveVector = await extractFaceVector(photo.dataUrl);
          const matchResult: FaceMatchResult = compareFaceVectors(ownerVector, liveVector);
          setMatchScore(matchResult.similarity);

          if (matchResult.isMatch) {
            setCameraState('matched');
            setStatusMessage(`Identidade confirmada! Proprietário Reconhecido (${matchResult.similarity}% de compatibilidade).`);
            setTimeout(() => {
              stopCamera();
              onVerifySuccess?.(matchResult.similarity);
              onClose();
            }, 1100);
          } else {
            setCameraState('failed');
            setStatusMessage(`Rosto não autorizado (${matchResult.similarity}%). Acesso bloqueado.`);
            onVerifyFailed?.(matchResult.similarity, photo.dataUrl);
          }
        }
      } else {
        setCameraState('error');
        setErrorMessage('Nenhuma foto capturada.');
      }
    } catch (err: any) {
      console.error('Erro na captura nativa:', err);
      setCameraState('error');
      setErrorMessage(err.message || 'Câmera cancelada ou não disponível.');
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, mode]);

  // Run enrollment capture
  const handleEnrollCapture = async () => {
    if (!videoRef.current || cameraState !== 'active') return;

    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          executeEnrollment();
          return null;
        }
        return prev - 1;
      });
    }, 800);
  };

  const executeEnrollment = async () => {
    if (!videoRef.current) return;
    try {
      setCameraState('scanning');
      setStatusMessage('Capturando e mapeando características faciais...');

      const photoBase64 = captureVideoFrameBase64(videoRef.current);
      setCapturedSnapshot(photoBase64);

      // Extract vector
      const vector = await extractFaceVector(videoRef.current);

      // Save to localStorage
      localStorage.setItem('owner_face_profile_photo', photoBase64);
      localStorage.setItem('owner_face_features', JSON.stringify(vector));
      localStorage.setItem('owner_face_registered_at', new Date().toISOString());

      setCameraState('matched');
      setStatusMessage('Biometria Facial cadastrada com sucesso!');

      setTimeout(() => {
        onEnrolled?.(photoBase64);
        stopCamera();
        onClose();
      }, 1400);
    } catch (err: any) {
      console.error('Erro ao cadastrar biometria facial:', err);
      setCameraState('failed');
      setErrorMessage('Falha ao processar biometria facial: ' + err.message);
    }
  };

  // Run verification against stored owner face
  const runFacialScanVerification = async () => {
    if (!videoRef.current) return;

    const storedVectorRaw = localStorage.getItem('owner_face_features');
    const storedPhoto = localStorage.getItem('owner_face_profile_photo');

    if (!storedVectorRaw && !storedPhoto) {
      setCameraState('failed');
      setStatusMessage('Nenhum perfil facial cadastrado no cofre.');
      setErrorMessage('Cadastre seu rosto em Ajustes para usar a validação facial.');
      return;
    }

    setCameraState('scanning');
    setStatusMessage('Executando varredura e comparando biometria...');

    // Small delay to simulate scanning radar motion and allow multi-frame exposure
    await new Promise(r => setTimeout(r, 1200));

    if (!videoRef.current) return;

    try {
      const liveSnapshot = captureVideoFrameBase64(videoRef.current);
      setCapturedSnapshot(liveSnapshot);

      const liveVector = await extractFaceVector(videoRef.current);
      let ownerVector: number[] = [];

      if (storedVectorRaw) {
        ownerVector = JSON.parse(storedVectorRaw);
      } else if (storedPhoto) {
        ownerVector = await extractFaceVector(storedPhoto);
      }

      const matchResult: FaceMatchResult = compareFaceVectors(ownerVector, liveVector);
      setMatchScore(matchResult.similarity);

      if (matchResult.isMatch) {
        setCameraState('matched');
        setStatusMessage(`Identidade confirmada! Proprietário Reconhecido (${matchResult.similarity}% de similaridade).`);
        setTimeout(() => {
          stopCamera();
          onVerifySuccess?.(matchResult.similarity);
          onClose();
        }, 1100);
      } else {
        setCameraState('failed');
        setStatusMessage(`Rosto não autorizado! (${matchResult.similarity}% de similaridade). Acesso bloqueado.`);
        onVerifyFailed?.(matchResult.similarity, liveSnapshot);
      }
    } catch (err: any) {
      console.error('Erro na varredura facial:', err);
      setCameraState('failed');
      setErrorMessage('Falha na leitura facial: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 w-full max-w-sm shadow-2xl relative overflow-hidden flex flex-col items-center">
        
        {/* Glow ambient */}
        <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${
          cameraState === 'matched' ? 'bg-emerald-500/20' : cameraState === 'failed' ? 'bg-red-500/20' : 'bg-blue-600/20'
        }`} />

        {/* Header */}
        <div className="flex items-center justify-between w-full mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl border ${
              cameraState === 'matched'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : cameraState === 'failed'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
            }`}>
              <ScanFace className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                {title || (mode === 'enroll' ? 'Cadastrar Rosto' : 'Varredura Facial')}
              </h3>
              <p className="text-[11px] text-zinc-400">
                {subtitle || (mode === 'enroll' ? 'Biometria Facial do Proprietário' : 'Validação de Identidade')}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video / Camera Frame */}
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden border-2 bg-black flex items-center justify-center shadow-inner my-2 transition-colors duration-500">
          
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transform -scale-x-100 ${
              cameraState === 'error' ? 'hidden' : 'block'
            }`}
          />

          {/* Oval Face Guide Mask */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className={`w-44 h-56 rounded-[48%] border-2 border-dashed transition-all duration-300 ${
              cameraState === 'matched'
                ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.4)] scale-105'
                : cameraState === 'failed'
                ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                : cameraState === 'scanning'
                ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)] animate-pulse'
                : 'border-blue-400/60'
            }`}>
              {/* Corner brackets */}
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
            </div>
          </div>

          {/* Scanning Laser Beam */}
          {cameraState === 'scanning' && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-scanBeam pointer-events-none" />
          )}

          {/* Countdown Overlay */}
          {countdown !== null && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20">
              <span className="text-6xl font-black text-white animate-ping">
                {countdown}
              </span>
            </div>
          )}

          {/* Loading state */}
          {cameraState === 'loading' && (
            <div className="absolute inset-0 bg-zinc-950 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
              <span className="text-xs font-medium">Iniciando sensor...</span>
            </div>
          )}

          {/* Error State */}
          {cameraState === 'error' && (
            <div className="absolute inset-0 bg-zinc-950 p-4 flex flex-col items-center justify-center text-center gap-2">
              <AlertTriangle className="w-8 h-8 text-amber-400 shrink-0" />
              <p className="text-xs text-zinc-300 max-h-24 overflow-y-auto px-1">{errorMessage}</p>
              
              <div className="flex flex-col w-full gap-2 mt-2">
                <button
                  type="button"
                  onClick={handleNativeCameraCapture}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Usar Câmera Nativa do Aparelho</span>
                </button>

                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Tentar Câmera ao Vivo Novamente
                </button>
              </div>
            </div>
          )}

          {/* Verification result overlays */}
          {cameraState === 'matched' && (
            <div className="absolute inset-0 bg-emerald-950/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-emerald-300 z-20 animate-fadeIn">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 animate-bounce" />
              <span className="text-sm font-black uppercase tracking-wider">Acesso Permitido</span>
              {matchScore !== null && (
                <span className="text-[11px] font-mono text-emerald-200">
                  Similaridade: {matchScore}%
                </span>
              )}
            </div>
          )}

          {cameraState === 'failed' && (
            <div className="absolute inset-0 bg-red-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-red-300 z-20 animate-fadeIn text-center p-4">
              <ShieldAlert className="w-14 h-14 text-red-500 animate-pulse" />
              <span className="text-sm font-black uppercase tracking-wider">Rosto Não Reconhecido</span>
              {matchScore !== null && (
                <span className="text-[11px] font-mono text-red-300">
                  Similaridade: {matchScore}% (Mínimo: 68%)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Status Message */}
        <div className="w-full text-center mt-3 mb-4">
          <p className={`text-xs font-medium ${
            cameraState === 'matched' 
              ? 'text-emerald-400 font-bold' 
              : cameraState === 'failed' 
              ? 'text-red-400 font-bold' 
              : 'text-zinc-300'
          }`}>
            {statusMessage}
          </p>
          {errorMessage && cameraState !== 'error' && (
            <p className="text-[11px] text-red-400 mt-1">{errorMessage}</p>
          )}
        </div>

        {/* Action Controls */}
        <div className="w-full flex items-center justify-center gap-2">
          {mode === 'enroll' && (
            <button
              type="button"
              onClick={handleEnrollCapture}
              disabled={cameraState !== 'active' || countdown !== null}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              <span>{countdown !== null ? `Capturando em ${countdown}...` : 'Capturar e Salvar Rosto'}</span>
            </button>
          )}

          {mode === 'verify' && (
            <div className="w-full flex gap-2">
              {cameraState === 'failed' && (
                <button
                  type="button"
                  onClick={runFacialScanVerification}
                  className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Repetir Varredura</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="flex-1 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

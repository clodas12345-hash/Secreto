import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radar, LockKeyhole, LogOut, FileText, KeyRound, Plus, Eye, EyeOff, ShieldCheck, ShieldAlert, Fingerprint, ScanFace, History, Folder, FolderPlus, Edit, Trash2, Copy, Settings, ChevronUp, ChevronDown, HelpCircle, Info, X, Camera, Grid, List, UploadCloud, Upload, Images, CheckCircle2, Download, Puzzle, Globe, Sparkles, Smartphone, Monitor, CheckCircle, ExternalLink, RefreshCw, Layers, Shield, Laptop, Shuffle, Hash, Check, Sliders, ArrowRight, Dices, Database, Cloud, CloudCheck, AlertCircle } from 'lucide-react';
import { PasswordEntry, DocumentEntry, AccessAttempt, Folder as FolderType } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { updateEmail, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import CryptoJS from 'crypto-js';
import JSZip from 'jszip';
import { identifyAppOrSite, getFaviconUrl, KNOWN_APPS, RecognizedApp } from '../utils/appIdentifier';

export default function Vault({ onLogout, userPin }: { onLogout: () => void, userPin: string, cloudUserId?: string }) {
  const [is2FAEnabled, setIs2FAEnabled] = useState(!!localStorage.getItem('2fa_code'));
  const [new2FACode, setNew2FACode] = useState('');
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const [isEditingCamera, setIsEditingCamera] = useState(false);
  const liveVideoRef = useRef<HTMLVideoElement>(null);

  // Layout & Multi-photo / Multi-upload state
  const [docLayoutMode, setDocLayoutMode] = useState<'grid' | 'list'>('grid');
  const [isBatchCameraOpen, setIsBatchCameraOpen] = useState(false);
  const [capturedBatchPhotos, setCapturedBatchPhotos] = useState<string[]>([]);
  const batchCameraRef = useRef<HTMLVideoElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Extension & AutoFill state
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [simulatedSite, setSimulatedSite] = useState<'netflix.com' | 'instagram.com' | 'banco.com' | 'gmail.com' | 'outro'>('netflix.com');
  const [simCustomUrl, setSimCustomUrl] = useState('');
  const [simUsername, setSimUsername] = useState('');
  const [simPassword, setSimPassword] = useState('');
  const [simCapturedToast, setSimCapturedToast] = useState<{ url: string; username: string; password: string } | null>(null);
  const [simAutofillDropdownOpen, setSimAutofillDropdownOpen] = useState(false);
  const [recentCapturedCreds, setRecentCapturedCreds] = useState<Array<{ id: string; url: string; username: string; password: string; timestamp: number }>>(() => {
    try {
      const raw = localStorage.getItem('captured_creds_list');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });

  // Check for pending credentials from Chrome Extension
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['pending_credentials', 'pending_credentials_list'], (result) => {
        if (result.pending_credentials) {
          const creds = result.pending_credentials as any;
          setRecentCapturedCreds(prev => {
            const updated = [creds, ...prev.filter(p => !(p.url === creds.url && p.username === creds.username))];
            localStorage.setItem('captured_creds_list', JSON.stringify(updated));
            return updated;
          });
          setSimCapturedToast({
            url: creds.url || 'Site detectado',
            username: creds.username || '',
            password: creds.password || ''
          });
          // Limpa as credenciais pendentes imediatas
          chrome.storage.local.remove('pending_credentials');
        }
      });
    }
  }, []);

  const [activeTab, setActiveTab] = useState<'passwords' | 'documents' | 'settings' | 'help' | 'security'>('passwords');
  const [settingsSubTab, setSettingsSubTab] = useState<'security' | 'extension' | 'native'>('security');
  const [showAppInfoModal, setShowAppInfoModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [iconDownloadSuccess, setIconDownloadSuccess] = useState(false);
  const [customIconSuccess, setCustomIconSuccess] = useState(false);

  const handleDownloadOfficialIcon = () => {
    const svgImg = new Image();
    svgImg.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(svgImg, 0, 0, 512, 512);

      const link = document.createElement('a');
      link.download = 'gkd-mobility-icon-512x512.png';
      link.href = canvas.toDataURL('image/png', 0.9);
      link.click();
      setIconDownloadSuccess(true);
      setTimeout(() => setIconDownloadSuccess(false), 3000);
    };
    svgImg.src = '/app-icon.svg?' + Date.now();
  };

  const handleOptimizeCustomIcon = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 512, 512);

        // Maintain aspect ratio centered
        const hRatio = 512 / img.width;
        const vRatio = 512 / img.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShiftX = (512 - img.width * ratio) / 2;
        const centerShiftY = (512 - img.height * ratio) / 2;
        ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);

        const link = document.createElement('a');
        link.download = 'gkd-icone-original-otimizado.png';
        link.href = canvas.toDataURL('image/png', 0.85);
        link.click();
        setCustomIconSuccess(true);
        setTimeout(() => setCustomIconSuccess(false), 3500);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const [hasBiometry, setHasBiometry] = useState(!!localStorage.getItem('webauthn_cred_id'));
  const [authCombination, setAuthCombination] = useState<'facial_password' | 'facial_fingerprint'>(() => {
    return (localStorage.getItem('auth_combination') as 'facial_password' | 'facial_fingerprint') || 'facial_password';
  });

  const [isChangingPin, setIsChangingPin] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeError, setPinChangeError] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError('');
    setPinChangeSuccess(false);

    const savedPin = localStorage.getItem('vault_pin');
    if (savedPin && currentPinInput !== savedPin) {
      setPinChangeError('PIN atual incorreto.');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      setPinChangeError('Os novos PINs não coincidem.');
      return;
    }
    if (newPinInput.length < 4) {
      setPinChangeError('O novo PIN deve ter pelo menos 4 dígitos.');
      return;
    }

    localStorage.setItem('vault_pin', newPinInput);
    setPinChangeSuccess(true);
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setTimeout(() => {
      setIsChangingPin(false);
      setPinChangeSuccess(false);
    }, 3000);
  };

  const [bioError, setBioError] = useState('');
  const [isBioProcessing, setIsBioProcessing] = useState(false);

  const registerBiometry = async () => {
    setIsBioProcessing(true);
    setBioError('');
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
            userVerification: "required"
          },
          timeout: 60000,
          attestation: "none"
      };

      const cred = await navigator.credentials.create({ publicKey });
      if (cred && (cred as any).rawId) {
        const credentialId = btoa(String.fromCharCode.apply(null, new Uint8Array((cred as any).rawId) as any));
        localStorage.setItem('webauthn_cred_id', credentialId);
        setHasBiometry(true);
      }
    } catch (err: any) {
      if (err.message && err.message.includes("publickey-credentials")) {
        setBioError('O ambiente de preview bloqueia a biometria. Abra em nova aba.');
      } else {
        setBioError('Falha ao cadastrar: ' + (err.message || ''));
      }
    } finally {
      setIsBioProcessing(false);
    }
  };

  const removeBiometry = () => {
    if (window.confirm("Deseja remover a biometria cadastrada?")) {
      localStorage.removeItem('webauthn_cred_id');
      setHasBiometry(false);
    }
  };

  // Extension ZIP Packager & Downloader
  const handleDownloadExtensionZip = async () => {
    setIsGeneratingZip(true);
    try {
      const zip = new JSZip();

      // Manifest V3
      const manifestObj = {
        manifest_version: 3,
        name: "GKD Secreto - Leitor & Preenchimento de Senhas",
        version: "1.0.0",
        description: "Preenchimento automático e captura inteligente de credenciais em sites e formulários para o cofre GKD Secreto.",
        permissions: ["storage", "activeTab", "scripting", "tabs", "contextMenus", "unlimitedStorage"],
        host_permissions: ["<all_urls>"],
        action: {
          default_popup: "popup.html",
          default_title: "GKD Secreto - Cofre e Senhas",
          default_icon: { "16": "icon.svg", "48": "icon.svg", "128": "icon.svg" }
        },
        background: { service_worker: "background.js" },
        content_scripts: [
          { matches: ["<all_urls>"], js: ["content.js"], css: ["styles.css"], run_at: "document_idle" }
        ],
        web_accessible_resources: [
          { resources: ["icon.svg", "styles.css"], matches: ["<all_urls>"] }
        ]
      };
      zip.file("manifest.json", JSON.stringify(manifestObj, null, 2));

      // Fetch files from public/extension/
      const [contentRes, bgRes, popupHtmlRes, popupJsRes, stylesRes, iconRes] = await Promise.all([
        fetch('/extension/content.js').then(r => r.text()).catch(() => '// Content script'),
        fetch('/extension/background.js').then(r => r.text()).catch(() => '// Background worker'),
        fetch('/extension/popup.html').then(r => r.text()).catch(() => '<html></html>'),
        fetch('/extension/popup.js').then(r => r.text()).catch(() => '// Popup script'),
        fetch('/extension/styles.css').then(r => r.text()).catch(() => '/* styles */'),
        fetch('/icon.svg').then(r => r.text()).catch(() => '')
      ]);

      zip.file("content.js", contentRes);
      zip.file("background.js", bgRes);
      zip.file("popup.html", popupHtmlRes);
      zip.file("popup.js", popupJsRes);
      zip.file("styles.css", stylesRes);
      zip.file("icon.svg", iconRes || '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="#3b82f6"/></svg>');

      // Manual de instalação incluído no ZIP
      zip.file("LEIAME_INSTALACAO.txt", `=====================================================
GKD SECRETO - EXTENSÃO DE PREENCHIMENTO & LEITURA DE SENHAS
=====================================================

COMO INSTALAR NO GOOGLE CHROME / BRAVE / EDGE / OPERA:
1. Extraia todos os arquivos deste arquivo ZIP em uma pasta do seu computador.
2. Abra o seu navegador e acesse a página de extensões:
   - No Chrome / Brave: chrome://extensions
   - No Edge: edge://extensions
3. No canto superior direito, ATIVE a chave "Modo do desenvolvedor" (Developer mode).
4. Clique no botão "Carregar sem compactação" (Load unpacked).
5. Selecione a pasta descompactada onde estão os arquivos (manifest.json, content.js, etc.).
6. Pronto! O ícone do GKD Secreto aparecerá na barra de ferramentas do seu navegador e preencherá suas senhas automaticamente em qualquer site acessado!

COMO USAR NO CELULAR ANDROID (Via Kiwi Browser ou Yandex):
1. Instale o aplicativo Kiwi Browser na Google Play Store.
2. Acesse kiwi://extensions no Kiwi Browser.
3. Ative o Modo Desenvolvedor e clique em +(from .zip/.crx/.user.js) selecionando este arquivo ZIP.
4. Agora ao navegar no celular, o GKD Secreto lerá e preencherá as senhas direto nas páginas!
=====================================================`);

      const blob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = "GKD_Secreto_Extensao_Navegador.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.error("Falha ao gerar ZIP da extensão", e);
      alert("Não foi possível gerar o ZIP automaticamente. Verifique os arquivos.");
    } finally {
      setIsGeneratingZip(false);
    }
  };

  const handleSimulateCapture = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUrl = simulatedSite === 'outro' ? (simCustomUrl.trim() || 'site-personalizado.com') : simulatedSite;
    if (!simPassword) {
      alert("Digite uma senha na simulação para testar a captura.");
      return;
    }

    const newCaptured = {
      id: 'sim_' + Date.now(),
      url: targetUrl,
      username: simUsername.trim() || 'usuario@exemplo.com',
      password: simPassword,
      timestamp: Date.now()
    };

    setRecentCapturedCreds(prev => {
      const updated = [newCaptured, ...prev.filter(p => !(p.url === newCaptured.url && p.username === newCaptured.username))];
      localStorage.setItem('captured_creds_list', JSON.stringify(updated));
      return updated;
    });

    setSimCapturedToast({
      url: targetUrl,
      username: simUsername.trim() || 'usuario@exemplo.com',
      password: simPassword
    });

    // Se estiver conectado com a extensão real, notifica
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ pending_credentials: newCaptured });
    }
  };

  const handleSaveCapturedCredToVault = (cred: { url: string; username: string; password: string }, targetFolderId?: string) => {
    const identified = identifyAppOrSite(cred.url);
    const finalTitle = identified ? identified.name : cred.url.toUpperCase();

    const newPw: PasswordEntry = {
      id: Date.now().toString(),
      title: finalTitle,
      username: cred.username,
      website: identified ? identified.domain : cred.url,
      password: cred.password,
      alphanumericPassword: cred.password,
      notes: `Capturado automaticamente pelo Leitor de Senhas em ${new Date().toLocaleDateString('pt-BR')}`,
      folderId: targetFolderId || undefined,
      updatedAt: new Date().toLocaleDateString('pt-BR')
    };

    setPasswords(prev => [newPw, ...prev]);
    setSimCapturedToast(null);
    alert(`Senha de ${finalTitle} salva com sucesso no cofre!`);
  };


      
  const toggle2FA = () => {
    if (is2FAEnabled) {
      if (window.confirm('Desativar a proteção 2FA?')) {
        localStorage.removeItem('2fa_code');
        setIs2FAEnabled(false);
      }
    } else {
      if (new2FACode.length >= 4) {
        localStorage.setItem('2fa_code', new2FACode);
        setIs2FAEnabled(true);
        setNew2FACode('');
        alert('2FA ativado com sucesso!');
      } else {
        alert('O código 2FA precisa ter no mínimo 4 dígitos.');
      }
    }
  };
  
  
  const [showPasswordId, setShowPasswordId] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<AccessAttempt[]>([]);

  // Carrega tentativas
  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('access_attempts') || '[]');
    setAttempts(saved);
  }, [activeTab]);

  const [folders, setFolders] = useState<FolderType[]>([]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  const [isAutofillEnabled, setIsAutofillEnabled] = useState(() => localStorage.getItem('autofill_enabled') === 'true');
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [changePinModal, setChangePinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [changeDuressPinModal, setChangeDuressPinModal] = useState(false);
  const [newDuressPin, setNewDuressPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showNewDuressPin, setShowNewDuressPin] = useState(false);
  const [clearHistoryModal, setClearHistoryModal] = useState(false);
  const [clearHistoryPin, setClearHistoryPin] = useState('');

  const [passwords, setPasswords] = useState<PasswordEntry[]>([]);
  const [documents, setDocuments] = useState<DocumentEntry[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // Auto-lock feature
  

  useEffect(() => {
    const loadData = async () => {
      // 1. Load from LocalStorage (fast & offline)
      let localEncrypted = null;
      try {
        localEncrypted = localStorage.getItem('vault_data');
        if (localEncrypted) {
          const bytes = CryptoJS.AES.decrypt(localEncrypted, userPin);
          const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
          if (decryptedString) {
            const dec = JSON.parse(decryptedString);
            if (dec.folders) setFolders(dec.folders.filter((f: any) => f && f.name && f.name.trim().toLowerCase() !== 'sem pasta'));
            if (dec.passwords) setPasswords(dec.passwords);
            if (dec.documents) setDocuments(dec.documents);
          }
        }
      } catch (e) {
        if (localEncrypted) { alert('Atenção: PIN incorreto para descriptografar os dados locais. Desconectando.'); onLogout(); return; }
      }
      
      setIsDataLoaded(true);
      const localAttempts = JSON.parse(localStorage.getItem('access_attempts') || '[]');
      setAttempts(localAttempts);

      // 2. Try to sync from Firebase
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.encryptedData) {
            try {
              const bytes = CryptoJS.AES.decrypt(data.encryptedData, userPin);
              const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
              if (decryptedString) {
                const dec = JSON.parse(decryptedString);
                if (dec.folders) setFolders(dec.folders.filter((f: any) => f && f.name && f.name.trim().toLowerCase() !== 'sem pasta'));
                if (dec.passwords) setPasswords(dec.passwords);
                if (dec.documents) setDocuments(dec.documents);
                
                // Sync intruders cloud -> local
                if (dec.attempts) {
                  const allAttempts = [...localAttempts, ...dec.attempts];
                  // Deduplicate by ID
                  const uniqueAttempts = Array.from(new Map(allAttempts.map((item: any) => [item.id, item])).values());
                  localStorage.setItem('access_attempts', JSON.stringify(uniqueAttempts.sort((a: any, b: any) => Number(b.id) - Number(a.id))));
                  setAttempts(uniqueAttempts);
                }
              }
            } catch (e) {
              console.warn('Cofre da nuvem criptografado com outra chave/PIN anterior:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error loading data from Firebase', error);
      }
    };
    loadData();
  }, [userPin]);

  const [dbSyncStatus, setDbSyncStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [dbLastSyncedAt, setDbLastSyncedAt] = useState<string>(() => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    if (!isDataLoaded) return;

    // 1. Save to LocalStorage immediately (instant & lag-free)
    try {
      const localAttempts = JSON.parse(localStorage.getItem('access_attempts') || '[]');
      const dataToEncrypt = { folders, passwords, documents, attempts: localAttempts };
      const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(dataToEncrypt), userPin).toString();
      localStorage.setItem('vault_data', encryptedData);
    } catch (error) {
      console.error('Error saving local data', error);
    }

    setDbSyncStatus('saving');

    // 2. Debounce Save to Firebase in the background (1.5s delay) to prevent UI lag
    const timer = setTimeout(async () => {
      if (!auth.currentUser) {
        setDbSyncStatus('saved');
        return;
      }
      try {
        const localAttempts = JSON.parse(localStorage.getItem('access_attempts') || '[]');
        const dataToEncrypt = { folders, passwords, documents, attempts: localAttempts };
        const encryptedData = CryptoJS.AES.encrypt(JSON.stringify(dataToEncrypt), userPin).toString();
        const docRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(docRef, { encryptedData, lastUpdated: new Date().toISOString() }, { merge: true });
        setDbSyncStatus('saved');
        setDbLastSyncedAt(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      } catch (error) {
        console.error('Error saving to Firebase', error);
        setDbSyncStatus('error');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [folders, passwords, documents, userPin, isDataLoaded]);

  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderPassword, setNewFolderPassword] = useState('');

  const [newFolderTabType, setNewFolderTabType] = useState<'passwords' | 'documents'>('passwords');
  const [editFolderTabType, setEditFolderTabType] = useState<'passwords' | 'documents'>('passwords');

  const [unlockingFolder, setUnlockingFolder] = useState<FolderType | null>(null);
  const [folderUnlockPin, setFolderUnlockPin] = useState('');
  const [folderUnlockError, setFolderUnlockError] = useState('');
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderPassword, setEditFolderPassword] = useState('');
  const [deletingFolder, setDeletingFolder] = useState<FolderType | null>(null);


  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDetail, setNewItemDetail] = useState('');
  const [newItemWebsite, setNewItemWebsite] = useState('');
  const [newItemPassword, setNewItemPassword] = useState('');
  const [newItemAccessPassword, setNewItemAccessPassword] = useState('');
  const [newItemTransactionPassword, setNewItemTransactionPassword] = useState('');
  const [newItemAlphanumericPassword, setNewItemAlphanumericPassword] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [newItemFile, setNewItemFile] = useState<string | null>(null);
  const [newItemFileType, setNewItemFileType] = useState<'image' | 'pdf' | 'other' | null>(null);

  // Gerador de Senhas Aleatórias State
  const [showRandomPasswordModal, setShowRandomPasswordModal] = useState(false);
  const [randomPassType, setRandomPassType] = useState<'alphanumeric' | 'numeric'>('alphanumeric');
  const [randomPassLength, setRandomPassLength] = useState(16);
  const [randomIncludeUpper, setRandomIncludeUpper] = useState(true);
  const [randomIncludeLower, setRandomIncludeLower] = useState(true);
  const [randomIncludeNumbers, setRandomIncludeNumbers] = useState(true);
  const [randomIncludeSymbols, setRandomIncludeSymbols] = useState(true);
  const [randomAvoidAmbiguous, setRandomAvoidAmbiguous] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [isPasswordMasked, setIsPasswordMasked] = useState(false);
  const [randomCopied, setRandomCopied] = useState(false);
  const [randomSaveSiteName, setRandomSaveSiteName] = useState('');
  const [randomSaveUsername, setRandomSaveUsername] = useState('');
  const [randomSaveTargetFolderId, setRandomSaveTargetFolderId] = useState<string | null>(null);
  const [randomSaveSlot, setRandomSaveSlot] = useState<'password' | 'alphanumericPassword' | 'accessPassword' | 'transactionPassword'>('password');
  const [randomSaveSuccess, setRandomSaveSuccess] = useState(false);

  const generateRandomPasswordString = (
    type: 'alphanumeric' | 'numeric',
    length: number,
    opts: { upper: boolean; lower: boolean; numbers: boolean; symbols: boolean; avoidAmbiguous: boolean }
  ) => {
    if (type === 'numeric') {
      const digits = '0123456789';
      let res = '';
      for (let i = 0; i < length; i++) {
        res += digits.charAt(Math.floor(Math.random() * digits.length));
      }
      return res;
    }

    let upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let lower = 'abcdefghijklmnopqrstuvwxyz';
    let numbers = '0123456789';
    let symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (opts.avoidAmbiguous) {
      upper = upper.replace(/[IO]/g, '');
      lower = lower.replace(/[lo]/g, '');
      numbers = numbers.replace(/[01]/g, '');
    }

    let charset = '';
    const guaranteed: string[] = [];

    if (opts.upper) {
      charset += upper;
      guaranteed.push(upper.charAt(Math.floor(Math.random() * upper.length)));
    }
    if (opts.lower) {
      charset += lower;
      guaranteed.push(lower.charAt(Math.floor(Math.random() * lower.length)));
    }
    if (opts.numbers) {
      charset += numbers;
      guaranteed.push(numbers.charAt(Math.floor(Math.random() * numbers.length)));
    }
    if (opts.symbols) {
      charset += symbols;
      guaranteed.push(symbols.charAt(Math.floor(Math.random() * symbols.length)));
    }

    if (!charset) {
      charset = lower + numbers;
    }

    const resultArr = [...guaranteed];
    while (resultArr.length < length) {
      resultArr.push(charset.charAt(Math.floor(Math.random() * charset.length)));
    }

    for (let i = resultArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [resultArr[i], resultArr[j]] = [resultArr[j], resultArr[i]];
    }

    return resultArr.slice(0, length).join('');
  };

  const handleRegeneratePassword = (
    type = randomPassType,
    length = randomPassLength,
    opts = {
      upper: randomIncludeUpper,
      lower: randomIncludeLower,
      numbers: randomIncludeNumbers,
      symbols: randomIncludeSymbols,
      avoidAmbiguous: randomAvoidAmbiguous,
    }
  ) => {
    const pw = generateRandomPasswordString(type, length, opts);
    setGeneratedPassword(pw);
    setRandomCopied(false);
  };

  const handleOpenRandomPasswordGenerator = (defaultFolderId?: string | null) => {
    const initType: 'alphanumeric' | 'numeric' = 'alphanumeric';
    const initLen = 16;
    const initialPass = generateRandomPasswordString(initType, initLen, {
      upper: true,
      lower: true,
      numbers: true,
      symbols: true,
      avoidAmbiguous: false,
    });
    setRandomPassType(initType);
    setRandomPassLength(initLen);
    setRandomIncludeUpper(true);
    setRandomIncludeLower(true);
    setRandomIncludeNumbers(true);
    setRandomIncludeSymbols(true);
    setRandomAvoidAmbiguous(false);
    setGeneratedPassword(initialPass);
    setIsPasswordMasked(false);
    setRandomCopied(false);
    setRandomSaveSiteName('');
    setRandomSaveUsername('');
    setRandomSaveTargetFolderId(defaultFolderId !== undefined ? defaultFolderId : (activeFolderId || 'none'));
    setRandomSaveSlot('password');
    setRandomSaveSuccess(false);
    setShowRandomPasswordModal(true);
  };

  const handleCopyRandomPassword = async () => {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setRandomCopied(true);
      setTimeout(() => setRandomCopied(false), 2000);
    } catch (e) {
      // ignore
    }
  };

  const handleSaveRandomPasswordToVault = () => {
    if (!generatedPassword) return;
    const finalTitle = randomSaveSiteName.trim() || 'Nova Senha Gerada';
    const targetFolder = randomSaveTargetFolderId === 'none' ? undefined : (randomSaveTargetFolderId || undefined);
    const identified = identifyAppOrSite(finalTitle);

    const newPw: PasswordEntry = {
      id: Date.now().toString(),
      title: finalTitle,
      username: randomSaveUsername.trim(),
      website: identified?.domain,
      password: randomSaveSlot === 'password' ? generatedPassword : '',
      accessPassword: randomSaveSlot === 'accessPassword' ? generatedPassword : '',
      transactionPassword: randomSaveSlot === 'transactionPassword' ? generatedPassword : '',
      alphanumericPassword: randomSaveSlot === 'alphanumericPassword' ? generatedPassword : (randomPassType === 'alphanumeric' && randomSaveSlot === 'password' ? generatedPassword : ''),
      notes: `Senha gerada automaticamente (${randomPassType === 'alphanumeric' ? 'Alfanumérica' : 'Numérica'}, ${generatedPassword.length} dígitos) em ${new Date().toLocaleDateString('pt-BR')}`,
      folderId: targetFolder,
      updatedAt: new Date().toLocaleDateString('pt-BR')
    };

    setPasswords(prev => [newPw, ...prev]);
    setRandomSaveSuccess(true);

    setTimeout(() => {
      setShowRandomPasswordModal(false);
      setActiveTab('passwords');
      if (targetFolder) {
        setActiveFolderId(targetFolder);
      } else {
        setActiveFolderId(null);
      }
    }, 700);
  };

  const handleTransferRandomPassToFullForm = () => {
    setShowRandomPasswordModal(false);
    setActiveTab('passwords');
    if (randomSaveTargetFolderId && randomSaveTargetFolderId !== 'none') {
      setActiveFolderId(randomSaveTargetFolderId);
    }
    const name = randomSaveSiteName.trim() || '';
    setNewItemName(name);
    const identified = identifyAppOrSite(name);
    setNewItemWebsite(identified ? identified.domain : '');
    setNewItemDetail(randomSaveUsername.trim() || '');
    if (randomSaveSlot === 'password') {
      setNewItemPassword(generatedPassword);
      if (randomPassType === 'alphanumeric') {
        setNewItemAlphanumericPassword(generatedPassword);
      }
    } else if (randomSaveSlot === 'alphanumericPassword') {
      setNewItemAlphanumericPassword(generatedPassword);
    } else if (randomSaveSlot === 'accessPassword') {
      setNewItemAccessPassword(generatedPassword);
    } else if (randomSaveSlot === 'transactionPassword') {
      setNewItemTransactionPassword(generatedPassword);
    }
    setNewItemNotes(`Senha gerada automaticamente (${randomPassType === 'alphanumeric' ? 'Alfanumérica' : 'Numérica'}, ${generatedPassword.length} dígitos)`);
    setIsAdding(true);
  };

  const getPasswordStrength = (pass: string, type: 'alphanumeric' | 'numeric') => {
    if (!pass) return { label: 'Vazia', color: 'text-zinc-500', barColor: 'bg-zinc-700', percent: 0 };
    if (type === 'numeric') {
      if (pass.length < 6) return { label: 'PIN Curto', color: 'text-yellow-400', barColor: 'bg-yellow-500', percent: 35 };
      if (pass.length <= 8) return { label: 'PIN Seguro', color: 'text-emerald-400', barColor: 'bg-emerald-500', percent: 75 };
      return { label: 'PIN Ultra Seguro', color: 'text-blue-400', barColor: 'bg-blue-500', percent: 100 };
    }
    let score = 0;
    if (pass.length >= 8) score += 20;
    if (pass.length >= 12) score += 20;
    if (pass.length >= 16) score += 15;
    if (/[A-Z]/.test(pass)) score += 15;
    if (/[a-z]/.test(pass)) score += 10;
    if (/[0-9]/.test(pass)) score += 10;
    if (/[^A-Za-z0-9]/.test(pass)) score += 15;
    
    if (score < 40) return { label: 'Fraca', color: 'text-red-400', barColor: 'bg-red-500', percent: Math.max(score, 20) };
    if (score < 70) return { label: 'Média', color: 'text-yellow-400', barColor: 'bg-yellow-500', percent: score };
    if (score < 90) return { label: 'Forte', color: 'text-emerald-400', barColor: 'bg-emerald-500', percent: score };
    return { label: 'Imbatível / Muito Forte', color: 'text-blue-400', barColor: 'bg-blue-500', percent: 100 };
  };

  const [editingItem, setEditingItem] = useState<{ type: 'password' | 'document', id: string } | null>(null);
  const [viewingDocument, setViewingDocument] = useState<DocumentEntry | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemDetail, setEditItemDetail] = useState('');
  const [editItemWebsite, setEditItemWebsite] = useState('');
  const [editItemPassword, setEditItemPassword] = useState('');
  const [editItemAccessPassword, setEditItemAccessPassword] = useState('');
  const [editItemTransactionPassword, setEditItemTransactionPassword] = useState('');
  const [editItemAlphanumericPassword, setEditItemAlphanumericPassword] = useState('');
  const [editItemNotes, setEditItemNotes] = useState('');
  const [editItemFile, setEditItemFile] = useState<string | null>(null);
  const [editItemFileType, setEditItemFileType] = useState<'image' | 'pdf' | 'other' | null>(null);

  
  const startLiveCamera = async (forEdit: boolean) => {
    setIsEditingCamera(forEdit);
    setIsLiveCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(()=>{});
      }
    } catch (err) {
      console.error('Erro ao acessar camera', err);
      alert('Não foi possível acessar a câmera do dispositivo.');
      setIsLiveCameraOpen(false);
    }
  };

  const captureLivePhoto = () => {
    if (liveVideoRef.current) {
      const canvas = document.createElement('canvas');
      const video = liveVideoRef.current;
      const MAX_WIDTH = 600;
      let width = video.videoWidth;
      let height = video.videoHeight;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        if (isEditingCamera) {
          setEditItemFile(dataUrl);
          setEditItemFileType('image');
        } else {
          setNewItemFile(dataUrl);
          setNewItemFileType('image');
        }
      }
      stopLiveCamera();
    }
  };

  const stopLiveCamera = () => {
    if (liveVideoRef.current && liveVideoRef.current.srcObject) {
      const stream = liveVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
    }
    setIsLiveCameraOpen(false);
  };

  // Batch Live Camera Functions
  const startBatchCamera = async () => {
    setCapturedBatchPhotos([]);
    setIsBatchCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (batchCameraRef.current) {
        batchCameraRef.current.srcObject = stream;
        batchCameraRef.current.play().catch(()=>{});
      }
    } catch (err) {
      console.error('Erro ao acessar camera', err);
      alert('Não foi possível acessar a câmera do dispositivo.');
      setIsBatchCameraOpen(false);
    }
  };

  const captureBatchPhoto = () => {
    if (batchCameraRef.current) {
      const video = batchCameraRef.current;
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      let width = video.videoWidth || 640;
      let height = video.videoHeight || 480;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setCapturedBatchPhotos(prev => [...prev, dataUrl]);
      }
    }
  };

  const stopBatchCamera = () => {
    if (batchCameraRef.current && batchCameraRef.current.srcObject) {
      const stream = batchCameraRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
    }
    setIsBatchCameraOpen(false);
  };

  const saveBatchPhotosToVault = () => {
    if (capturedBatchPhotos.length === 0) return;
    const newDocs: DocumentEntry[] = capturedBatchPhotos.map((photo, index) => ({
      id: (Date.now() + index).toString(),
      title: `Foto ${documents.length + index + 1}`,
      content: 'Foto tirada via Câmera',
      createdAt: new Date().toLocaleDateString('pt-BR'),
      folderId: activeFolderId === "none" ? undefined : activeFolderId,
      fileData: photo,
      fileType: 'image'
    }));
    setDocuments(prev => [...newDocs, ...prev]);
    stopBatchCamera();
    setCapturedBatchPhotos([]);
  };

  // File Download Helpers
  const triggerDownload = (fileData: string, title: string, fileType?: string) => {
    if (!fileData) return;
    try {
      const a = document.createElement('a');
      a.href = fileData;
      let ext = '';
      if (fileType === 'image') {
        if (fileData.startsWith('data:image/png')) ext = '.png';
        else if (fileData.startsWith('data:image/webp')) ext = '.webp';
        else ext = '.jpg';
      } else if (fileType === 'pdf') {
        ext = '.pdf';
      }
      const rawTitle = title ? title.trim() : (fileType === 'image' ? 'foto' : 'documento');
      const filename = rawTitle.toLowerCase().endsWith(ext) ? rawTitle : `${rawTitle}${ext}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Erro no download:', err);
      alert('Não foi possível realizar o download do arquivo.');
    }
  };

  const handleDownloadAllInFolder = () => {
    const docsToDownload = filteredDocuments.filter(d => d.fileData);
    if (docsToDownload.length === 0) {
      alert('Nenhum documento ou foto disponível para download nesta pasta.');
      return;
    }
    docsToDownload.forEach((doc, idx) => {
      setTimeout(() => {
        if (doc.fileData) {
          triggerDownload(doc.fileData, doc.title || `arquivo_${idx + 1}`, doc.fileType);
        }
      }, idx * 300);
    });
  };

  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Multi-File Async Processor (Sequential to save memory and prevent browser tab crashes)
  const processFileAsync = (file: File): Promise<{ base64: string | null; fileType: 'image' | 'pdf' | 'other' }> => {
    return new Promise((resolve) => {
      const isImage = file.type.startsWith('image/') || !!file.name.match(/\.(jpg|jpeg|png|gif|heic|heif|webp)$/i);
      const fileType = isImage ? 'image' : (file.type === 'application/pdf' || !!file.name.match(/\.pdf$/i)) ? 'pdf' : 'other';

      if (!isImage && file.size > 2000 * 1024) {
        alert(`O arquivo ${file.name} excede o limite de tamanho.`);
        return resolve({ base64: null, fileType });
      }

      const reader = new FileReader();
      reader.onerror = () => resolve({ base64: null, fileType });

      if (fileType === 'image') {
        reader.onload = (event) => {
          const rawBase64 = event.target?.result as string;
          if (!rawBase64) return resolve({ base64: null, fileType: 'image' });

          const img = new Image();
          img.onerror = () => resolve({ base64: rawBase64, fileType: 'image' });
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              const MAX_WIDTH = 900;
              let width = img.width;
              let height = img.height;
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
              canvas.width = width;
              canvas.height = height;
              ctx?.drawImage(img, 0, 0, width, height);
              const compressedBase64 = canvas.toDataURL('image/jpeg', 0.65);
              resolve({ base64: compressedBase64, fileType: 'image' });
            } catch (e) {
              resolve({ base64: rawBase64, fileType: 'image' });
            }
          };
          img.src = rawBase64;
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          resolve({ base64: base64 || null, fileType });
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEditing: boolean) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const filesList: File[] = Array.from(e.target.files);

    if (isEditing) {
      const res = await processFileAsync(filesList[0]);
      setEditItemFile(res.base64);
      setEditItemFileType(res.fileType);
      e.target.value = '';
      return;
    }

    // Single upload inside Add Modal
    if (isAdding && filesList.length === 1) {
      const res = await processFileAsync(filesList[0]);
      setNewItemFile(res.base64);
      setNewItemFileType(res.fileType);
      if (!newItemName.trim()) {
        setNewItemName(filesList[0].name.replace(/\.[^/.]+$/, ""));
      }
      e.target.value = '';
      return;
    }

    // Batch upload: process files sequentially with progress bar
    setUploadProgress({ current: 1, total: filesList.length });
    const createdDocs: DocumentEntry[] = [];

    for (let i = 0; i < filesList.length; i++) {
      setUploadProgress({ current: i + 1, total: filesList.length });
      const file = filesList[i];
      const res = await processFileAsync(file);
      if (res.base64) {
        const defaultTitle = file.name.replace(/\.[^/.]+$/, "") || (res.fileType === 'image' ? `Foto ${documents.length + i + 1}` : `Documento ${documents.length + i + 1}`);
        createdDocs.push({
          id: (Date.now() + i + Math.random()).toString(),
          title: defaultTitle,
          content: '',
          createdAt: new Date().toLocaleDateString('pt-BR'),
          folderId: activeFolderId === "none" ? undefined : activeFolderId,
          fileData: res.base64,
          fileType: res.fileType
        });
      }
    }

    if (createdDocs.length > 0) {
      setDocuments(prev => [...createdDocs, ...prev]);
    }

    setUploadProgress(null);

    if (isAdding) {
      setIsAdding(false);
      setNewItemName('');
      setNewItemDetail('');
      setNewItemFile(null);
      setNewItemFileType(null);
    }

    e.target.value = '';
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    const finalTitle = editItemName.trim() || (editingItem.type === 'password' ? 'Senha Sem Nome' : 'Foto/Doc Sem Nome');

    if (editingItem.type === 'password') {
      setPasswords(passwords.map(p => p.id === editingItem.id ? { 
        ...p, 
        title: finalTitle, 
        username: editItemDetail || '', 
        website: editItemWebsite.trim() || undefined,
        password: editItemPassword || '', 
        accessPassword: editItemAccessPassword || '', 
        transactionPassword: editItemTransactionPassword || '', 
        alphanumericPassword: editItemAlphanumericPassword || '', 
        notes: editItemNotes || '',
        updatedAt: new Date().toLocaleDateString('pt-BR')
      } : p));
    } else {
      setDocuments(documents.map(d => d.id === editingItem.id ? { ...d, title: finalTitle, content: editItemDetail || '', fileData: editItemFile, fileType: editItemFileType } : d));
    }
    
    setEditingItem(null);
  };

  const handleSaveNewItem = () => {
    const finalTitle = newItemName.trim() || (activeTab === 'passwords' ? 'Senha Sem Nome' : (newItemFileType === 'image' ? 'Foto Sem Nome' : 'Documento Sem Nome'));
    
    if (activeTab === 'passwords') {
      const newItem: PasswordEntry = {
        id: Date.now().toString(),
        title: finalTitle,
        username: newItemDetail || '',
        website: newItemWebsite.trim() || undefined,
        password: newItemPassword || '',
        accessPassword: newItemAccessPassword || '',
        transactionPassword: newItemTransactionPassword || '',
        alphanumericPassword: newItemAlphanumericPassword || '',
        notes: newItemNotes || '',
        folderId: activeFolderId === "none" ? undefined : activeFolderId,
        updatedAt: new Date().toLocaleDateString('pt-BR')
      };
      setPasswords([newItem, ...passwords]);
    } else if (activeTab === 'documents') {
      const newItem: DocumentEntry = {
        id: Date.now().toString(),
        title: finalTitle,
        content: newItemDetail || '',
        createdAt: new Date().toLocaleDateString('pt-BR'),
        folderId: activeFolderId === "none" ? undefined : activeFolderId,
        fileData: newItemFile,
        fileType: newItemFileType
      };
      setDocuments([newItem, ...documents]);
    }
    
    setNewItemName('');
    setNewItemDetail('');
    setNewItemWebsite('');
    setNewItemPassword('');
    setNewItemAccessPassword('');
    setNewItemTransactionPassword('');
    setNewItemAlphanumericPassword('');
    setNewItemNotes('');
    setNewItemFile(null);
    setNewItemFileType(null);
    setIsAdding(false);
  };

  const filteredPasswords = passwords
    .filter(p => activeFolderId === "none" ? !p.folderId : (activeFolderId ? p.folderId === activeFolderId : true))
    .sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' }));

  const filteredDocuments = documents
    .filter(d => activeFolderId === "none" ? !d.folderId : (activeFolderId ? d.folderId === activeFolderId : true))
    .sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' }));

  return (
    <div className="bg-zinc-950 text-zinc-400 font-sans tracking-tight h-screen w-full overflow-hidden flex flex-col select-none">
      
      {/* Header */}
      <header className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-4 sm:px-8 bg-zinc-950/80 backdrop-blur-xl shadow-2xl">
        <div 
          onClick={() => setShowAppInfoModal(true)}
          className="flex items-center gap-3 cursor-pointer group select-none hover:opacity-90 transition-all"
          title="Clique para ver informações e descrição do aplicativo"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 group-hover:bg-blue-500 transition-all">
            <LockKeyhole className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-semibold tracking-tight text-zinc-100 uppercase group-hover:text-white transition-colors">
              <span className="text-blue-500">Confidencial</span>
            </span>
            <span className="text-[9px] text-zinc-500 font-mono -mt-1 group-hover:text-blue-400 transition-colors">v2.5.0 • Sobre o App</span>
          </div>
        </div>

        {/* Indicador de Status do Banco de Dados em Nuvem */}
        <div 
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-xs shadow-inner cursor-pointer hover:border-blue-500/40 transition-all"
          title={`Banco de Dados Firestore: Todas as senhas estão criptografadas e salvas com segurança na nuvem. Última sincronização: ${dbLastSyncedAt}`}
          onClick={() => alert(`🛡️ Status do Banco de Dados:\n\n• Suas senhas e documentos estão criptografados com chave AES-256 e salvos no banco de dados em nuvem.\n• Última sincronização realizada às ${dbLastSyncedAt}.\n• Sincronização automática em segundo plano ativada.`)}
        >
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-zinc-300 font-medium text-[11px]">Banco de Dados:</span>
          </div>
          {dbSyncStatus === 'saving' ? (
            <span className="flex items-center gap-1 text-yellow-400 text-[11px] font-bold">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Salvando...
            </span>
          ) : dbSyncStatus === 'saved' ? (
            <span className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Salvo & Protegido
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-400 text-[11px] font-bold">
              <AlertCircle className="w-3 h-3" />
              Erro ao Sincronizar
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => handleOpenRandomPasswordGenerator(activeFolderId)} 
            className="transition-all flex items-center gap-1.5 font-bold uppercase text-xs tracking-wider px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-sm hover:scale-105 active:scale-95"
            title="Gerador de Senhas Aleatórias (Alfanumérico ou Numérico)"
          >
            <Shuffle className="w-4 h-4 text-blue-400" />
            <span className="hidden sm:inline">Senhas Aleatórias</span>
          </button>

          <button 
            onClick={() => { setActiveTab('passwords'); setActiveFolderId(null); }} 
            className={`transition-colors flex items-center gap-2 font-bold uppercase text-xs tracking-wider ${activeTab === 'passwords' || activeTab === 'documents' ? 'text-blue-500' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden md:inline">Cofre</span>
          </button>

          <button 
            onClick={() => setActiveTab(activeTab === 'help' ? 'passwords' : 'help')} 
            className={`transition-colors flex items-center gap-2 font-bold uppercase text-xs tracking-wider ${activeTab === 'help' ? 'text-blue-500' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <HelpCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden md:inline">Ajuda</span>
          </button>

          <button 
            onClick={() => setActiveTab(activeTab === 'settings' ? 'passwords' : 'settings')} 
            className={`transition-colors flex items-center gap-2 font-bold uppercase text-xs tracking-wider ${activeTab === 'settings' ? 'text-blue-500 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Ajustes</span>
          </button>

          <button onClick={onLogout} className="text-blue-500 hover:text-blue-600 transition-colors flex items-center gap-1.5 font-bold uppercase text-xs tracking-wider">
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        

        <div className="flex-1 flex flex-col min-w-0">
            {/* Folders Toolbar */}
      {activeTab !== 'settings' && activeTab !== 'help' && activeFolderId !== null && (
        <div className="h-14 border-b border-zinc-800/50 bg-zinc-900/30 flex items-center px-4 md:px-8 gap-4 overflow-x-auto whitespace-nowrap">
          <button onClick={() => setActiveFolderId(null)} className="flex items-center gap-2 text-zinc-400 hover:text-blue-400 font-bold text-sm uppercase">
            <ChevronUp className="w-5 h-5 -rotate-90" /> Voltar
          </button>
          <div className="flex-1"></div>
          <span className="text-zinc-300 font-bold uppercase text-sm">
            {activeFolderId === 'none' ? 'Sem Pasta' : folders.find(f => f.id === activeFolderId)?.name}
          </span>
          <div className="flex-1"></div>
          {activeFolderId !== 'none' && (
            <>
              <button
                onClick={() => {
                  const currentFolder = folders.find(f => f.id === activeFolderId);
                  if (currentFolder) {
                    setEditFolderName(currentFolder.name);
                    setEditFolderPassword(currentFolder.password || '');
                    setEditingFolder(currentFolder);
                    setEditFolderTabType(currentFolder.tabType || (activeTab === 'documents' ? 'documents' : 'passwords'));
                  }
                }}
                className="text-zinc-400 hover:text-blue-400 transition-colors flex items-center gap-1.5 bg-zinc-800/50 hover:bg-zinc-800 px-3 py-1.5 rounded-lg"
                title="Editar Pasta"
              >
                <Edit className="w-4 h-4" />
                <span className="text-xs font-bold uppercase hidden sm:inline">Editar</span>
              </button>
              <button
                onClick={() => {
                  const currentFolder = folders.find(f => f.id === activeFolderId);
                  if (currentFolder) {
                    setDeletingFolder(currentFolder);
                  }
                }}
                className="text-zinc-400 hover:text-red-400 transition-colors flex items-center gap-1.5 bg-zinc-800/50 hover:bg-zinc-800 px-3 py-1.5 rounded-lg"
                title="Excluir Pasta"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-xs font-bold uppercase hidden sm:inline">Excluir</span>
              </button>
            </>
          )}
        </div>
      )}
      
      {/* Content */}
        <section className="flex-1 p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto overflow-x-hidden min-w-0">
          
          <div className={`flex flex-col gap-4 min-w-0 ${activeTab === 'settings' && settingsSubTab === 'security' ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
            {activeTab === 'settings' && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2 border-b border-zinc-800/80 pb-4">
                  <div>
                    <h2 className="text-2xl font-light text-zinc-100 italic">
                      Ajustes & <span className="font-bold not-italic">Configurações</span>
                    </h2>
                    <p className="text-xs text-zinc-400 mt-0.5">Gerencie segurança, biometria e a extensão de leitura automática de senhas.</p>
                  </div>

                  <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0 shadow-inner flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab('security')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        settingsSubTab === 'security'
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Segurança & PIN
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab('extension')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        settingsSubTab === 'extension'
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Puzzle className="w-4 h-4" />
                      Extensor & AutoFill
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettingsSubTab('native')}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        settingsSubTab === 'native'
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      App Nativo (WebIntoApp)
                    </button>
                  </div>
                </div>

                {settingsSubTab === 'security' && (
                  <>

                
                <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl p-6 mb-4">
                  <h3 className="text-lg font-semibold text-zinc-100 mb-4">Senha PIN</h3>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <KeyRound className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-zinc-400 mb-4">Altere o seu PIN de acesso (Fator de conhecimento).</p>
                      
                      {!isChangingPin ? (
                        <button 
                          onClick={() => setIsChangingPin(true)}
                          className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-sm font-semibold transition-colors border border-blue-500/20"
                        >
                          Trocar Senha PIN
                        </button>
                      ) : (
                        <form onSubmit={handleChangePin} className="flex flex-col gap-3 animate-in fade-in max-w-xs">
                          <input
                            type="password"
                            inputMode="numeric"
                            placeholder="PIN Atual"
                            value={currentPinInput}
                            onChange={e => setCurrentPinInput(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 text-center tracking-[0.5em] font-mono focus:outline-none focus:border-blue-500"
                          />
                          <input
                            type="password"
                            inputMode="numeric"
                            placeholder="Novo PIN"
                            value={newPinInput}
                            onChange={e => setNewPinInput(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 text-center tracking-[0.5em] font-mono focus:outline-none focus:border-blue-500"
                          />
                          <input
                            type="password"
                            inputMode="numeric"
                            placeholder="Confirmar Novo PIN"
                            value={confirmPinInput}
                            onChange={e => setConfirmPinInput(e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 text-center tracking-[0.5em] font-mono focus:outline-none focus:border-blue-500"
                          />
                          
                          {pinChangeError && <span className="text-xs text-red-400 text-center font-bold bg-red-500/10 p-2 rounded">{pinChangeError}</span>}
                          {pinChangeSuccess && <span className="text-xs text-emerald-400 text-center font-bold bg-emerald-500/10 p-2 rounded">PIN atualizado com sucesso!</span>}
                          
                          <div className="flex gap-2 mt-2">
                            <button type="button" onClick={() => { setIsChangingPin(false); setPinChangeError(''); setPinChangeSuccess(false); }} className="flex-1 px-4 py-2 text-zinc-400 hover:text-zinc-100 text-sm font-semibold transition-colors">
                              Cancelar
                            </button>
                            <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-semibold transition-colors">
                              Salvar
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
<div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl p-6 mb-4 space-y-6">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                        <ScanFace className="w-5 h-5 text-blue-400" />
                        Autenticação Dupla (Facial Obrigatório)
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">
                        O <strong className="text-blue-400">Reconhecimento Facial</strong> é obrigatório em ambas as combinações de segurança.
                      </p>
                    </div>
                    <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-extrabold rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Facial Obrigatório
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider mb-3">
                      Selecione qual combinação deseja manter ativada:
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Opção 1: Facial + Senha */}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthCombination('facial_password');
                          localStorage.setItem('auth_combination', 'facial_password');
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                          authCombination === 'facial_password'
                            ? 'bg-blue-600/15 border-blue-500 text-zinc-100 shadow-lg shadow-blue-500/10'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                              <ScanFace className="w-5 h-5" />
                            </div>
                            <span className="text-xs text-zinc-400 font-bold">+</span>
                            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                              <KeyRound className="w-5 h-5" />
                            </div>
                          </div>
                          {authCombination === 'facial_password' && (
                            <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-extrabold rounded-md uppercase">
                              Ativo
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="font-extrabold text-sm text-zinc-100 mb-1">
                            Facial + Senha / PIN
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Exige validação do <strong className="text-zinc-200">Reconhecimento Facial</strong> e confirmação por <strong className="text-zinc-200">Senha / PIN</strong> do cofre.
                          </p>
                        </div>
                      </button>

                      {/* Opção 2: Facial + Digital */}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthCombination('facial_fingerprint');
                          localStorage.setItem('auth_combination', 'facial_fingerprint');
                        }}
                        className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                          authCombination === 'facial_fingerprint'
                            ? 'bg-blue-600/15 border-blue-500 text-zinc-100 shadow-lg shadow-blue-500/10'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                              <ScanFace className="w-5 h-5" />
                            </div>
                            <span className="text-xs text-zinc-400 font-bold">+</span>
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                              <Fingerprint className="w-5 h-5" />
                            </div>
                          </div>
                          {authCombination === 'facial_fingerprint' && (
                            <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-extrabold rounded-md uppercase">
                              Ativo
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="font-extrabold text-sm text-zinc-100 mb-1">
                            Facial + Digital / Touch ID
                          </div>
                          <p className="text-xs text-zinc-400 leading-relaxed">
                            Exige validação do <strong className="text-zinc-200">Reconhecimento Facial</strong> e leitura da <strong className="text-zinc-200">Impressão Digital</strong>.
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80">
                    {bioError && (
                      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-xs">
                        {bioError}
                      </div>
                    )}
                    
                    {hasBiometry ? (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
                        <span className="text-emerald-400 text-xs font-bold flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" /> Biometria (Face/Digital) Cadastrada
                        </span>
                        <button 
                          onClick={removeBiometry}
                          disabled={isBioProcessing}
                          className="px-3.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          Remover Cadastro Biométrico
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
                        <span className="text-zinc-400 text-xs">
                          Cadastre os dados biométricos do dispositivo para habilitar a validação.
                        </span>
                        <button 
                          onClick={registerBiometry}
                          disabled={isBioProcessing}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-blue-600/20"
                        >
                          {isBioProcessing ? 'Processando...' : 'Cadastrar Biometria'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                
                {/* Card de Conexão com Nuvem Google / Firebase */}
                <div className="bg-gradient-to-r from-blue-950/40 via-zinc-900 to-zinc-900 border border-blue-500/30 rounded-2xl p-6 mb-4 relative overflow-hidden shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
                        <Cloud className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                          Sincronização em Nuvem (Google Firebase)
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Mantenha seus arquivos salvos e sincronizados com a nuvem em tempo real.
                        </p>
                      </div>
                    </div>

                    {auth.currentUser ? (
                      <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-black rounded-xl flex items-center gap-1.5 shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        Conectado & Ativo
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black rounded-xl flex items-center gap-1.5 shrink-0">
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        Modo Seguro Local
                      </span>
                    )}
                  </div>

                  {auth.currentUser ? (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400 uppercase text-sm shrink-0">
                          {auth.currentUser.email ? auth.currentUser.email[0] : 'U'}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-100">{auth.currentUser.email || 'Conta Google Conectada'}</div>
                          <div className="text-[11px] text-zinc-400">Backup em nuvem automático ativo e criptografado com AES-256.</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm("Deseja desconectar a conta da nuvem deste aparelho?")) {
                            await auth.signOut();
                            setDbSyncStatus('saved');
                          }
                        }}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl transition-all shrink-0"
                      >
                        Desconectar Conta
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-950/80 p-4 rounded-xl border border-zinc-800">
                      <div>
                        <div className="text-xs font-bold text-zinc-200 mb-0.5">Deseja conectar sua conta Google?</div>
                        <div className="text-[11px] text-zinc-400">Clique para conectar e manter o backup na nuvem sempre sincronizado.</div>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
                            const provider = new GoogleAuthProvider();
                            await signInWithPopup(auth, provider);
                            alert('✅ Conta Google conectada com sucesso! O backup em nuvem está ativo.');
                          } catch (err: any) {
                            alert('Aviso: Se estiver no aplicativo APK, a conexão pode exigir permissão de popup ou ser feita pelo navegador. Seus dados continuam salvos com segurança no aparelho.');
                          }
                        }}
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-600/25 shrink-0 flex items-center gap-2"
                      >
                        <Cloud className="w-4 h-4" />
                        Conectar Google & Manter Ativo
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl p-6 mb-4">
                  <h3 className="text-lg font-semibold text-zinc-100 mb-4">Modo de Coação</h3>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <ShieldAlert className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-400 mb-2">
                        O Modo de Coação está ativo via PIN alternativo. Quando um invasor exigir acesso, utilize seu PIN de Coação para abrir o cofre. Todos os dados reais serão ocultados, mostrando apenas informações inofensivas.
                      </p>
                      <button onClick={() => setChangeDuressPinModal(true)} className="px-4 py-2 bg-zinc-900/50 shadow-2xl border border-zinc-800/50 rounded text-sm text-zinc-400 hover:bg-zinc-800 transition-colors">
                        Alterar PIN de Coação
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl p-6 mb-4">
                  <h3 className="text-lg font-semibold text-zinc-100 mb-4">Preenchimento Automático</h3>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-900/20 border border-emerald-500/20 rounded-xl">
                      <ShieldCheck className={`w-6 h-6 ${isAutofillEnabled ? 'text-blue-600' : 'text-zinc-600'}`} />
                    </div>
                    <div>
                      <p className="text-sm text-zinc-400 mb-2">Permita que o aplicativo salve senhas e faça login automaticamente em sites e aplicativos que requerem acesso no seu dispositivo.</p>
                      <button 
                        onClick={() => {
                          const newState = !isAutofillEnabled;
                          setIsAutofillEnabled(newState);
                          localStorage.setItem('autofill_enabled', String(newState));
                        }}
                        className={`px-4 py-2 rounded-2xl text-sm font-semibold transition-colors border ${isAutofillEnabled ? 'bg-blue-100 text-blue-600 border-blue-200 hover:bg-blue-200' : 'bg-zinc-900/50 shadow-2xl border border-zinc-800/50 text-zinc-500 border-zinc-800/50 hover:bg-zinc-800'}`}>
                        {isAutofillEnabled ? 'Serviço Ativado' : 'Ativar Serviço de Preenchimento'}
                      </button>
                    </div>
                  </div>
                </div>

                
                
              </>
            )}

            

            
            {activeTab === 'help' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-light text-zinc-100 italic">Central de <span className="font-bold not-italic">Ajuda & Descrição</span></h2>
                </div>
                
                <div className="space-y-6">
                  {/* Descrição Oficial do Aplicativo */}
                  <div className="bg-zinc-900/50 shadow-xl border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                    <h3 className="text-lg font-bold text-zinc-100 mb-2 flex items-center gap-2">
                      <Info className="w-5 h-5 text-blue-400" />
                      Descrição Geral do Aplicativo
                    </h3>
                    <p className="text-sm text-zinc-300 leading-relaxed mb-4">
                      O <strong className="text-blue-400">GKD Secreto</strong> é um cofre confidencial e multifuncional projetado para proteger suas senhas, cartões, fotos confidenciais e documentos sensíveis contra acessos não autorizados.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-zinc-400">
                      <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-1">
                        <span className="font-extrabold text-zinc-200 block text-sm">🔒 Dupla Autenticação Obligatória</span>
                        <p>Exige validação do Reconhecimento Facial combinado com Senha/PIN do cofre ou Impressão Digital desde o primeiro uso.</p>
                      </div>
                      <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-1">
                        <span className="font-extrabold text-zinc-200 block text-sm">🎭 Modo Disfarçado Anti-Coação</span>
                        <p>Disfarça o app como um portal de jogos de apostas. Digite uma senha incorreta para abrir o modo simulado sem revelar seu cofre real.</p>
                      </div>
                      <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-1">
                        <span className="font-extrabold text-zinc-200 block text-sm">📸 Registro de Intrusos</span>
                        <p>Captura foto silenciosa através da câmera frontal a cada tentativa de acesso para consulta no Histórico de Tentativas.</p>
                      </div>
                      <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-1">
                        <span className="font-extrabold text-zinc-200 block text-sm">📱 Instalação Nativa (PWA & APK)</span>
                        <p>Pode ser compilado como aplicativo Android nativo (.apk) com suporte a Autofill Service e leitura de formulários.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-blue-400 mb-2 flex items-center gap-2">
                      <Info className="w-5 h-5" />
                      Como usar o Cofre
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                      Este cofre foi projetado para armazenar suas senhas e documentos de forma segura, escondido sob a fachada de um aplicativo de apostas.
                    </p>
                    <ul className="list-disc pl-5 text-sm text-zinc-500 space-y-2">
                      <li><strong>Adicionar Itens:</strong> Use o botão verde "+" na barra de navegação para adicionar novas senhas ou documentos.</li>
                      <li><strong>Pastas:</strong> Organize seus itens criando pastas. Selecione a pasta desejada na caixa de seleção para visualizar ou adicionar itens nela.</li>
                      <li><strong>Edição e Exclusão:</strong> Você pode editar o nome das pastas ou excluir pastas e itens usando os ícones de lápis (editar) ou lixeira (excluir).</li>
                    </ul>
                  </div>

                  <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-blue-600 mb-2 flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" />
                      Segurança e Permissões
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                      O aplicativo utiliza duas etapas de segurança principais:
                    </p>
                    <ul className="list-disc pl-5 text-sm text-zinc-500 space-y-2">
                      <li><strong>PIN e Biometria:</strong> Acesso primário validado via código e reconhecimento do dispositivo.</li>
                      <li><strong>Captura de Segurança:</strong> Ao tentar acessar, a câmera registra uma foto silenciosa de quem está operando o dispositivo. Estas fotos podem ser vistas no Histórico de Acessos.</li>
                      <li><strong>Preenchimento Automático:</strong> Para que o cofre preencha senhas automaticamente em outros apps, acesse a aba "Extensor & AutoFill" acima e baixe a extensão ou habilite o serviço no Android.</li>
                    </ul>
                  </div>
                </div>
              </>
            )}

                {settingsSubTab === 'extension' && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2.5">
                          <Puzzle className="w-6 h-6 text-blue-500" />
                          Extensor & <span className="text-blue-400">Leitor de Senhas</span>
                        </h2>
                        <p className="text-xs text-zinc-400 mt-1">
                          Leitura automática de credenciais em sites e aplicativos com preenchimento em 1 clique.
                        </p>
                      </div>
                      <button 
                        onClick={handleDownloadExtensionZip}
                        disabled={isGeneratingZip}
                        className="px-5 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 shadow-xl shadow-blue-600/30 shrink-0"
                      >
                        {isGeneratingZip ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Gerando Pacote .ZIP...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" />
                            Baixar Extensão (.ZIP)
                          </>
                        )}
                      </button>
                    </div>

                    {/* Notificação Flutuante de Captura Simulada */}
                    {simCapturedToast && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-zinc-900 border-2 border-blue-500 rounded-2xl p-4 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden mb-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                            <Sparkles className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">Detector de Senhas Ativo</span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold">Nova Credencial</span>
                            </div>
                            <p className="text-sm font-semibold text-zinc-100 mt-0.5">
                              Detectado login em <strong className="text-blue-300">{simCapturedToast.url}</strong> com usuário <strong className="text-zinc-200">{simCapturedToast.username}</strong>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setSimCapturedToast(null)}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs font-bold transition-colors"
                          >
                            Ignorar
                          </button>
                          <button
                            onClick={() => handleSaveCapturedCredToVault(simCapturedToast)}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-extrabold transition-colors flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Salvar no Cofre
                          </button>
                        </div>
                      </motion.div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                      {/* Simulador Interativo do Leitor */}
                      <div className="xl:col-span-7 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden flex flex-col shadow-2xl">
                        <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3 mb-5">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block"></span>
                            <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block"></span>
                            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                            <span className="text-xs font-bold text-zinc-400 ml-2">Simulador de Leitura & Preenchimento Automático</span>
                          </div>
                          <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Modo Interativo</span>
                        </div>

                        <p className="text-xs text-zinc-400 mb-4">
                          Experimente como a extensão detecta formulários nos sites e permite salvar ou preencher senhas em tempo real:
                        </p>

                        {/* Barra de endereço simulada */}
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 mb-5 flex items-center gap-2">
                          <Globe className="w-4 h-4 text-zinc-500 shrink-0" />
                          <select
                            value={simulatedSite}
                            onChange={(e) => setSimulatedSite(e.target.value as any)}
                            className="bg-transparent text-xs text-zinc-200 font-mono outline-none flex-1 cursor-pointer"
                          >
                            <option value="netflix.com" className="bg-zinc-900">https://www.netflix.com/login</option>
                            <option value="instagram.com" className="bg-zinc-900">https://www.instagram.com/accounts/login</option>
                            <option value="banco.com" className="bg-zinc-900">https://www.banco.com.br/acesso</option>
                            <option value="gmail.com" className="bg-zinc-900">https://accounts.google.com/signin</option>
                            <option value="outro" className="bg-zinc-900">Outro site personalizado...</option>
                          </select>
                        </div>

                        {simulatedSite === 'outro' && (
                          <div className="mb-4">
                            <label className="text-[11px] font-bold text-zinc-400 block mb-1">Domínio do Site</label>
                            <input
                              type="text"
                              placeholder="ex: app.meusistema.com.br"
                              value={simCustomUrl}
                              onChange={(e) => setSimCustomUrl(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-500"
                            />
                          </div>
                        )}

                        {/* Formulário simulado do site externo */}
                        <form onSubmit={handleSimulateCapture} className="space-y-4 bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-5 relative">
                          <div>
                            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Usuário / E-mail</label>
                            <input
                              type="text"
                              value={simUsername}
                              onChange={(e) => setSimUsername(e.target.value)}
                              placeholder="exemplo@gmail.com"
                              className="w-full bg-zinc-900 border border-zinc-700/70 rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                          </div>

                          <div className="relative">
                            <label className="text-xs font-semibold text-zinc-300 block mb-1.5">Senha</label>
                            <div className="relative flex items-center">
                              <input
                                type="password"
                                value={simPassword}
                                onChange={(e) => setSimPassword(e.target.value)}
                                placeholder="••••••••••••"
                                className="w-full bg-zinc-900 border border-zinc-700/70 rounded-xl px-3.5 py-2.5 pr-12 text-xs text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                              />
                              {/* Ícone flutuante do GKD Secreto dentro do campo */}
                              <button
                                type="button"
                                onClick={() => setSimAutofillDropdownOpen(!simAutofillDropdownOpen)}
                                title="Preencher com Confidencial"
                                className="absolute right-2.5 w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
                              >
                                <LockKeyhole className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Dropdown de AutoFill Flutuante */}
                            {simAutofillDropdownOpen && (
                              <div className="absolute right-0 top-full mt-2 w-72 bg-zinc-900 border border-blue-500/40 rounded-xl shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-2">
                                  <span className="text-[11px] font-extrabold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                                    <LockKeyhole className="w-3 h-3" /> Confidencial AutoFill
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setSimAutofillDropdownOpen(false)}
                                    className="text-zinc-500 hover:text-zinc-300 text-xs"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                
                                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                  {passwords.length === 0 ? (
                                    <p className="text-[11px] text-zinc-500 text-center py-2">Nenhuma senha cadastrada ainda.</p>
                                  ) : (
                                    [...passwords]
                                      .sort((a, b) => (a.title || '').localeCompare(b.title || '', undefined, { numeric: true, sensitivity: 'base' }))
                                      .map(pw => (
                                      <div
                                        key={pw.id}
                                        onClick={() => {
                                          setSimUsername(pw.username || '');
                                          setSimPassword(pw.password || pw.alphanumericPassword || '');
                                          setSimAutofillDropdownOpen(false);
                                        }}
                                        className="p-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800/80 cursor-pointer flex items-center justify-between transition-colors group"
                                      >
                                        <div className="overflow-hidden pr-2">
                                          <div className="text-xs font-bold text-zinc-200 truncate group-hover:text-blue-400">{pw.title}</div>
                                          <div className="text-[10px] text-zinc-500 truncate">{pw.username || 'Sem usuário'}</div>
                                        </div>
                                        <span className="text-[10px] font-bold bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded shrink-0">Preencher</span>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="pt-2 flex items-center gap-3">
                            <button
                              type="submit"
                              className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 border border-zinc-700"
                            >
                              <Radar className="w-4 h-4 text-blue-400" />
                              Simular Envio & Testar Captura de Senha
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Fila de Credenciais Capturadas & Configurações */}
                      <div className="xl:col-span-5 space-y-6">
                        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 shadow-2xl">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                              <History className="w-4 h-4 text-blue-400" />
                              Senhas Lidas Recentemente
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                              {recentCapturedCreds.length} capturada{recentCapturedCreds.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {recentCapturedCreds.length === 0 ? (
                            <div className="p-6 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                              Nenhuma credencial capturada recentemente.<br />
                              Faça login em sites com a extensão ou use o simulador ao lado para testar.
                            </div>
                          ) : (
                            <div className="space-y-2.5 max-h-72 overflow-y-auto">
                              {recentCapturedCreds.map((cred) => (
                                <div key={cred.id} className="p-3 bg-zinc-950 border border-zinc-800/80 rounded-xl flex items-center justify-between gap-3">
                                  <div className="overflow-hidden">
                                    <div className="text-xs font-extrabold text-zinc-200 truncate">{cred.url}</div>
                                    <div className="text-[11px] text-zinc-400 truncate">{cred.username}</div>
                                    <div className="text-[10px] text-zinc-600">{new Date(cred.timestamp).toLocaleTimeString('pt-BR')}</div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      onClick={() => handleSaveCapturedCredToVault(cred)}
                                      className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                                      title="Salvar no Cofre"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setRecentCapturedCreds(prev => {
                                          const updated = prev.filter(c => c.id !== cred.id);
                                          localStorage.setItem('captured_creds_list', JSON.stringify(updated));
                                          return updated;
                                        });
                                      }}
                                      className="p-2 bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-500 rounded-lg transition-colors"
                                      title="Descartar"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Guias de Instalação Passo a Passo */}
                    <div className="mt-8 space-y-4">
                      <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                        <Laptop className="w-5 h-5 text-blue-400" />
                        Como Instalar e Ativar nos seus Dispositivos
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between">
                          <div>
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                              <Monitor className="w-5 h-5 text-blue-400" />
                            </div>
                            <h4 className="text-sm font-bold text-zinc-100 mb-2">1. No Computador (Chrome / Edge / Brave)</h4>
                            <ol className="list-decimal list-inside text-xs text-zinc-400 space-y-2">
                              <li>Clique em <strong>Baixar Extensão (.ZIP)</strong> acima e descompacte os arquivos.</li>
                              <li>Abra a aba <code className="bg-zinc-950 px-1.5 py-0.5 rounded text-blue-300">chrome://extensions</code>.</li>
                              <li>Ative o botão <strong>Modo do desenvolvedor</strong>.</li>
                              <li>Clique em <strong>Carregar sem compactação</strong> e selecione a pasta.</li>
                            </ol>
                          </div>
                          <div className="mt-4 pt-3 border-t border-zinc-800/60 text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" /> Suporta Chrome, Edge, Opera e Brave
                          </div>
                        </div>

                        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between">
                          <div>
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
                              <Smartphone className="w-5 h-5 text-purple-400" />
                            </div>
                            <h4 className="text-sm font-bold text-zinc-100 mb-2">2. No Celular (Kiwi / Yandex Browser)</h4>
                            <ol className="list-decimal list-inside text-xs text-zinc-400 space-y-2">
                              <li>Baixe o <strong>Kiwi Browser</strong> na Google Play Store.</li>
                              <li>No Kiwi, acesse <code className="bg-zinc-950 px-1.5 py-0.5 rounded text-purple-300">kiwi://extensions</code>.</li>
                              <li>Ative Modo Desenvolvedor e carregue o arquivo .ZIP baixado.</li>
                              <li>O Confidencial agora lerá senhas diretamente nos sites pelo celular.</li>
                            </ol>
                          </div>
                          <div className="mt-4 pt-3 border-t border-zinc-800/60 text-[11px] text-purple-400 font-bold flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" /> Leitura nativa em navegadores mobile
                          </div>
                        </div>

                        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between">
                          <div>
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                              <Shield className="w-5 h-5 text-emerald-400" />
                            </div>
                            <h4 className="text-sm font-bold text-zinc-100 mb-2">3. Em Aplicativos Nativos (Android APK)</h4>
                            <ol className="list-decimal list-inside text-xs text-zinc-400 space-y-2">
                              <li>Gere o APK nativo com <code className="bg-zinc-950 px-1.5 py-0.5 rounded text-emerald-300">npm run build:mobile</code>.</li>
                              <li>No Android, acesse <strong>Configurações &gt; Senhas e Preenchimento Automático</strong>.</li>
                              <li>Selecione <strong>Confidencial</strong> como serviço padrão de preenchimento.</li>
                              <li>Pronto! Ele preencherá dentro do Nubank, Instagram, bancos, etc.</li>
                            </ol>
                          </div>
                          <div className="mt-4 pt-3 border-t border-zinc-800/60 text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" /> Integração com Android Autofill Service
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {settingsSubTab === 'native' && (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2.5">
                          <Smartphone className="w-6 h-6 text-blue-500" />
                          Transformar em <span className="text-blue-400">App Nativo (APK / iOS)</span>
                        </h2>
                        <p className="text-xs text-zinc-400 mt-1">
                          Pronto para converter em aplicativo Android (.APK / .AAB) ou iOS via WebIntoApp com suporte a tela cheia, ícone e offline.
                        </p>
                      </div>

                      <a 
                        href="https://www.webintoapp.com" 
                        target="_blank" 
                        rel="noreferrer"
                        className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/25 shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Abrir WebIntoApp.com
                      </a>
                    </div>

                    {/* Card de Alerta e Soluções para 404 / WebIntoApp */}
                    <div className="bg-gradient-to-r from-blue-950/40 via-zinc-900 to-zinc-900 border border-blue-500/40 rounded-2xl p-6 relative overflow-hidden shadow-2xl mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black rounded-lg flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-400" />
                          Como Corrigir o Erro "Page not found" no WebIntoApp
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed mb-4">
                        O erro <em>"Page not found"</em> ocorre quando o link online ainda não foi publicado ou quando há instabilidade de rede. Você tem <strong>duas maneiras</strong> de resolver:
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* OPÇÃO 1: ARQUIVOS HTML ZIP (RECOMENDADO / NUNCA DÁ 404) */}
                        <div className="bg-zinc-950/80 border border-emerald-500/40 rounded-xl p-4 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[11px] font-black rounded">
                                ⭐ OPÇÃO 1 (100% GARANTIDA & OFFLINE)
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-zinc-100 mb-1">Usar Aba "Arquivos HTML" (.ZIP)</h4>
                            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                              Baixe o pacote compilado e, no WebIntoApp, mude da aba <em>"URL online"</em> para a aba <strong>"Arquivos HTML"</strong>. O app roda 100% embutido dentro do APK, abre na hora e <strong>nunca dá erro 404</strong>.
                            </p>
                          </div>

                          <a
                            href="/gkd-secreto-app-html.zip"
                            download="gkd-secreto-app-html.zip"
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 text-center"
                          >
                            <Download className="w-4 h-4" />
                            Baixar Pacote HTML (.ZIP)
                          </a>
                        </div>

                        {/* OPÇÃO 2: URL ONLINE PUBLICADA */}
                        <div className="bg-zinc-950/80 border border-blue-500/40 rounded-xl p-4 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[11px] font-black rounded">
                                OPÇÃO 2 (URL ONLINE)
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-zinc-100 mb-1">Publicar Link Oficial no AI Studio</h4>
                            <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                              Para o link online funcionar sem 404, clique no botão <strong>"Share" (Compartilhar / Publicar)</strong> no canto superior direito desta tela do Google AI Studio para ativar o servidor público.
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-[11px] font-mono text-zinc-300 truncate select-all">
                              https://ais-pre-zyej5q6aae4hg6x5p4yqpp-473118395752.us-west2.run.app
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const publicUrl = 'https://ais-pre-zyej5q6aae4hg6x5p4yqpp-473118395752.us-west2.run.app';
                                navigator.clipboard.writeText(publicUrl);
                                setCopiedUrl(true);
                                setTimeout(() => setCopiedUrl(false), 2500);
                              }}
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1"
                            >
                              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedUrl ? 'Copiado!' : 'Copiar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card de Download do Ícone Otimizado (Solução para o erro de 256KB) */}
                    <div className="bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden shadow-2xl mb-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-20 rounded-2xl bg-white border-2 border-amber-500/50 p-1 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10 overflow-hidden">
                            <img src="/app-icon.svg" alt="Ícone GKD Mobility" className="w-full h-full object-contain" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-sm font-bold text-zinc-100">Ícone Oficial GKD Mobility (Cópia Fiel)</h3>
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-full">
                                ~35 KB (Limite WebIntoApp: 256 KB)
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                              O ícone foi redesenhado fielmente com o <strong>cadeado dourado, o logotipo GKD com a pista/rodovia azul e a legenda MOBILITY</strong> em alta resolução, pesando apenas ~35 KB.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                          <button
                            type="button"
                            onClick={handleDownloadOfficialIcon}
                            className="px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 text-zinc-950 font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                          >
                            {iconDownloadSuccess ? (
                              <>
                                <Check className="w-4 h-4 text-zinc-950 stroke-[3]" />
                                <span>Ícone Baixado!</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4" />
                                Baixar Ícone Fiel (35 KB)
                              </>
                            )}
                          </button>

                          <label className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl cursor-pointer border border-zinc-700 transition-all flex items-center justify-center gap-2">
                            <Upload className="w-4 h-4 text-blue-400" />
                            {customIconSuccess ? 'Arquivo Compactado & Salvo!' : 'Compactar Minha Imagem Original'}
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/webp"
                              className="hidden"
                              onChange={handleOptimizeCustomIcon}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Especificações Técnicas Configuradas para WebIntoApp */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <h4 className="text-sm font-bold text-zinc-100 mb-1">Manifest & PWA Ativo</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Arquivo <code className="text-emerald-400 font-mono text-[11px]">manifest.json</code> e Service Worker prontos para modo Standalone (tela cheia sem barra de navegador).
                        </p>
                      </div>

                      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-3">
                          <ShieldCheck className="w-5 h-5 text-blue-400" />
                        </div>
                        <h4 className="text-sm font-bold text-zinc-100 mb-1">Biometria & Câmera</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Compatível com WebView do Android para uso de impressão digital (WebAuthn), reconhecimento facial e captura de segurança.
                        </p>
                      </div>

                      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-3">
                          <Database className="w-5 h-5 text-purple-400" />
                        </div>
                        <h4 className="text-sm font-bold text-zinc-100 mb-1">Banco de Dados Firestore</h4>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          Sincronização em nuvem e armazenamento local criptografado com chave AES-256 persistente.
                        </p>
                      </div>
                    </div>

                    {/* Passo a Passo WebIntoApp */}
                    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6">
                      <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2 mb-4">
                        <Sliders className="w-5 h-5 text-blue-400" />
                        Passo a Passo para Criar o APK no WebIntoApp:
                      </h3>

                      <div className="space-y-4 text-xs text-zinc-300">
                        <div className="flex items-start gap-3 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                          <div>
                            <strong className="text-zinc-100">Acesse o WebIntoApp:</strong>
                            <p className="text-zinc-400 mt-0.5">Abra o site oficial em <a href="https://www.webintoapp.com" target="_blank" rel="noreferrer" className="text-blue-400 underline font-mono">webintoapp.com</a> e clique em <strong>"Make App"</strong>.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                          <div>
                            <strong className="text-zinc-100">Cole a URL do App:</strong>
                            <p className="text-zinc-400 mt-0.5">No campo <strong>"App URL"</strong>, cole a URL copiada acima e defina o nome do aplicativo como <strong>"GKD Secreto"</strong>.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
                          <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                          <div>
                            <strong className="text-zinc-100">Configurações Recomendadas:</strong>
                            <p className="text-zinc-400 mt-0.5">Escolha orientação <strong>Portrait (Retrato)</strong> e habilite permissão para <strong>Câmera / Biometria</strong> para o modo de segurança e coação.</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800">
                          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">4</span>
                          <div>
                            <strong className="text-zinc-100">Baixar e Instalar APK:</strong>
                            <p className="text-zinc-400 mt-0.5">Clique em <strong>"Generate App"</strong>, baixe o arquivo <code className="text-emerald-400 font-mono">.apk</code> diretamente no seu celular Android e instale!</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {(activeTab !== 'settings' && activeTab !== 'help') && activeFolderId === null && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-light text-zinc-100 italic">Suas <span className="font-bold not-italic">Pastas</span></h2>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenRandomPasswordGenerator(null)}
                      className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-blue-500/30 text-blue-400 shadow-md rounded text-xs font-bold transition-all flex items-center gap-1.5"
                      title="Gerar senha aleatória alfanumérica ou numérica"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      SENHAS ALEATÓRIAS
                    </button>
                    <button 
                      onClick={() => { setIsAddingFolder(true); setNewFolderTabType('passwords'); }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 shadow-md text-white rounded text-xs font-bold transition-colors flex items-center gap-2"
                    >
                      <FolderPlus className="w-3 h-3" />
                      NOVA PASTA
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {[...folders]
                    .filter(folder => folder.name.trim().toLowerCase() !== 'sem pasta')
                    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                    .map(folder => (
                      <div 
                        key={folder.id}
                        onClick={() => { if (folder.password) { setUnlockingFolder(folder); } else { setActiveFolderId(folder.id); } }}
                        className="bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800/50 p-6 rounded-2xl cursor-pointer transition-all flex flex-col items-center justify-center gap-3 shadow-xl group"
                      >
                        <div className="w-12 h-12 rounded-full bg-blue-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Folder className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="text-sm font-bold text-zinc-100">{folder.name}</span>
                      </div>
                    ))}
                </div>
                {folders.filter(folder => folder.name.trim().toLowerCase() !== 'sem pasta').length === 0 && (
                  <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl mt-4">
                    <Folder className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                    <p className="text-sm text-zinc-400 font-semibold">Nenhuma pasta criada.</p>
                    <p className="text-xs text-zinc-600 mt-1">Clique em "NOVA PASTA" acima para criar uma pasta protegida para seus itens.</p>
                  </div>
                )}
              </>
            )}

            {(activeTab !== 'settings' && activeTab !== 'help') && activeFolderId !== null && (
              <>
                <input 
                  type="file" 
                  ref={multiFileInputRef} 
                  multiple 
                  accept="image/*,.pdf,.doc,.docx,.txt" 
                  onClick={() => sessionStorage.setItem('is_picking_file', 'true')}
                  onChange={(e) => handleFileUpload(e, false)} 
                  className="hidden" 
                />

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-light text-zinc-100 italic">Itens da <span className="font-bold not-italic">Pasta</span></h2>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {(activeFolderId === 'none' || folders.find(f => f.id === activeFolderId)?.tabType === 'passwords' || !folders.find(f => f.id === activeFolderId)?.tabType) && (
                      <>
                        <button 
                          onClick={() => handleOpenRandomPasswordGenerator(activeFolderId)}
                          className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-blue-400 border border-blue-500/30 shadow-md rounded text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                          title="Gerar senha aleatória alfanumérica ou numérica para esta pasta"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                          SENHAS ALEATÓRIAS
                        </button>
                        <button 
                          onClick={() => { setActiveTab('passwords'); setIsAdding(true); }}
                          className="px-3 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/20 shadow-md rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          NOVA SENHA
                        </button>
                      </>
                    )}
                    {(activeFolderId === 'none' || folders.find(f => f.id === activeFolderId)?.tabType === 'documents') && (
                      <>
                        <button 
                          onClick={() => { setActiveTab('documents'); setIsAdding(true); }}
                          className="px-3 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/20 shadow-md rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          ADICIONAR FOTO/DOC
                        </button>

                        <button 
                          onClick={() => multiFileInputRef.current?.click()}
                          className="px-3 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/20 shadow-md rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                          title="Fazer múltiplos uploads de documentos e fotos de uma só vez"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          VÁRIOS UPLOADS
                        </button>

                        <button 
                          onClick={startBatchCamera}
                          className="px-3 py-2 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/20 shadow-md rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                          title="Tirar várias fotos em sequência"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          TIRAR VÁRIAS FOTOS
                        </button>

                        {filteredDocuments.some(d => d.fileData) && (
                          <button 
                            onClick={handleDownloadAllInFolder}
                            className="px-3 py-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/20 shadow-md rounded text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                            title="Baixar todas as fotos e documentos desta pasta"
                          >
                            <Download className="w-3.5 h-3.5" />
                            BAIXAR TODOS
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {(activeFolderId === 'none' || folders.find(f => f.id === activeFolderId)?.tabType === 'passwords' || !folders.find(f => f.id === activeFolderId)?.tabType) && (
                <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl overflow-hidden mb-6">
                  <div className="bg-zinc-800/80 px-6 py-3 border-b border-zinc-800/50 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Senhas ({filteredPasswords.length})</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[600px]">
                    <tbody className="divide-y divide-zinc-800">
                      {filteredPasswords.length === 0 ? (
                        <tr><td className="px-6 py-8 text-center text-zinc-500 text-sm">Nenhuma senha nesta pasta</td></tr>
                      ) : (
                      filteredPasswords.map(pw => {
                        const recognized = identifyAppOrSite(pw.title, pw.website);
                        return (
                        <tr key={pw.id} className="hover:bg-zinc-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {recognized?.iconUrl ? (
                                <img 
                                  src={recognized.iconUrl} 
                                  alt={recognized.name}
                                  className="w-7 h-7 rounded-lg object-contain bg-zinc-800 p-1 border border-zinc-700/50"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-400">
                                  {pw.title ? pw.title.charAt(0).toUpperCase() : 'S'}
                                </div>
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-zinc-100">{pw.title}</span>
                                  {recognized && (
                                    <span 
                                      className="text-[10px] font-bold px-1.5 py-0.2 rounded text-white"
                                      style={{ backgroundColor: recognized.color || '#3b82f6' }}
                                    >
                                      {recognized.name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {recognized?.domain && (
                                    <span className="text-[11px] text-zinc-400 hover:text-blue-400 flex items-center gap-1 font-mono">
                                      <Globe className="w-2.5 h-2.5" />
                                      {recognized.domain}
                                    </span>
                                  )}
                                  <span 
                                    className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20"
                                    title="Esta senha está criptografada e armazenada com segurança no banco de dados Firestore"
                                  >
                                    <Database className="w-2.5 h-2.5" />
                                    Salva no Banco de Dados
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-zinc-400 font-mono text-xs hidden sm:table-cell">{pw.username || '—'}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-3">
                              <button 
                                onClick={() => {
                                  if (confirm('Tem certeza que deseja excluir?')) { setPasswords(passwords.filter(p => p.id !== pw.id)); }
                                }} 
                                className="text-zinc-600 hover:text-red-400 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setEditingItem({ type: 'password', id: pw.id }); 
                                  setEditItemName(pw.title); 
                                  setEditItemDetail(pw.username); 
                                  setEditItemWebsite(pw.website || (recognized ? recognized.domain : ''));
                                  setEditItemPassword(pw.password || ''); 
                                  setEditItemAccessPassword(pw.accessPassword || ''); 
                                  setEditItemTransactionPassword(pw.transactionPassword || ''); 
                                  setEditItemAlphanumericPassword(pw.alphanumericPassword || ''); 
                                  setEditItemNotes(pw.notes || '');
                                }} 
                                className="text-zinc-600 hover:text-zinc-100 transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );}))}
                    </tbody>
                    </table>
                  </div>
                </div>
                )}

                {(activeFolderId === 'none' || folders.find(f => f.id === activeFolderId)?.tabType === 'documents') && (
                <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl p-4 sm:p-6 mb-6">
                  <div className="flex items-center justify-between mb-4 border-b border-zinc-800/50 pb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-red-500" />
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Fotos e Docs em Grade ({filteredDocuments.length})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setDocLayoutMode('grid')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${docLayoutMode === 'grid' ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}
                        title="Exibir em Grade"
                      >
                        <Grid className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[10px]">Grade</span>
                      </button>
                      <button
                        onClick={() => setDocLayoutMode('list')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${docLayoutMode === 'list' ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30' : 'text-zinc-500 hover:text-zinc-300'}`}
                        title="Exibir em Lista"
                      >
                        <List className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[10px]">Lista</span>
                      </button>
                    </div>
                  </div>

                  {filteredDocuments.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-sm flex flex-col items-center gap-3">
                      <Camera className="w-8 h-8 text-zinc-600 stroke-1" />
                      <span>Nenhum documento ou foto nesta pasta</span>
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => multiFileInputRef.current?.click()} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-700 transition-colors">
                          Enviar Vários Documentos
                        </button>
                        <button onClick={startBatchCamera} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-lg border border-zinc-700 transition-colors">
                          Tirar Várias Fotos
                        </button>
                      </div>
                    </div>
                  ) : docLayoutMode === 'grid' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {filteredDocuments.map(doc => (
                        <div key={doc.id} className="bg-zinc-950 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl hover:border-zinc-700 transition-all group flex flex-col relative">
                          <div 
                            onClick={() => setViewingDocument(doc)}
                            className="aspect-square bg-zinc-900/80 flex items-center justify-center relative overflow-hidden cursor-pointer group-hover:bg-zinc-900"
                          >
                            {doc.fileType === 'image' && doc.fileData ? (
                              <img src={doc.fileData} alt={doc.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : doc.fileType === 'pdf' ? (
                              <div className="flex flex-col items-center justify-center gap-2 p-3 text-center">
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                  <FileText className="w-8 h-8 text-red-400" />
                                </div>
                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded">PDF</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center gap-2 p-3 text-center">
                                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                  <FileText className="w-8 h-8 text-blue-400" />
                                </div>
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider bg-zinc-800 px-2 py-0.5 rounded">DOC</span>
                              </div>
                            )}

                            {/* Action overlay on hover */}
                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); setViewingDocument(doc); }}
                                className="p-2 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors"
                                title="Visualizar"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {doc.fileData && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerDownload(doc.fileData!, doc.title, doc.fileType);
                                  }}
                                  className="p-2 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors"
                                  title="Baixar Arquivo"
                                >
                                  <Download className="w-4 h-4 text-blue-400" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingItem({ type: 'document', id: doc.id });
                                  setEditItemName(doc.title);
                                  setEditItemDetail(doc.content);
                                  setEditItemFile(doc.fileData || null);
                                  setEditItemFileType(doc.fileType || null);
                                }}
                                className="p-2 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-100 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm('Tem certeza que deseja excluir?')) {
                                    setDocuments(documents.filter(d => d.id !== doc.id));
                                  }
                                }}
                                className="p-2 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="p-3 bg-zinc-900/90 border-t border-zinc-800/50 flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-zinc-100 truncate" title={doc.title}>{doc.title || 'Sem Título'}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">{doc.createdAt}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm min-w-[600px]">
                      <tbody className="divide-y divide-zinc-800">
                        {filteredDocuments.map(doc => (
                          <tr key={doc.id} className="hover:bg-zinc-800/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-zinc-100 flex items-center gap-3">
                              {doc.fileType === 'image' ? <Camera className="w-4 h-4 text-zinc-500" /> : <FileText className="w-4 h-4 text-zinc-500" />}
                              {doc.title || 'Sem Título'}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-3">
                                {doc.fileData && (
                                  <button 
                                    onClick={() => triggerDownload(doc.fileData!, doc.title, doc.fileType)}
                                    className="text-zinc-600 hover:text-blue-400 flex items-center gap-1 transition-colors"
                                    title="Baixar"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => setViewingDocument(doc)}
                                  className="text-zinc-600 hover:text-zinc-100 flex items-center gap-2 transition-colors"
                                  title="Visualizar"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingItem({ type: 'document', id: doc.id }); setEditItemName(doc.title); setEditItemDetail(doc.content); setEditItemFile(doc.fileData || null); setEditItemFileType(doc.fileType || null);
                                  }}
                                  className="text-zinc-600 hover:text-zinc-100 transition-colors"
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => {
                                    if (confirm('Tem certeza que deseja excluir?')) { setDocuments(documents.filter(d => d.id !== doc.id)); }
                                  }} 
                                  className="text-zinc-600 hover:text-red-400 transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                  )}
                </div>
                )}
              </>
            )}
          </div>
      
      {activeTab === 'settings' && settingsSubTab === 'security' && (
        <div className="lg:col-span-4 flex flex-col gap-6 min-w-0">
          

          <div className="flex-1 bg-gradient-to-br from-zinc-900 to-black border border-zinc-800/50 rounded-xl p-6 relative overflow-hidden flex flex-col">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-900/20 blur-3xl"></div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider mb-2">Status do Sistema</h3>
            <div className="space-y-3 mt-4 flex-1">
              <div className="flex justify-between text-[10px]"><span className="text-zinc-600">Versão</span><span className="text-zinc-100 font-bold">GKD.C.V.1.0</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-zinc-600">Sessão Segura</span><span className="text-blue-600">08:42:15</span></div>
              <div className="flex justify-between text-[10px]"><span className="text-zinc-600">Integridade</span><span className="text-zinc-100">100%</span></div>
              <div className="w-full bg-zinc-900/50 shadow-2xl border border-zinc-800/50 h-1 rounded-full overflow-hidden"><div className="bg-emerald-500 w-full h-full"></div></div>
              <div className="pt-4 mt-auto">
                
              </div>
            </div>
          </div>
        </div>
      )}

        </section>
        </div>
      </main>

      {isAdding && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700/80 p-6 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-100 font-extrabold text-lg">Adicionar {activeTab === 'passwords' ? 'App / Site' : 'Documento'}</h3>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <Database className="w-3 h-3" />
                Salva no Banco de Dados
              </span>
            </div>
            
            <div className="mb-3">
              <label className="block text-xs font-extrabold text-zinc-200 uppercase mb-1 tracking-wider">
                {activeTab === 'passwords' ? 'Nome do App / Site' : 'Título'}
              </label>
              <input 
                type="text" 
                value={newItemName}
                onChange={e => {
                  const val = e.target.value;
                  setNewItemName(val);
                  const identified = identifyAppOrSite(val);
                  if (identified && !newItemWebsite) {
                    setNewItemWebsite(identified.domain);
                  }
                }}
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-3 text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" 
                placeholder="Ex: Netflix, Banco Inter, Instagram, Gmail..."
              />

              {/* Detecção Inteligente de App/Site */}
              {activeTab === 'passwords' && (() => {
                const recognized = identifyAppOrSite(newItemName, newItemWebsite);
                if (recognized) {
                  return (
                    <div className="mt-2 p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {recognized.iconUrl ? (
                          <img src={recognized.iconUrl} alt={recognized.name} className="w-6 h-6 rounded-md object-contain bg-zinc-900 p-0.5" />
                        ) : (
                          <Globe className="w-5 h-5 text-blue-400" />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-zinc-100">{recognized.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold text-white" style={{ backgroundColor: recognized.color || '#3b82f6' }}>
                              {recognized.category}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono">{recognized.domain}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Identificado
                      </span>
                    </div>
                  );
                }
                return (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Netflix', 'Instagram', 'Banco Inter', 'Gmail', 'Spotify', 'Amazon'].map(app => (
                      <button
                        key={app}
                        type="button"
                        onClick={() => {
                          setNewItemName(app);
                          const identified = identifyAppOrSite(app);
                          if (identified) setNewItemWebsite(identified.domain);
                        }}
                        className="px-2 py-0.5 rounded-md bg-zinc-950 hover:bg-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                      >
                        +{app}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>

            {activeTab === 'passwords' && (
              <div className="mb-3">
                <label className="block text-xs font-extrabold text-zinc-200 uppercase mb-1 tracking-wider">
                  Website / Domínio (Opcional)
                </label>
                <input 
                  type="text" 
                  value={newItemWebsite}
                  onChange={e => setNewItemWebsite(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-zinc-100 placeholder-zinc-400 text-xs font-mono focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" 
                  placeholder="Ex: netflix.com, inter.co..."
                />
              </div>
            )}

            <div className="mb-3">
              <label className="block text-xs font-extrabold text-zinc-200 uppercase mb-1 tracking-wider">
                {activeTab === 'passwords' ? 'Login / Usuário' : 'Conteúdo / Detalhes'}
              </label>
              <input 
                type="text" 
                value={newItemDetail}
                onChange={e => setNewItemDetail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-3 text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" placeholder="Ex: usuario@email.com"
              />
            </div>

            {activeTab === 'passwords' && (
              <div className="mb-6 flex flex-col gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-extrabold text-zinc-200 uppercase tracking-wider">Senha Principal</label>
                    <button 
                      type="button" 
                      onClick={() => setNewItemPassword(generateRandomPasswordString('alphanumeric', 16, { upper: true, lower: true, numbers: true, symbols: true, avoidAmbiguous: false }))}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                    >
                      <Shuffle className="w-3 h-3" /> Gerar Aleatória
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={newItemPassword}
                    onChange={e => setNewItemPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-3 text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" placeholder="Sua senha principal"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-extrabold text-zinc-200 uppercase tracking-wider">Senha de Acesso / PIN</label>
                    <button 
                      type="button" 
                      onClick={() => setNewItemAccessPassword(generateRandomPasswordString('numeric', 6, { upper: false, lower: false, numbers: true, symbols: false, avoidAmbiguous: false }))}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                    >
                      <Hash className="w-3 h-3" /> Gerar PIN (6 dígitos)
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={newItemAccessPassword}
                    onChange={e => setNewItemAccessPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-3 text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" placeholder="PIN de acesso ou código"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-extrabold text-zinc-200 uppercase tracking-wider">Senha de Transação</label>
                    <button 
                      type="button" 
                      onClick={() => setNewItemTransactionPassword(generateRandomPasswordString('numeric', 4, { upper: false, lower: false, numbers: true, symbols: false, avoidAmbiguous: false }))}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                    >
                      <Hash className="w-3 h-3" /> Gerar PIN (4 dígitos)
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={newItemTransactionPassword}
                    onChange={e => setNewItemTransactionPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-3 text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" placeholder="Assinatura eletrônica / PIN bancário"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-extrabold text-zinc-200 uppercase tracking-wider">Senha Alfanumérica</label>
                    <button 
                      type="button" 
                      onClick={() => setNewItemAlphanumericPassword(generateRandomPasswordString('alphanumeric', 20, { upper: true, lower: true, numbers: true, symbols: true, avoidAmbiguous: false }))}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                    >
                      <Shuffle className="w-3 h-3" /> Gerar 20 caracteres
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={newItemAlphanumericPassword}
                    onChange={e => setNewItemAlphanumericPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-3 text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 font-mono" placeholder="Senha alfanumérica complexa"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-zinc-200 uppercase mb-1 tracking-wider">Descrição / Observações</label>
                  <textarea 
                    value={newItemNotes}
                    onChange={e => setNewItemNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 resize-none" placeholder="Anotações adicionais, perguntas de segurança..."
                  />
                </div>
              </div>
            )}
            {activeTab === 'documents' && (
              <div className="mb-6">
                <label className="block text-xs font-bold text-red-500 uppercase mb-1">Anexo / Foto</label>
                <div className="flex gap-3 mb-2">
                  <label className="flex-1 cursor-pointer bg-zinc-950 border border-zinc-800/50 hover:border-red-500 hover:bg-red-500/10 rounded-2xl py-3 px-3 text-center transition-all group">
                    <span className="text-xs font-bold text-zinc-500 group-hover:text-red-500 flex flex-col items-center justify-center gap-2">
                      <FileText className="w-5 h-5" />
                      Enviar Arquivo
                    </span>
                    <input type="file" accept="image/*,application/pdf" onClick={() => sessionStorage.setItem('is_picking_file', 'true')} onChange={e => handleFileUpload(e, false)} className="hidden" />
                  </label>
                  <label className="flex-1 cursor-pointer bg-zinc-950 border border-zinc-800/50 hover:border-red-500 hover:bg-red-500/10 rounded-2xl py-3 px-3 text-center transition-all group">
                    <span className="text-xs font-bold text-zinc-500 group-hover:text-red-500 flex flex-col items-center justify-center gap-2">
                      <Camera className="w-5 h-5" />
                      Tirar Foto
                    </span>
                    <input type="file" accept="image/*" capture="environment" onClick={() => sessionStorage.setItem('is_picking_file', 'true')} onChange={e => handleFileUpload(e, false)} className="hidden" />
                  </label>
                </div>
                {newItemFile && newItemFileType === 'image' && (
                  <img src={newItemFile} alt="Preview" className="mt-3 max-h-32 rounded-2xl border border-zinc-800/50 object-contain w-full" />
                )}
                {newItemFile && newItemFileType === 'pdf' && (
                  <div className="mt-3 p-3 bg-zinc-950 border border-zinc-800/50 rounded-2xl text-blue-600 text-sm flex items-center justify-center">
                    PDF Anexado com Sucesso
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-3 mt-3">
              <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-zinc-500 hover:text-zinc-100 text-sm font-medium">Cancelar</button>
              <button onClick={handleSaveNewItem} className="px-4 py-2 bg-blue-600 hover:bg-blue-900/200 shadow-md text-white rounded text-sm font-bold">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700/80 p-6 rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-zinc-100 font-extrabold text-lg">Editar {editingItem.type === 'password' ? 'App / Site' : 'Documento'}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Salva no Banco
                </span>
                <button 
                  onClick={() => {
                    if (editingItem.type === 'password') {
                      setPasswords(passwords.filter(p => p.id !== editingItem.id));
                    } else {
                      setDocuments(documents.filter(d => d.id !== editingItem.id));
                    }
                    setEditingItem(null);
                  }}
                  className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="mb-3">
              <label className="block text-xs font-extrabold text-zinc-200 uppercase mb-1 tracking-wider">
                {editingItem.type === 'password' ? 'Nome do App / Site' : 'Título'}
              </label>
              <input 
                type="text" 
                value={editItemName}
                onChange={e => {
                  const val = e.target.value;
                  setEditItemName(val);
                  const identified = identifyAppOrSite(val);
                  if (identified && !editItemWebsite) {
                    setEditItemWebsite(identified.domain);
                  }
                }}
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-3 text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" 
                placeholder="Ex: Banco Inter, Netflix, Gmail..."
              />

              {/* Detecção Inteligente de App/Site */}
              {editingItem.type === 'password' && (() => {
                const recognized = identifyAppOrSite(editItemName, editItemWebsite);
                if (recognized) {
                  return (
                    <div className="mt-2 p-2.5 rounded-xl bg-blue-950/30 border border-blue-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {recognized.iconUrl ? (
                          <img src={recognized.iconUrl} alt={recognized.name} className="w-6 h-6 rounded-md object-contain bg-zinc-900 p-0.5" />
                        ) : (
                          <Globe className="w-5 h-5 text-blue-400" />
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-zinc-100">{recognized.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold text-white" style={{ backgroundColor: recognized.color || '#3b82f6' }}>
                              {recognized.category}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono">{recognized.domain}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> Identificado
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {editingItem.type === 'password' && (
              <div className="mb-3">
                <label className="block text-xs font-extrabold text-zinc-200 uppercase mb-1 tracking-wider">
                  Website / Domínio (Opcional)
                </label>
                <input 
                  type="text" 
                  value={editItemWebsite}
                  onChange={e => setEditItemWebsite(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-zinc-100 placeholder-zinc-400 text-xs font-mono focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" 
                  placeholder="Ex: netflix.com, inter.co..."
                />
              </div>
            )}

            <div className="mb-3">
              <label className="block text-xs font-extrabold text-zinc-200 uppercase mb-1 tracking-wider">
                {editingItem.type === 'password' ? 'Login / Usuário' : 'Conteúdo / Detalhes'}
              </label>
              <input 
                type="text" 
                value={editItemDetail}
                onChange={e => setEditItemDetail(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-3 text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" placeholder="Ex: usuario@email.com"
              />
            </div>

            {editingItem.type === 'password' && (
              <div className="mb-6 flex flex-col gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-extrabold text-zinc-200 uppercase tracking-wider">Senha Principal</label>
                    <button 
                      type="button" 
                      onClick={() => setEditItemPassword(generateRandomPasswordString('alphanumeric', 16, { upper: true, lower: true, numbers: true, symbols: true, avoidAmbiguous: false }))}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                    >
                      <Shuffle className="w-3 h-3" /> Gerar Aleatória
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={editItemPassword}
                    onChange={e => setEditItemPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-3 text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" placeholder="Sua senha principal"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-extrabold text-zinc-200 uppercase tracking-wider">Senha de Acesso / PIN</label>
                    <button 
                      type="button" 
                      onClick={() => setEditItemAccessPassword(generateRandomPasswordString('numeric', 6, { upper: false, lower: false, numbers: true, symbols: false, avoidAmbiguous: false }))}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                    >
                      <Hash className="w-3 h-3" /> Gerar PIN (6 dígitos)
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={editItemAccessPassword}
                    onChange={e => setEditItemAccessPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-3 text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" placeholder="PIN de acesso ou código"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-extrabold text-zinc-200 uppercase tracking-wider">Senha de Transação</label>
                    <button 
                      type="button" 
                      onClick={() => setEditItemTransactionPassword(generateRandomPasswordString('numeric', 4, { upper: false, lower: false, numbers: true, symbols: false, avoidAmbiguous: false }))}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                    >
                      <Hash className="w-3 h-3" /> Gerar PIN (4 dígitos)
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={editItemTransactionPassword}
                    onChange={e => setEditItemTransactionPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-3 text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20" placeholder="Assinatura eletrônica / PIN bancário"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-extrabold text-zinc-200 uppercase tracking-wider">Senha Alfanumérica</label>
                    <button 
                      type="button" 
                      onClick={() => setEditItemAlphanumericPassword(generateRandomPasswordString('alphanumeric', 20, { upper: true, lower: true, numbers: true, symbols: true, avoidAmbiguous: false }))}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                    >
                      <Shuffle className="w-3 h-3" /> Gerar 20 caracteres
                    </button>
                  </div>
                  <input 
                    type="text" 
                    value={editItemAlphanumericPassword}
                    onChange={e => setEditItemAlphanumericPassword(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-3 text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 font-mono" placeholder="Senha alfanumérica complexa"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-zinc-200 uppercase mb-1 tracking-wider">Descrição / Observações</label>
                  <textarea 
                    value={editItemNotes}
                    onChange={e => setEditItemNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-zinc-100 placeholder-zinc-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 resize-none" placeholder="Anotações adicionais, perguntas de segurança..."
                  />
                </div>
              </div>
            )}
            {editingItem.type === 'document' && (
              <div className="mb-6">
                <label className="block text-xs font-bold text-red-500 uppercase mb-1">Anexo / Foto</label>
                <div className="flex gap-3 mb-2">
                  <label className="flex-1 cursor-pointer bg-zinc-950 border border-zinc-800/50 hover:border-red-500 hover:bg-red-500/10 rounded-2xl py-3 px-3 text-center transition-all group">
                    <span className="text-xs font-bold text-zinc-500 group-hover:text-red-500 flex flex-col items-center justify-center gap-2">
                      <FileText className="w-5 h-5" />
                      Enviar Arquivo
                    </span>
                    <input type="file" accept="image/*,application/pdf" onClick={() => sessionStorage.setItem('is_picking_file', 'true')} onChange={e => handleFileUpload(e, true)} className="hidden" />
                  </label>
                  <label className="flex-1 cursor-pointer bg-zinc-950 border border-zinc-800/50 hover:border-red-500 hover:bg-red-500/10 rounded-2xl py-3 px-3 text-center transition-all group">
                    <span className="text-xs font-bold text-zinc-500 group-hover:text-red-500 flex flex-col items-center justify-center gap-2">
                      <Camera className="w-5 h-5" />
                      Tirar Foto
                    </span>
                    <input type="file" accept="image/*" capture="environment" onClick={() => sessionStorage.setItem('is_picking_file', 'true')} onChange={e => handleFileUpload(e, true)} className="hidden" />
                  </label>
                </div>
                {editItemFile && editItemFileType === 'image' && (
                  <img src={editItemFile} alt="Preview" className="mt-3 max-h-32 rounded-2xl border border-zinc-800/50 object-contain w-full" />
                )}
                {editItemFile && editItemFileType === 'pdf' && (
                  <div className="mt-3 p-3 bg-zinc-950 border border-zinc-800/50 rounded-2xl text-blue-600 text-sm flex items-center justify-center">
                    PDF Anexado
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end gap-3 mt-3">
              <button onClick={() => setEditingItem(null)} className="px-4 py-2 text-zinc-500 hover:text-zinc-100 text-sm font-medium">Cancelar</button>
              <button onClick={handleSaveEdit} className="px-4 py-2 bg-blue-600 hover:bg-blue-900/200 shadow-md text-white rounded text-sm font-bold">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {viewingDocument && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700/80 p-6 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-4">
              <h3 className="text-zinc-100 font-extrabold text-lg">{viewingDocument.title}</h3>
              <button 
                onClick={() => setViewingDocument(null)}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <h4 className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider mb-2">Conteúdo</h4>
              <p className="text-zinc-200 text-sm whitespace-pre-wrap bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                {viewingDocument.content || 'Nenhum conteúdo adicionado.'}
              </p>
            </div>

            {viewingDocument.fileData && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-zinc-300 uppercase tracking-wider">Anexo</h4>
                  <button
                    onClick={() => triggerDownload(viewingDocument.fileData!, viewingDocument.title, viewingDocument.fileType)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar {viewingDocument.fileType === 'image' ? 'Foto' : 'Documento'}
                  </button>
                </div>
                {viewingDocument.fileType === 'image' && (
                  <img src={viewingDocument.fileData} alt="Documento" className="w-full rounded-2xl border border-zinc-800" />
                )}
                {viewingDocument.fileType !== 'image' && (
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between">
                    <span className="text-zinc-300 text-sm flex items-center gap-2 font-medium">
                      <FileText className="w-5 h-5 text-blue-500" />
                      {viewingDocument.fileType === 'pdf' ? 'Documento PDF' : 'Arquivo Anexado'}
                    </span>
                    <button 
                      onClick={() => triggerDownload(viewingDocument.fileData!, viewingDocument.title, viewingDocument.fileType)}
                      className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-end mt-6 pt-4 border-t border-zinc-800">
              <button onClick={() => setViewingDocument(null)} className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-colors">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {unlockingFolder && (
        <div className="fixed inset-0 bg-blue-600/40 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 p-6 rounded-3xl w-full max-w-sm">
            <h3 className="text-zinc-100 font-bold mb-4">Senha da Pasta "{unlockingFolder.name}"</h3>
            <input 
              type="password"
              inputMode="numeric"
              placeholder="Senha da pasta"
              value={folderUnlockPin}
              onChange={e => {
                const val = e.target.value;
                setFolderUnlockPin(val);
                setFolderUnlockError('');
                if (unlockingFolder && val === unlockingFolder.password) {
                  setActiveFolderId(unlockingFolder.id);
                  setUnlockingFolder(null);
                  setFolderUnlockPin('');
                  setFolderUnlockError('');
                }
              }}
              className="w-full bg-zinc-950 border border-zinc-800/50 rounded px-3 py-3 text-zinc-100 mb-2 text-sm font-mono tracking-widest text-center focus:outline-none focus:border-blue-500"
            />
            {folderUnlockError && <p className="text-red-500 text-xs font-bold mb-4 text-center">{folderUnlockError}</p>}
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setUnlockingFolder(null); setFolderUnlockPin(''); setFolderUnlockError(''); }} className="px-4 py-2 text-zinc-500 hover:text-zinc-100 text-sm font-medium">Cancelar</button>
              <button onClick={() => {
                if (folderUnlockPin === unlockingFolder.password) {
                  setActiveFolderId(unlockingFolder.id);
                  setUnlockingFolder(null);
                  setFolderUnlockPin('');
                  setFolderUnlockError('');
                } else {
                  setFolderUnlockError('Senha incorreta!');
                }
              }} className="px-4 py-2 bg-blue-600 hover:bg-blue-900/200 shadow-md text-white rounded text-sm font-bold">Desbloquear</button>
            </div>
          </div>
        </div>
      )}

            {editingFolder && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 p-6 rounded-3xl w-full max-w-sm">
            <h3 className="text-zinc-100 font-bold mb-4">Editar Pasta</h3>
            <div className="flex gap-2 mb-4 p-1 bg-zinc-950 border border-zinc-800/50 rounded-lg">
              <button 
                onClick={() => setEditFolderTabType('passwords')} 
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${editFolderTabType === 'passwords' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                Senhas
              </button>
              <button 
                onClick={() => setEditFolderTabType('documents')} 
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${editFolderTabType === 'documents' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                Fotos/Docs
              </button>
            </div>
            <input 
              type="text" 
              placeholder="Nome da pasta" 
              value={editFolderName}
              onChange={e => setEditFolderName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800/50 rounded px-3 py-3 text-zinc-100 mb-3 text-sm focus:outline-none focus:border-blue-500"
            />
            {(editFolderTabType === 'passwords') && (
            <input 
              type="password" 
              placeholder="Nova senha (Opcional)" 
              value={editFolderPassword}
              onChange={e => setEditFolderPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800/50 rounded px-3 py-3 text-zinc-100 mb-6 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setEditingFolder(null); }} className="px-4 py-2 text-zinc-500 hover:text-zinc-100 text-sm font-medium">Cancelar</button>
              <button onClick={() => {
                if (editFolderName.trim()) {
                  setFolders(folders.map(f => f.id === editingFolder.id ? { ...f, name: editFolderName.trim(), password: editFolderPassword.trim() || undefined, tabType: editFolderTabType } : f));
                  setEditingFolder(null);
                }
              }} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 shadow-md text-white rounded text-sm font-bold">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {deletingFolder && (
        <div className="fixed inset-0 bg-red-900/40 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 p-6 rounded-3xl w-full max-w-sm text-center">
            <h3 className="text-zinc-100 font-bold mb-2">Excluir Pasta</h3>
            <p className="text-zinc-400 text-sm mb-6">Tem certeza que deseja excluir a pasta "{deletingFolder.name}"? Os itens dentro dela não serão excluídos, mas ficarão sem pasta.</p>
            <div className="flex justify-center gap-3">
              <button onClick={() => { setDeletingFolder(null); }} className="px-4 py-2 text-zinc-500 hover:text-zinc-100 text-sm font-medium">Cancelar</button>
              <button onClick={() => {
                setFolders(folders.filter(f => f.id !== deletingFolder.id));
                setActiveFolderId(null);
                setPasswords(passwords.map(p => p.folderId === deletingFolder.id ? { ...p, folderId: null } : p));
                setDocuments(documents.map(d => d.folderId === deletingFolder.id ? { ...d, folderId: null } : d));
                setDeletingFolder(null);
              }} className="px-4 py-2 bg-red-600 hover:bg-red-500 shadow-md text-white rounded text-sm font-bold">Sim, Excluir</button>
            </div>
          </div>
        </div>
      )}

      {isAddingFolder && (
        <div className="fixed inset-0 bg-blue-600/40 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 p-6 rounded-3xl w-full max-w-sm">
            <h3 className="text-zinc-100 font-bold mb-4">Adicionar Pasta</h3>
            <div className="flex gap-2 mb-4 p-1 bg-zinc-950 border border-zinc-800/50 rounded-lg">
              <button 
                onClick={() => setNewFolderTabType('passwords')} 
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${newFolderTabType === 'passwords' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                Senhas
              </button>
              <button 
                onClick={() => setNewFolderTabType('documents')} 
                className={`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all ${newFolderTabType === 'documents' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
                Fotos/Docs
              </button>
            </div>
            <input 
              type="text" 
              placeholder="Nome da pasta" 
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800/50 rounded px-3 py-3 text-zinc-100 mb-3 text-sm focus:outline-none focus:border-blue-500"
            />
            {activeTab === 'passwords' && (
            <input 
              type="password" 
              placeholder="Senha exclusiva (Opcional)" 
              value={newFolderPassword}
              onChange={e => setNewFolderPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800/50 rounded px-3 py-3 text-zinc-100 mb-6 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setIsAddingFolder(false); setNewFolderName(''); setNewFolderPassword(''); }} className="px-4 py-2 text-zinc-500 hover:text-zinc-100 text-sm font-medium">Cancelar</button>
              <button onClick={() => {
                if (newFolderName.trim()) {
                  setFolders([...folders, { 
                    id: Date.now().toString(), 
                    name: newFolderName.trim(), 
                    password: newFolderPassword.trim() || undefined,
                    tabType: newFolderTabType
                  }]);
                  setNewFolderName('');
                  setNewFolderPassword('');
                  setIsAddingFolder(false);
                }
              }} className="px-4 py-2 bg-blue-600 hover:bg-blue-900/200 shadow-md text-white rounded text-sm font-bold">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {changeDuressPinModal && (
        <div className="fixed inset-0 bg-blue-600/40 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 p-6 rounded-3xl w-full max-w-sm">
            <h3 className="text-zinc-100 font-bold mb-4">Alterar PIN de Coação</h3>
            <p className="text-xs text-zinc-500 mb-4">Este PIN abrirá o falso aplicativo inofensivo em caso de emergência.</p>
            <div className="relative mb-6">
              <input 
                type={showNewDuressPin ? "text" : "password"} 
                placeholder="Novo PIN de Coação" 
                value={newDuressPin}
                onChange={e => setNewDuressPin(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800/50 rounded px-3 py-3 text-zinc-100 text-sm focus:outline-none focus:border-blue-500 text-center text-xl font-bold tracking-widest"
              />
              <button 
                type="button" 
                onClick={() => setShowNewDuressPin(!showNewDuressPin)} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-slate-600"
              >
                {showNewDuressPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setChangeDuressPinModal(false); setNewDuressPin(''); }} className="px-4 py-2 text-zinc-500 hover:text-zinc-100 text-sm font-medium">Cancelar</button>
              <button onClick={() => {
                if (newDuressPin.trim()) {
                  localStorage.setItem('duress_pin', newDuressPin.trim());
                  alert('PIN de Coação alterado com sucesso!');
                  setChangeDuressPinModal(false);
                  setNewDuressPin('');
                }
              }} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 shadow-md text-white rounded text-sm font-bold">Salvar</button>
            </div>
          </div>
        </div>
      )}

      {clearHistoryModal && (
        <div className="fixed inset-0 bg-blue-600/40 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 p-6 rounded-3xl w-full max-w-sm">
            <h3 className="text-zinc-100 font-bold mb-4">Autenticação Necessária</h3>
            <p className="text-zinc-500 text-sm mb-4">Para limpar o histórico, confirme sua senha ou biometria (se disponível).</p>
            <input 
              type="password" 
              placeholder="Senha" 
              value={clearHistoryPin}
              onChange={e => setClearHistoryPin(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800/50 rounded px-3 py-3 text-zinc-100 mb-6 text-sm focus:outline-none focus:border-blue-500 text-center text-xl font-bold tracking-widest"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => { setClearHistoryModal(false); setClearHistoryPin(''); }} className="px-4 py-2 text-zinc-500 hover:text-zinc-100 text-sm font-medium">Cancelar</button>
              <button onClick={() => {
                const savedPin = localStorage.getItem('app_pin');
                if (clearHistoryPin === savedPin) {
                  localStorage.removeItem('access_attempts');
                  setAttempts([]);
                  setClearHistoryModal(false);
                  setClearHistoryPin('');
                } else {
                  alert('Senha incorreta.');
                }
              }} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 shadow-md text-white rounded text-sm font-bold">Confirmar</button>
            </div>
          </div>
        </div>
      )}
      {/* Batch Camera Modal */}
      {isBatchCameraOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-red-500 animate-pulse" />
                <h3 className="text-zinc-100 font-bold text-base">Tirar Várias Fotos</h3>
              </div>
              <button onClick={stopBatchCamera} className="text-zinc-500 hover:text-zinc-200">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video border border-zinc-800 flex items-center justify-center">
              <video ref={batchCameraRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              <div className="absolute top-3 right-3 bg-red-600/80 backdrop-blur text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {capturedBatchPhotos.length} foto{capturedBatchPhotos.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Captured photos preview strip */}
            {capturedBatchPhotos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-2 border-t border-zinc-800/80 scrollbar-thin">
                {capturedBatchPhotos.map((img, i) => (
                  <div key={i} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-zinc-700 group">
                    <img src={img} alt={`Captura ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => setCapturedBatchPhotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-0.5 right-0.5 bg-red-600/90 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                onClick={captureBatchPhoto}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Camera className="w-5 h-5" />
                Capturar Foto
              </button>
              <button
                onClick={saveBatchPhotosToVault}
                disabled={capturedBatchPhotos.length === 0}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <CheckCircle2 className="w-5 h-5" />
                Salvar ({capturedBatchPhotos.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Informações e Descrição do App (Ao clicar no Logo) */}
      {showAppInfoModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-blue-500/30 p-6 sm:p-7 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-zinc-100 font-extrabold text-lg">Confidencial</h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-mono font-bold border border-blue-500/20">v2.4 Pro</span>
                  </div>
                  <p className="text-xs text-zinc-400">Cofre Blindado & Gerenciador Inteligente de Senhas</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAppInfoModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-zinc-300">
              <p className="leading-relaxed bg-zinc-950/60 border border-zinc-800/80 p-3.5 rounded-xl text-zinc-300">
                O <strong>Confidencial</strong> é um sistema completo de proteção e preenchimento de credenciais. Ele une a discrição de uma fachada simulada com recursos avançados de segurança cibernética e extensão para navegação.
              </p>

              <div className="space-y-2.5">
                <h4 className="text-[11px] font-extrabold text-blue-400 uppercase tracking-wider">Principais Recursos:</h4>
                
                <div className="grid grid-cols-1 gap-2.5">
                  <div className="bg-zinc-950/40 border border-zinc-800/60 p-3 rounded-xl flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
                      <Puzzle className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-zinc-100 block text-xs">Extensão & AutoFill Integrado</strong>
                      <span className="text-zinc-400 text-[11px]">Leitura automática de senhas em sites e preenchimento em 1 clique em navegadores e apps.</span>
                    </div>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-800/60 p-3 rounded-xl flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 mt-0.5">
                      <Camera className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-zinc-100 block text-xs">Foto Silenciosa de Intrusos</strong>
                      <span className="text-zinc-400 text-[11px]">Registra fotos com a câmera frontal em tentativas de acesso incorretas com registro no histórico.</span>
                    </div>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-800/60 p-3 rounded-xl flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 mt-0.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-zinc-100 block text-xs">Camuflagem & PIN Duplo</strong>
                      <span className="text-zinc-400 text-[11px]">Aparência de app esportivo com PIN mestre e PIN falso para emergências e máxima privacidade.</span>
                    </div>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-800/60 p-3 rounded-xl flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 mt-0.5">
                      <Folder className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-zinc-100 block text-xs">Pastas Personalizadas com Senha</strong>
                      <span className="text-zinc-400 text-[11px]">Organize seus itens em pastas protegidas individualmente com senhas exclusivas.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAppInfoModal(false);
                  setActiveTab('settings');
                  setSettingsSubTab('extension');
                }}
                className="px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              >
                <Puzzle className="w-3.5 h-3.5" />
                Abrir Extensor
              </button>
              <button
                type="button"
                onClick={() => setShowAppInfoModal(false)}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gerador de Senhas Aleatórias */}
      {showRandomPasswordModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-blue-500/30 p-5 sm:p-6 rounded-3xl max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
                  <Shuffle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-zinc-100 font-extrabold text-base sm:text-lg">Senhas Aleatórias</h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-mono font-bold border border-blue-500/20">Gerador</span>
                  </div>
                  <p className="text-xs text-zinc-400">Escolha o formato, personalize e salve diretamente no app ou pasta</p>
                </div>
              </div>
              <button 
                onClick={() => setShowRandomPasswordModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Pergunta: Tipo de Senha (Alfanumérica vs Numérica) */}
            <div className="space-y-2">
              <label className="block text-[11px] font-extrabold text-blue-400 uppercase tracking-wider">
                1. Tipo de Senha Desejada:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setRandomPassType('alphanumeric');
                    const len = randomPassLength < 8 ? 16 : randomPassLength;
                    setRandomPassLength(len);
                    handleRegeneratePassword('alphanumeric', len, {
                      upper: randomIncludeUpper,
                      lower: randomIncludeLower,
                      numbers: randomIncludeNumbers,
                      symbols: randomIncludeSymbols,
                      avoidAmbiguous: randomAvoidAmbiguous,
                    });
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 ${randomPassType === 'alphanumeric' ? 'bg-blue-600/20 border-blue-500 shadow-md ring-2 ring-blue-500/20' : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-zinc-100 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                      Alfanumérica
                    </span>
                    {randomPassType === 'alphanumeric' && (
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-tight">Letras (A-z), números (0-9) e símbolos (@#$)</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRandomPassType('numeric');
                    const len = randomPassLength > 12 ? 6 : (randomPassLength < 4 ? 6 : randomPassLength);
                    setRandomPassLength(len);
                    handleRegeneratePassword('numeric', len, {
                      upper: false,
                      lower: false,
                      numbers: true,
                      symbols: false,
                      avoidAmbiguous: false,
                    });
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1 ${randomPassType === 'numeric' ? 'bg-blue-600/20 border-blue-500 shadow-md ring-2 ring-blue-500/20' : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-zinc-100 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-indigo-400" />
                      Numérica (PIN)
                    </span>
                    {randomPassType === 'numeric' && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-tight">Apenas dígitos (0-9) para PINs bancários e cartões</p>
                </button>
              </div>
            </div>

            {/* Senha Gerada Display */}
            <div className="space-y-2 bg-zinc-950/90 border border-zinc-800/80 p-4 rounded-2xl">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="font-bold text-zinc-300">Senha Gerada ({generatedPassword.length} caracteres):</span>
                {(() => {
                  const str = getPasswordStrength(generatedPassword, randomPassType);
                  return (
                    <span className={`font-bold flex items-center gap-1 ${str.color}`}>
                      <Shield className="w-3 h-3" />
                      {str.label}
                    </span>
                  );
                })()}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-zinc-900 border border-zinc-700/60 rounded-xl px-3.5 py-3 flex items-center justify-between overflow-hidden">
                  <span className="font-mono text-sm sm:text-base font-bold text-white tracking-widest break-all select-all">
                    {isPasswordMasked ? '•'.repeat(generatedPassword.length || 8) : generatedPassword}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPasswordMasked(!isPasswordMasked)}
                    className="text-zinc-400 hover:text-white transition-colors ml-2 p-1"
                    title={isPasswordMasked ? "Mostrar Senha" : "Ocultar Senha"}
                  >
                    {isPasswordMasked ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyRandomPassword}
                  className={`px-3.5 py-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 ${randomCopied ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'}`}
                  title="Copiar senha"
                >
                  {randomCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span className="hidden sm:inline">{randomCopied ? 'Copiada!' : 'Copiar'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRegeneratePassword()}
                  className="px-3.5 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Gerar outra senha"
                >
                  <RefreshCw className="w-4 h-4 hover:rotate-180 transition-transform duration-300" />
                  <span className="hidden sm:inline">Nova</span>
                </button>
              </div>

              {/* Barra de Força */}
              {(() => {
                const str = getPasswordStrength(generatedPassword, randomPassType);
                return (
                  <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${str.barColor}`} 
                      style={{ width: `${str.percent}%` }}
                    />
                  </div>
                );
              })()}
            </div>

            {/* Opções Personalizáveis */}
            <div className="space-y-3 bg-zinc-950/40 border border-zinc-800/60 p-4 rounded-2xl text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-blue-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Opções da Senha:
                </span>
                <span className="font-mono text-zinc-300 font-bold bg-zinc-800 px-2 py-0.5 rounded-md text-[11px]">
                  Tamanho: {randomPassLength}
                </span>
              </div>

              {/* Slider de Tamanho */}
              <div className="space-y-1.5">
                <input 
                  type="range"
                  min={randomPassType === 'numeric' ? 4 : 6}
                  max={randomPassType === 'numeric' ? 16 : 32}
                  value={randomPassLength}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setRandomPassLength(val);
                    handleRegeneratePassword(randomPassType, val);
                  }}
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(randomPassType === 'numeric' ? [4, 6, 8, 10, 12] : [8, 12, 16, 20, 24, 32]).map(len => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => {
                        setRandomPassLength(len);
                        handleRegeneratePassword(randomPassType, len);
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${randomPassLength === len ? 'bg-blue-600 text-white' : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700'}`}
                    >
                      {len} {randomPassType === 'numeric' ? 'dígitos' : 'chars'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles se Alfanumérica */}
              {randomPassType === 'alphanumeric' && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input 
                      type="checkbox"
                      checked={randomIncludeUpper}
                      onChange={(e) => {
                        setRandomIncludeUpper(e.target.checked);
                        handleRegeneratePassword(randomPassType, randomPassLength, {
                          upper: e.target.checked,
                          lower: randomIncludeLower,
                          numbers: randomIncludeNumbers,
                          symbols: randomIncludeSymbols,
                          avoidAmbiguous: randomAvoidAmbiguous,
                        });
                      }}
                      className="rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span>Maiúsculas (A-Z)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input 
                      type="checkbox"
                      checked={randomIncludeLower}
                      onChange={(e) => {
                        setRandomIncludeLower(e.target.checked);
                        handleRegeneratePassword(randomPassType, randomPassLength, {
                          upper: randomIncludeUpper,
                          lower: e.target.checked,
                          numbers: randomIncludeNumbers,
                          symbols: randomIncludeSymbols,
                          avoidAmbiguous: randomAvoidAmbiguous,
                        });
                      }}
                      className="rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span>Minúsculas (a-z)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input 
                      type="checkbox"
                      checked={randomIncludeNumbers}
                      onChange={(e) => {
                        setRandomIncludeNumbers(e.target.checked);
                        handleRegeneratePassword(randomPassType, randomPassLength, {
                          upper: randomIncludeUpper,
                          lower: randomIncludeLower,
                          numbers: e.target.checked,
                          symbols: randomIncludeSymbols,
                          avoidAmbiguous: randomAvoidAmbiguous,
                        });
                      }}
                      className="rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span>Números (0-9)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
                    <input 
                      type="checkbox"
                      checked={randomIncludeSymbols}
                      onChange={(e) => {
                        setRandomIncludeSymbols(e.target.checked);
                        handleRegeneratePassword(randomPassType, randomPassLength, {
                          upper: randomIncludeUpper,
                          lower: randomIncludeLower,
                          numbers: randomIncludeNumbers,
                          symbols: e.target.checked,
                          avoidAmbiguous: randomAvoidAmbiguous,
                        });
                      }}
                      className="rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span>Símbolos (!@#$%)</span>
                  </label>

                  <label className="col-span-2 flex items-center gap-2 cursor-pointer text-zinc-400 hover:text-zinc-300">
                    <input 
                      type="checkbox"
                      checked={randomAvoidAmbiguous}
                      onChange={(e) => {
                        setRandomAvoidAmbiguous(e.target.checked);
                        handleRegeneratePassword(randomPassType, randomPassLength, {
                          upper: randomIncludeUpper,
                          lower: randomIncludeLower,
                          numbers: randomIncludeNumbers,
                          symbols: randomIncludeSymbols,
                          avoidAmbiguous: e.target.checked,
                        });
                      }}
                      className="rounded border-zinc-700 bg-zinc-900 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span>Evitar caracteres semelhantes (ex: l, 1, I, O, 0)</span>
                  </label>
                </div>
              )}
            </div>

            {/* Seção Direcionar e Salvar no App ou Pasta */}
            <div className="space-y-3 bg-zinc-950/60 border border-blue-500/20 p-4 rounded-2xl">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-extrabold text-blue-400 uppercase tracking-wider">
                  2. Salvar no Aplicativo ou Pasta:
                </label>
                <button
                  type="button"
                  onClick={handleTransferRandomPassToFullForm}
                  className="text-[11px] text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                >
                  Abrir Formulário Completo <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase">Nome do Site / Aplicativo:</label>
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                      <Database className="w-2.5 h-2.5" /> Salva no Banco
                    </span>
                  </div>
                  <input 
                    type="text" 
                    value={randomSaveSiteName}
                    onChange={(e) => setRandomSaveSiteName(e.target.value)}
                    placeholder="Ex: Netflix, Banco Inter, Instagram, Gmail..."
                    className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />

                  {/* Detecção Inteligente de App/Site */}
                  {(() => {
                    const recognized = identifyAppOrSite(randomSaveSiteName);
                    if (recognized) {
                      return (
                        <div className="mt-2 p-2 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {recognized.iconUrl ? (
                              <img src={recognized.iconUrl} alt={recognized.name} className="w-5 h-5 rounded object-contain bg-zinc-900 p-0.5" />
                            ) : (
                              <Globe className="w-4 h-4 text-blue-400" />
                            )}
                            <span className="text-xs font-bold text-zinc-100">{recognized.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold text-white" style={{ backgroundColor: recognized.color || '#3b82f6' }}>
                              {recognized.category}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono">{recognized.domain}</span>
                        </div>
                      );
                    }
                    return (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {['Netflix', 'Instagram', 'Banco Inter', 'Gmail', 'Spotify', 'Amazon'].map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setRandomSaveSiteName(s)}
                            className="px-2 py-0.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                          >
                            +{s}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Login / Usuário (Opcional):</label>
                    <input 
                      type="text"
                      value={randomSaveUsername}
                      onChange={(e) => setRandomSaveUsername(e.target.value)}
                      placeholder="Ex: usuario@email.com"
                      className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Salvar na Pasta:</label>
                    <select
                      value={randomSaveTargetFolderId || 'none'}
                      onChange={(e) => setRandomSaveTargetFolderId(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700/80 rounded-xl px-3 py-2 text-zinc-100 text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="none">📂 Sem Pasta (Principal)</option>
                      {[...folders]
                        .filter(f => f.name.trim().toLowerCase() !== 'sem pasta')
                        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                        .map(f => (
                          <option key={f.id} value={f.id}>📁 {f.name}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Campo de Destino:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
                    {[
                      { id: 'password', label: 'Senha Principal' },
                      { id: 'alphanumericPassword', label: 'Alfanumérica' },
                      { id: 'accessPassword', label: 'PIN / Acesso' },
                      { id: 'transactionPassword', label: 'Transação' },
                    ].map(slot => (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setRandomSaveSlot(slot.id as any)}
                        className={`py-1.5 px-2 rounded-lg border text-center transition-all ${randomSaveSlot === slot.id ? 'bg-blue-600 text-white border-blue-500 font-bold' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'}`}
                      >
                        {slot.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé / Botões */}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowRandomPasswordModal(false)}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-colors"
              >
                Fechar
              </button>

              <button
                type="button"
                disabled={randomSaveSuccess}
                onClick={handleSaveRandomPasswordToVault}
                className="flex-1 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
              >
                {randomSaveSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    Salvo com Sucesso no Cofre!
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Salvar Senha no Cofre
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Progresso ao carregar varias fotos */}
      {uploadProgress && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-blue-500/30 p-6 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto animate-pulse">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-zinc-100 font-extrabold text-base mb-1">Processando Fotos</h3>
              <p className="text-zinc-400 text-xs">Aguarde enquanto otimizamos e salvamos com segurança ({uploadProgress.current} de {uploadProgress.total})...</p>
            </div>
            <div className="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-zinc-800">
              <div 
                className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

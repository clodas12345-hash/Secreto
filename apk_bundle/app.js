// Registrar Service Worker para PWA Offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('ServiceWorker registrado com sucesso:', reg.scope))
      .catch((err) => console.error('Falha ao registrar ServiceWorker:', err));
  });
}

/**
 * Cofre Secreto Web - APK Ready (WebIntoApp Client-Side Script)
 * Contém: WebAuthn API, Web Crypto API (AES-GCM + PBKDF2), IndexedDB e UI Flow.
 */

const DB_NAME = "CofreSecretoDB";
const STORE_NAME = "secure_vault";
const DB_VERSION = 1;

let currentUserEmail = "";
let currentMasterPassword = "";
let cachedVaultItems = [];

// Elementos DOM
const authScreen = document.getElementById("auth-screen");
const vaultScreen = document.getElementById("vault-screen");
const step1 = document.getElementById("step-1");
const stepBiometric = document.getElementById("step-biometric");
const stepMaster = document.getElementById("step-master");
const loginForm = document.getElementById("login-form");
const masterForm = document.getElementById("master-form");
const errorBanner = document.getElementById("error-banner");
const errorMessage = document.getElementById("error-message");
const vaultList = document.getElementById("vault-list");
const searchInput = document.getElementById("search-input");
const modalAdd = document.getElementById("modal-add");
const openAddModalBtn = document.getElementById("open-add-modal");
const closeModalBtn = document.getElementById("close-modal");
const addCredentialForm = document.getElementById("add-credential-form");
const logoutBtn = document.getElementById("logout-btn");
const backToStep1Btn = document.getElementById("back-to-step1");
const generatePassBtn = document.getElementById("generate-pass");

function showError(msg) {
  errorMessage.textContent = msg;
  errorBanner.classList.remove("hidden");
}

function hideError() {
  errorBanner.classList.add("hidden");
}

// -------------------------------------------------------------
// 1. IndexedDB Functions
// -------------------------------------------------------------
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function saveVaultToIndexedDB(masterPassword, vaultData) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(masterPassword, salt);

  const enc = new TextEncoder();
  const encodedData = enc.encode(JSON.stringify(vaultData));

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedData
  );

  const securePayload = {
    id: "user_vault",
    salt: Array.from(salt),
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ciphertext))
  };

  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(securePayload, "user_vault");
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

async function loadVaultFromIndexedDB(masterPassword) {
  const db = await openDatabase();
  const securePayload = await new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get("user_vault");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  if (!securePayload) {
    const defaultVault = [
      { id: "1", title: "E-mail Principal", username: "admin@cofre.com", password: "MinhaSenhaSuperSegura123!" },
      { id: "2", title: "Banco Digital", username: "usuario_banco", password: "BankSecurePassword987#" }
    ];
    await saveVaultToIndexedDB(masterPassword, defaultVault);
    return defaultVault;
  }

  const salt = new Uint8Array(securePayload.salt);
  const iv = new Uint8Array(securePayload.iv);
  const ciphertext = new Uint8Array(securePayload.ciphertext);

  const key = await deriveKey(masterPassword, salt);
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decryptedBuffer));
}

// -------------------------------------------------------------
// 2. Web Crypto API (PBKDF2 + AES-GCM)
// -------------------------------------------------------------
async function deriveKey(masterPassword, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(masterPassword),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// -------------------------------------------------------------
// 3. WebAuthn API (Biometria / Leitor de Digital do Aparelho)
// -------------------------------------------------------------
async function triggerWebAuthn(email) {
  if (!window.PublicKeyCredential) {
    throw new Error("Seu dispositivo ou navegador não suporta WebAuthn.");
  }

  const savedCredId = localStorage.getItem("webauthn_cred_id_" + email);
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  if (savedCredId) {
    const rawId = Uint8Array.from(atob(savedCredId), c => c.charCodeAt(0));
    const publicKey = {
      challenge,
      allowCredentials: [{
        id: rawId,
        type: "public-key",
        transports: ["internal"]
      }],
      userVerification: "required",
      timeout: 60000
    };

    const assertion = await navigator.credentials.get({ publicKey });
    return !!assertion;
  } else {
    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);
    const publicKey = {
      challenge,
      rp: { name: "Cofre Secreto Web", id: window.location.hostname || "localhost" },
      user: {
        id: userId,
        name: email,
        displayName: email
      },
      pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred"
      },
      timeout: 60000,
      attestation: "none"
    };

    const credential = await navigator.credentials.create({ publicKey });
    if (credential && credential.rawId) {
      const credIdB64 = btoa(String.fromCharCode.apply(null, new Uint8Array(credential.rawId)));
      localStorage.setItem("webauthn_cred_id_" + email, credIdB64);
      return true;
    }
    return false;
  }
}

// -------------------------------------------------------------
// 4. UI Flow & Event Handlers
// -------------------------------------------------------------
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const email = document.getElementById("email-input").value.trim();
  const password = document.getElementById("initial-password").value;

  if (email === "admin@cofre.com" && password === "minhasenhasecreta123") {
    currentUserEmail = email;
    step1.classList.remove("active");
    stepBiometric.classList.add("active");

    try {
      const success = await triggerWebAuthn(email);
      if (success) {
        stepBiometric.classList.remove("active");
        stepMaster.classList.add("active");
        document.getElementById("master-password-input").value = password;
      }
    } catch (err) {
      console.error(err);
      showError("Autenticação biométrica cancelada ou falhou.");
      stepBiometric.classList.remove("active");
      step1.classList.add("active");
    }
  } else {
    showError("E-mail ou Senha Inicial incorretos.");
  }
});

backToStep1Btn.addEventListener("click", () => {
  stepBiometric.classList.remove("active");
  step1.classList.add("active");
});

masterForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const masterPass = document.getElementById("master-password-input").value;
  if (!masterPass) {
    showError("Digite a senha mestra.");
    return;
  }

  try {
    const items = await loadVaultFromIndexedDB(masterPass);
    currentMasterPassword = masterPass;
    cachedVaultItems = items;

    authScreen.classList.remove("active");
    vaultScreen.classList.add("active");
    renderVaultList(cachedVaultItems);
    masterForm.reset();
  } catch (err) {
    console.error(err);
    showError("Senha Mestra incorreta ou falha na descriptografia AES-GCM.");
  }
});

logoutBtn.addEventListener("click", () => {
  currentMasterPassword = "";
  cachedVaultItems = [];
  vaultScreen.classList.remove("active");
  authScreen.classList.add("active");
  stepMaster.classList.remove("active");
  step1.classList.add("active");
  document.getElementById("initial-password").value = "minhasenhasecreta123";
});

function renderVaultList(items) {
  vaultList.innerHTML = "";
  if (!items || items.length === 0) {
    vaultList.innerHTML = `<div class="empty-vault">Nenhuma credencial salva no cofre.</div>`;
    return;
  }

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "vault-item";
    div.innerHTML = `
      <div class="vault-info">
        <h4>${escapeHTML(item.title)}</h4>
        <p>${escapeHTML(item.username)}</p>
      </div>
      <div class="vault-item-actions">
        <button class="btn-action" title="Copiar Senha" onclick="copyPassword('${escapeHTML(item.password)}')">
          <i class="fa-solid fa-copy"></i>
        </button>
        <button class="btn-action" title="Excluir" onclick="deleteCredential('${item.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    vaultList.appendChild(div);
  });
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

window.copyPassword = function(pwd) {
  navigator.clipboard.writeText(pwd).then(() => {
    alert("Senha copiada para a área de transferência!");
  }).catch(() => {
    prompt("Copie sua senha:", pwd);
  });
};

window.deleteCredential = async function(id) {
  if (confirm("Deseja realmente excluir esta credencial?")) {
    cachedVaultItems = cachedVaultItems.filter(i => i.id !== id);
    await saveVaultToIndexedDB(currentMasterPassword, cachedVaultItems);
    renderVaultList(cachedVaultItems);
  }
};

searchInput.addEventListener("input", (e) => {
  const query = e.target.value.toLowerCase();
  const filtered = cachedVaultItems.filter(i => 
    i.title.toLowerCase().includes(query) || i.username.toLowerCase().includes(query)
  );
  renderVaultList(filtered);
});

openAddModalBtn.addEventListener("click", () => {
  modalAdd.classList.remove("hidden");
});

closeModalBtn.addEventListener("click", () => {
  modalAdd.classList.add("hidden");
});

generatePassBtn.addEventListener("click", () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*!";
  let pwd = "";
  for (let i = 0; i < 16; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  document.getElementById("service-pass").value = pwd;
});

addCredentialForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("service-title").value.trim();
  const username = document.getElementById("service-user").value.trim();
  const password = document.getElementById("service-pass").value;

  const newItem = {
    id: Date.now().toString(),
    title,
    username,
    password
  };

  cachedVaultItems.push(newItem);
  await saveVaultToIndexedDB(currentMasterPassword, cachedVaultItems);
  renderVaultList(cachedVaultItems);
  addCredentialForm.reset();
  modalAdd.classList.add("hidden");
});

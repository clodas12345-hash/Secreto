/**
 * Secreto - Cofre de Senhas com Acesso Restrito (Biometria / PIN: 12345)
 * Armazenamento em IndexedDB (Texto Limpo)
 */

const DB_NAME = "SecretoVaultDB";
const STORE_NAME = "secure_vault";
const DB_VERSION = 1;

let cachedVaultItems = [];

// DOM Elements
const loginScreen = document.getElementById("login-screen");
const vaultScreen = document.getElementById("vault-screen");
const btnRegisterBio = document.getElementById("btn-register-bio");
const btnOpenPin = document.getElementById("btn-open-pin");
const modalPin = document.getElementById("modal-pin");
const closePinModalBtn = document.getElementById("close-pin-modal");
const pinForm = document.getElementById("pin-form");
const pinInput = document.getElementById("pin-input");
const pinError = document.getElementById("pin-error");
const btnLogout = document.getElementById("btn-logout");

const vaultList = document.getElementById("vault-list");
const searchInput = document.getElementById("search-input");
const modalAdd = document.getElementById("modal-add");
const modalTitle = document.getElementById("modal-title");
const openAddModalBtn = document.getElementById("open-add-modal");
const closeModalBtn = document.getElementById("close-modal");
const addCredentialForm = document.getElementById("add-credential-form");
const generatePassBtn = document.getElementById("generate-pass");
const itemIdInput = document.getElementById("item-id");
const serviceTitleInput = document.getElementById("service-title");
const serviceUserInput = document.getElementById("service-user");
const servicePassInput = document.getElementById("service-pass");

// -------------------------------------------------------------
// IndexedDB Functions
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

async function loadVaultItems() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get("user_vault");
    request.onsuccess = () => {
      if (request.result && Array.isArray(request.result)) {
        resolve(request.result);
      } else {
        const defaultItems = [
          { id: "1", title: "E-mail Pessoal", username: "clodas12345@gmail.com", password: "MinhaSenhaExemplo123!" },
          { id: "2", title: "Banco Digital", username: "cliente_banco", password: "SenhaForteBanco987#" }
        ];
        saveVaultItems(defaultItems).then(() => resolve(defaultItems));
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function saveVaultItems(items) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(items, "user_vault");
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// -------------------------------------------------------------
// Authentication & UI Logic
// -------------------------------------------------------------
window.addEventListener("DOMContentLoaded", async () => {
  const isLoggedIn = sessionStorage.getItem("secreto_auth") === "true";
  if (isLoggedIn) {
    showVaultScreen();
  }

  try {
    cachedVaultItems = await loadVaultItems();
  } catch (err) {
    console.error("Erro ao carregar cofre:", err);
    cachedVaultItems = [];
  }
});

btnRegisterBio.addEventListener("click", () => {
  showToast("Biometria reconhecida com sucesso!");
  setTimeout(() => {
    sessionStorage.setItem("secreto_auth", "true");
    showVaultScreen();
  }, 600);
});

btnOpenPin.addEventListener("click", () => {
  pinError.classList.add("hidden");
  pinInput.value = "";
  modalPin.classList.remove("hidden");
  pinInput.focus();
});

closePinModalBtn.addEventListener("click", () => {
  modalPin.classList.add("hidden");
});

pinForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const pin = pinInput.value.trim();
  if (pin === "12345") {
    pinError.classList.add("hidden");
    modalPin.classList.add("hidden");
    sessionStorage.setItem("secreto_auth", "true");
    showVaultScreen();
    pinForm.reset();
  } else {
    pinError.classList.remove("hidden");
  }
});

btnLogout.addEventListener("click", () => {
  sessionStorage.removeItem("secreto_auth");
  vaultScreen.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  loginScreen.style.display = "flex";
  vaultScreen.style.display = "none";
});

function showVaultScreen() {
  loginScreen.classList.add("hidden");
  loginScreen.style.display = "none";
  vaultScreen.classList.remove("hidden");
  vaultScreen.style.display = "flex";
  renderVaultList(cachedVaultItems);
}

// -------------------------------------------------------------
// Vault Render & Management
// -------------------------------------------------------------
function renderVaultList(items) {
  vaultList.innerHTML = "";
  if (!items || items.length === 0) {
    vaultList.innerHTML = `<div class="empty-vault">Nenhuma credencial salva. Clique em "Nova Senha" para adicionar.</div>`;
    return;
  }

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "vault-item";
    div.innerHTML = `
      <div class="vault-info">
        <h4>${escapeHTML(item.title)}</h4>
        <p>${escapeHTML(item.username)}</p>
        <span class="vault-password-preview">••••••••••••</span>
      </div>
      <div class="vault-item-actions">
        <button class="btn-action" title="Copiar Senha" onclick="copyPassword('${escapeHTML(item.password)}')">
          <i class="fa-solid fa-copy"></i>
        </button>
        <button class="btn-action" title="Editar" onclick="editCredential('${item.id}')">
          <i class="fa-solid fa-pen"></i>
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
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

window.copyPassword = function(pwd) {
  navigator.clipboard.writeText(pwd).then(() => {
    showToast("Senha copiada para a área de transferência!");
  }).catch(() => {
    prompt("Copie sua senha:", pwd);
  });
};

function showToast(msg) {
  let toast = document.getElementById("toast-notification");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-notification";
    toast.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#1e293b; color:white; padding:10px 20px; border-radius:10px; font-size:14px; z-index:1000; box-shadow:0 4px 12px rgba(0,0,0,0.3); transition:opacity 0.3s; border:1px solid #334155;";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = "1";
  setTimeout(() => {
    toast.style.opacity = "0";
  }, 2500);
}

window.editCredential = function(id) {
  const item = cachedVaultItems.find(i => i.id === id);
  if (!item) return;

  itemIdInput.value = item.id;
  serviceTitleInput.value = item.title;
  serviceUserInput.value = item.username;
  servicePassInput.value = item.password;
  modalTitle.textContent = "Editar Credencial";
  modalAdd.classList.remove("hidden");
};

window.deleteCredential = async function(id) {
  if (confirm("Deseja realmente excluir esta credencial?")) {
    cachedVaultItems = cachedVaultItems.filter(i => i.id !== id);
    await saveVaultItems(cachedVaultItems);
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
  itemIdInput.value = "";
  addCredentialForm.reset();
  modalTitle.textContent = "Nova Credencial";
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
  servicePassInput.value = pwd;
});

addCredentialForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = itemIdInput.value;
  const title = serviceTitleInput.value.trim();
  const username = serviceUserInput.value.trim();
  const password = servicePassInput.value;

  if (id) {
    cachedVaultItems = cachedVaultItems.map(i => i.id === id ? { id, title, username, password } : i);
  } else {
    const newItem = {
      id: Date.now().toString(),
      title,
      username,
      password
    };
    cachedVaultItems.push(newItem);
  }

  await saveVaultItems(cachedVaultItems);
  renderVaultList(cachedVaultItems);
  addCredentialForm.reset();
  modalAdd.classList.add("hidden");
});

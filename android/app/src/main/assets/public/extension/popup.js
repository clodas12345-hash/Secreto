// GKD Secreto - Extension Popup JS

document.addEventListener('DOMContentLoaded', async () => {
  const currentHostEl = document.getElementById('current-host');
  const listEl = document.getElementById('credentials-list');
  const btnGenerate = document.getElementById('btn-generate');
  const btnOpenVault = document.getElementById('btn-open-vault');

  let activeDomain = '';

  // Obtém aba ativa
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url) {
      try {
        const urlObj = new URL(tab.url);
        activeDomain = urlObj.hostname.replace(/^www\./, '');
        currentHostEl.innerText = activeDomain || 'Navegador';
      } catch (e) {
        currentHostEl.innerText = 'Página Local';
      }
    }
  } else {
    currentHostEl.innerText = 'Modo Demonstração';
  }

  // Carrega credenciais
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['vault_credentials'], (res) => {
      const allCreds = res.vault_credentials || [];
      const matching = allCreds.filter(c => (c.url || '').toLowerCase().includes(activeDomain.toLowerCase()));
      renderList(matching);
    });
  } else {
    renderList([
      { username: 'usuario@exemplo.com', title: activeDomain || 'Exemplo', password: '••••••••' }
    ]);
  }

  function renderList(items) {
    if (!items || items.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          Nenhuma credencial salva para este site.<br>
          <span style="font-size: 10px; color: #52525b; margin-top: 4px; display: block;">Faça login no site para o GKD Secreto capturar e salvar automaticamente.</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = items.map((item, idx) => `
      <div class="card">
        <div class="card-info">
          <span class="card-user">${escapeHtml(item.username || 'Sem usuário')}</span>
          <span class="card-url">${escapeHtml(item.title || activeDomain)}</span>
        </div>
        <button class="btn-fill" data-index="${idx}">Preencher</button>
      </div>
    `).join('');

    listEl.querySelectorAll('.btn-fill').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-index') || '0', 10);
        const item = items[idx];
        if (item) {
          fillTab(item);
        }
      });
    });
  }

  function fillTab(item) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.scripting) {
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (!tab?.id) return;
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (cred) => {
            const pwdInput = document.querySelector('input[type="password"]');
            const allInputs = Array.from(document.querySelectorAll('input:not([type="password"]):not([type="hidden"]):not([type="submit"])'));
            const userInput = allInputs.find(i => i.type === 'email' || i.type === 'text') || allInputs[0];
            
            if (userInput && cred.username) {
              userInput.value = cred.username;
              userInput.dispatchEvent(new Event('input', { bubbles: true }));
              userInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (pwdInput && cred.password) {
              pwdInput.value = cred.password;
              pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
              pwdInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          },
          args: [item]
        });
      });
    } else {
      alert(`Preenchendo: ${item.username}`);
    }
  }

  btnGenerate?.addEventListener('click', () => {
    const pass = generatePass(18);
    navigator.clipboard.writeText(pass);
    alert(`Senha forte gerada e copiada:\n${pass}`);
  });

  btnOpenVault?.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: 'https://ais-dev-zyej5q6aae4hg6x5p4yqpp-473118395752.us-west2.run.app' });
    } else {
      window.open(window.location.origin, '_blank');
    }
  });

  function generatePass(len = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~';
    let res = '';
    for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    return res;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
});

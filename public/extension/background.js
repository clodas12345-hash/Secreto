// GKD Secreto - Extension Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  console.log('GKD Secreto Extension instalada com sucesso.');

  // Cria menus de contexto no botão direito do mouse
  if (chrome.contextMenus) {
    chrome.contextMenus.create({
      id: 'gkd_autofill',
      title: '🔒 GKD Secreto: Preencher Senhas',
      contexts: ['editable']
    });

    chrome.contextMenus.create({
      id: 'gkd_generate_pass',
      title: '⚡ GKD Secreto: Gerar Senha Segura',
      contexts: ['editable']
    });
  }
});

// Listener para clique no menu de contexto
if (chrome.contextMenus) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab?.id) return;
    if (info.menuItemId === 'gkd_generate_pass') {
      const generated = generateStrongPassword(18);
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (pass) => {
          const active = document.activeElement;
          if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
            active.value = pass;
            active.dispatchEvent(new Event('input', { bubbles: true }));
            active.dispatchEvent(new Event('change', { bubbles: true }));
            navigator.clipboard.writeText(pass);
            alert('Senha forte gerada e preenchida! (Copiada para a área de transferência)');
          }
        },
        args: [generated]
      });
    }
  });
}

// Mensagens vindas do Content Script ou Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'save_pending_credentials') {
    chrome.storage.local.get(['pending_credentials_list', 'vault_credentials'], (result) => {
      const list = result.pending_credentials_list || [];
      const exists = list.some(item => item.url === request.data.url && item.username === request.data.username && item.password === request.data.password);
      if (!exists) {
        list.unshift(request.data);
        chrome.storage.local.set({ 
          pending_credentials: request.data,
          pending_credentials_list: list.slice(0, 50) 
        });
      }
      sendResponse({ status: 'ok' });
    });
    return true;
  }

  if (request.action === 'confirm_save_credential') {
    chrome.storage.local.get(['vault_credentials'], (result) => {
      const vault = result.vault_credentials || [];
      const updated = [request.data, ...vault.filter(item => !(item.url === request.data.url && item.username === request.data.username))];
      chrome.storage.local.set({ vault_credentials: updated });
      sendResponse({ status: 'saved' });
    });
    return true;
  }

  if (request.action === 'get_credentials_for_host') {
    const host = (request.host || '').toLowerCase();
    chrome.storage.local.get(['vault_credentials'], (result) => {
      const vault = result.vault_credentials || [];
      const matching = vault.filter(item => (item.url || '').toLowerCase().includes(host));
      sendResponse({ credentials: matching });
    });
    return true;
  }
});

function generateStrongPassword(len = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
  let res = '';
  for (let i = 0; i < len; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

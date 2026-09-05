// GKD Secreto - Content Script de Leitura & Preenchimento Automático de Senhas
(function () {
  const currentHost = window.location.hostname.replace(/^www\./, '');

  // 1. Injetar Ícone de AutoFill nos campos de senha e login
  function setupAutofillTriggers() {
    const passwordInputs = document.querySelectorAll('input[type="password"]:not([data-gkd-attached])');
    
    passwordInputs.forEach((pwdInput) => {
      pwdInput.setAttribute('data-gkd-attached', 'true');

      // Botão Flutuante do GKD Secreto
      const badge = document.createElement('div');
      badge.className = 'gkd-autofill-badge';
      badge.title = 'Preencher com GKD Secreto';
      badge.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="#3b82f6" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      `;

      // Posicionamento relativo
      const parent = pwdInput.parentElement;
      if (parent) {
        const computedStyle = window.getComputedStyle(parent);
        if (computedStyle.position === 'static') {
          parent.style.position = 'relative';
        }
        parent.appendChild(badge);

        badge.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openAutofillDropdown(pwdInput, badge);
        });
      }
    });
  }

  // 2. Dropdown de Seleção de Credenciais para Preenchimento
  function openAutofillDropdown(pwdInput, badge) {
    const existing = document.getElementById('gkd-autofill-dropdown');
    if (existing) existing.remove();

    const form = pwdInput.closest('form') || document;
    const usernameInput = findUsernameInput(form);

    // Consulta credenciais salvas no armazenamento da extensão
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'get_credentials_for_host', host: currentHost }, (response) => {
        const creds = response?.credentials || [];
        showDropdownUI(pwdInput, usernameInput, badge, creds);
      });
    } else {
      showDropdownUI(pwdInput, usernameInput, badge, []);
    }
  }

  function showDropdownUI(pwdInput, usernameInput, badge, credentials) {
    const dropdown = document.createElement('div');
    dropdown.id = 'gkd-autofill-dropdown';
    dropdown.className = 'gkd-dropdown-card';

    const rect = badge.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY + 6}px`;
    dropdown.style.left = `${Math.max(10, rect.right + window.scrollX - 260)}px`;

    let itemsHtml = '';
    if (credentials.length > 0) {
      itemsHtml = credentials.map((c, i) => `
        <div class="gkd-dropdown-item" data-index="${i}">
          <div class="gkd-item-info">
            <span class="gkd-item-user">${escapeHtml(c.username || 'Login salvo')}</span>
            <span class="gkd-item-meta">${escapeHtml(c.title || currentHost)}</span>
          </div>
          <span class="gkd-fill-tag">Preencher</span>
        </div>
      `).join('');
    } else {
      itemsHtml = `
        <div class="gkd-dropdown-empty">
          <span>Nenhuma senha salva para <b>${escapeHtml(currentHost)}</b></span>
        </div>
      `;
    }

    dropdown.innerHTML = `
      <div class="gkd-dropdown-header">
        <div class="gkd-dropdown-title">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="#3b82f6" stroke-width="2.5" fill="none">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          GKD Secreto AutoFill
        </div>
        <button id="gkd-close-dropdown" class="gkd-close-btn">&times;</button>
      </div>
      <div class="gkd-dropdown-list">
        ${itemsHtml}
      </div>
      <div class="gkd-dropdown-footer">
        <button id="gkd-gen-password" class="gkd-btn-action">⚡ Gerar Senha Forte</button>
      </div>
    `;

    document.body.appendChild(dropdown);

    // Eventos do Dropdown
    dropdown.querySelector('#gkd-close-dropdown')?.addEventListener('click', () => dropdown.remove());
    
    dropdown.querySelectorAll('.gkd-dropdown-item').forEach((item) => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.getAttribute('data-index') || '0', 10);
        const selected = credentials[idx];
        if (selected) {
          if (usernameInput && selected.username) {
            usernameInput.value = selected.username;
            usernameInput.dispatchEvent(new Event('input', { bubbles: true }));
            usernameInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
          if (pwdInput && selected.password) {
            pwdInput.value = selected.password;
            pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
            pwdInput.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        dropdown.remove();
      });
    });

    dropdown.querySelector('#gkd-gen-password')?.addEventListener('click', () => {
      const generated = generateStrongPassword();
      if (pwdInput) {
        pwdInput.value = generated;
        pwdInput.dispatchEvent(new Event('input', { bubbles: true }));
        pwdInput.dispatchEvent(new Event('change', { bubbles: true }));
        navigator.clipboard.writeText(generated);
        alert('Senha forte gerada e preenchida! (Copiada para a área de transferência)');
      }
      dropdown.remove();
    });

    // Fechar ao clicar fora
    const closeListener = (e) => {
      if (!dropdown.contains(e.target) && e.target !== badge) {
        dropdown.remove();
        document.removeEventListener('click', closeListener);
      }
    };
    setTimeout(() => document.addEventListener('click', closeListener), 10);
  }

  // 3. Captura Automática ao Fazer Login / Submeter Formulários
  document.addEventListener('submit', (e) => {
    const form = e.target;
    captureFormCredentials(form);
  }, true);

  // Monitorar botões de login sem tag <form>
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, input[type="submit"], [role="button"]');
    if (!btn) return;
    const text = (btn.innerText || btn.value || '').toLowerCase();
    if (text.includes('entrar') || text.includes('login') || text.includes('sign in') || text.includes('acessar') || text.includes('cadastrar') || text.includes('salvar')) {
      const pwdInput = document.querySelector('input[type="password"]');
      if (pwdInput && pwdInput.value) {
        const form = pwdInput.closest('form') || document;
        captureFormCredentials(form);
      }
    }
  }, true);

  function captureFormCredentials(form) {
    const pwdInput = form.querySelector('input[type="password"]');
    if (!pwdInput || !pwdInput.value) return;

    const usernameInput = findUsernameInput(form);
    const username = usernameInput ? usernameInput.value.trim() : '';
    const password = pwdInput.value;

    if (!password) return;

    const credData = {
      id: 'ext_' + Date.now(),
      url: currentHost,
      title: document.title || currentHost,
      username: username,
      password: password,
      timestamp: Date.now()
    };

    // Mostra banner elegante de salvamento na página
    showSavePasswordPrompt(credData);

    // Envia ao background da extensão
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: 'save_pending_credentials', data: credData });
    }
  }

  // 4. Banner Flutuante de Confirmação para Salvar no Cofre
  function showSavePasswordPrompt(credData) {
    const existing = document.getElementById('gkd-save-prompt');
    if (existing) existing.remove();

    const prompt = document.createElement('div');
    prompt.id = 'gkd-save-prompt';
    prompt.className = 'gkd-prompt-card';
    prompt.innerHTML = `
      <div class="gkd-prompt-header">
        <div class="gkd-prompt-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="#3b82f6" stroke-width="2.5" fill="none">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>
        <div class="gkd-prompt-text">
          <strong>GKD Secreto - Salvar Senha?</strong>
          <span>Deseja proteger as credenciais de <b>${escapeHtml(credData.url)}</b> no seu cofre?</span>
        </div>
      </div>
      <div class="gkd-prompt-details">
        <div><b>Login:</b> ${escapeHtml(credData.username || 'Não informado')}</div>
        <div><b>Senha:</b> ••••••••</div>
      </div>
      <div class="gkd-prompt-actions">
        <button id="gkd-prompt-dismiss" class="gkd-btn-dismiss">Dispensar</button>
        <button id="gkd-prompt-save" class="gkd-btn-confirm">Salvar no Cofre</button>
      </div>
    `;

    document.body.appendChild(prompt);

    prompt.querySelector('#gkd-prompt-dismiss')?.addEventListener('click', () => prompt.remove());
    prompt.querySelector('#gkd-prompt-save')?.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ action: 'confirm_save_credential', data: credData });
      }
      prompt.innerHTML = `
        <div class="gkd-prompt-saved">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="#10b981" stroke-width="2.5" fill="none">
            <path d="M20 6L9 17l-5-5"></path>
          </svg>
          <span>Senha salva com sucesso no GKD Secreto!</span>
        </div>
      `;
      setTimeout(() => prompt.remove(), 3000);
    });

    setTimeout(() => {
      if (document.body.contains(prompt)) prompt.remove();
    }, 15000);
  }

  function findUsernameInput(form) {
    const allInputs = Array.from(form.querySelectorAll('input:not([type="password"]):not([type="hidden"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])'));
    return allInputs.find(input => 
      input.type === 'email' || 
      input.type === 'text' || 
      input.name.toLowerCase().includes('user') || 
      input.name.toLowerCase().includes('email') || 
      input.name.toLowerCase().includes('login') ||
      input.id.toLowerCase().includes('user') ||
      input.id.toLowerCase().includes('email')
    ) || allInputs[0] || null;
  }

  function generateStrongPassword(len = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=';
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Inicialização e observador de mutações para sites com renderização dinâmica (React, Vue, SPA)
  setupAutofillTriggers();
  const observer = new MutationObserver(() => setupAutofillTriggers());
  observer.observe(document.body, { childList: true, subtree: true });
})();

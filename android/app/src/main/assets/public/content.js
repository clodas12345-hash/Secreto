// GKD Secreto - Content Script
// Captura e preenchimento automático para navegadores

(function () {
  const currentHost = window.location.hostname.replace(/^www\./, '');

  document.addEventListener('submit', (e) => {
    const form = e.target;
    const pwdInput = form.querySelector('input[type="password"]');
    if (!pwdInput || !pwdInput.value) return;

    const allInputs = Array.from(form.querySelectorAll('input:not([type="password"]):not([type="hidden"]):not([type="submit"])'));
    const userInput = allInputs.find(i => i.type === 'email' || i.type === 'text' || i.name.toLowerCase().includes('user') || i.name.toLowerCase().includes('email')) || allInputs[0];

    const creds = {
      url: currentHost,
      title: document.title || currentHost,
      username: userInput ? userInput.value : '',
      password: pwdInput.value,
      timestamp: Date.now()
    };

    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ action: "save_pending_credentials", data: creds });
    }
  }, true);
})();

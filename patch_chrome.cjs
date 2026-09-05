const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

// Insert Chrome extension auto-fill check
const newEffect = `
  // Check for pending credentials from Chrome Extension
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['pending_credentials'], (result) => {
        if (result.pending_credentials) {
          const creds = result.pending_credentials;
          if (window.confirm(\`Deseja salvar a senha capturada do site: \${creds.url}?\`)) {
            setActiveTab('passwords');
            setIsAdding(true);
            setNewItemName(creds.url);
            setNewItemDetail(creds.username);
            setNewItemPassword(creds.password);
          }
          // Limpa as credenciais pendentes
          chrome.storage.local.remove('pending_credentials');
        }
      });
    }
  }, []);
`;

// Insert after the first useEffect (which is around line 134)
const insertIndex = content.indexOf('useEffect(() => {', 200); // we will replace it later or just insert after
const regex = /  const \[isLiveCameraOpen, setIsLiveCameraOpen\] = useState\(false\);\n  const \[isEditingCamera, setIsEditingCamera\] = useState\(false\);\n  const liveVideoRef = useRef<HTMLVideoElement>\(null\);\n/;
content = content.replace(regex, '$&\n' + newEffect + '\n');

fs.writeFileSync('src/components/Vault.tsx', content);

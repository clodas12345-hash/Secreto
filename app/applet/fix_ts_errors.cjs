const fs = require('fs');

// 1. Fix main.tsx import
let mainContent = fs.readFileSync('src/main.tsx', 'utf8');
mainContent = mainContent.replace("import App from './App.tsx';", "import App from './App';");
fs.writeFileSync('src/main.tsx', mainContent);
console.log('Fixed main.tsx');

// 2. Fix Vault.tsx setSyncStatus -> setDbSyncStatus
let vaultContent = fs.readFileSync('src/components/Vault.tsx', 'utf8');
vaultContent = vaultContent.replace("setSyncStatus('idle');", "setDbSyncStatus('saved');");
fs.writeFileSync('src/components/Vault.tsx', vaultContent);
console.log('Fixed Vault.tsx');

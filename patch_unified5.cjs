const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

// Fix the activeFolderId view
content = content.replace(/\{activeFolderId !== null && \(/g, "{(activeTab !== 'settings' && activeTab !== 'help') && activeFolderId !== null && (");

fs.writeFileSync('src/components/Vault.tsx', content);

const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');
content = content.replace('const creds = result.pending_credentials;', 'const creds = result.pending_credentials as any;');
fs.writeFileSync('src/components/Vault.tsx', content);

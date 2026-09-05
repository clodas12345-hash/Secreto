const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

// Replace the folder filter block completely
const filterRegex = /\{\[\.\.\.folders\]\.filter\(f => \{[\s\S]*?\}\)\.sort/g;
content = content.replace(filterRegex, '{[...folders].sort');

fs.writeFileSync('src/components/Vault.tsx', content);

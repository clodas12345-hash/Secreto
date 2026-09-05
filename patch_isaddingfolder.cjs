const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

const target = `const newFolder: FolderType = {
                  id: crypto.randomUUID(),
                  name: newFolderName.trim(),
                  password: newFolderPassword.trim() || undefined
                };`;

const replacement = `const newFolder: FolderType = {
                  id: crypto.randomUUID(),
                  name: newFolderName.trim(),
                  password: newFolderPassword.trim() || undefined,
                  tabType: activeTab === 'passwords' ? 'passwords' : 'documents'
                };`;

content = content.replace(target, replacement);

const targetFilter = `{[...folders].sort((a, b) => a.name.localeCompare(b.name)).map(folder => (`;
const replaceFilter = `{[...folders].filter(f => !f.tabType || f.tabType === activeTab).sort((a, b) => a.name.localeCompare(b.name)).map(folder => (`;

content = content.replace(targetFilter, replaceFilter);

fs.writeFileSync('src/components/Vault.tsx', content);

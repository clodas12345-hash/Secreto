const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

const target = `{[...folders].filter(f => !f.tabType || f.tabType === activeTab).sort((a, b) => a.name.localeCompare(b.name)).map(folder => (`;

const replacement = `{[...folders].filter(f => {
                    if (f.tabType) return f.tabType === activeTab;
                    const hasPasswords = passwords.some(p => p.folderId === f.id);
                    const hasDocs = documents.some(d => d.folderId === f.id);
                    if (hasPasswords) return activeTab === 'passwords';
                    if (hasDocs) return activeTab === 'documents';
                    if (f.name.toLowerCase().includes('foto') || f.name.toLowerCase().includes('doc')) return activeTab === 'documents';
                    return activeTab === 'passwords';
                  }).sort((a, b) => a.name.localeCompare(b.name)).map(folder => (`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/Vault.tsx', content);

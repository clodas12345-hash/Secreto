const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

const target = `setFolders([...folders, { 
                    id: Date.now().toString(), 
                    name: newFolderName.trim(), 
                    password: newFolderPassword.trim() || undefined 
                  }]);`;

const replacement = `setFolders([...folders, { 
                    id: Date.now().toString(), 
                    name: newFolderName.trim(), 
                    password: newFolderPassword.trim() || undefined,
                    tabType: activeTab === 'passwords' ? 'passwords' : 'documents'
                  }]);`;

content = content.replace(target, replacement);

fs.writeFileSync('src/components/Vault.tsx', content);

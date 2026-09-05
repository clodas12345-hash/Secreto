const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

// 1. In isAddingFolder, hide the password field if activeTab is documents
const addingFolderTarget = `<input 
              type="password" 
              placeholder="Senha exclusiva (Opcional)" 
              value={newFolderPassword}
              onChange={e => setNewFolderPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800/50 rounded px-3 py-3 text-zinc-100 mb-6 text-sm font-mono focus:outline-none focus:border-blue-500"
            />`;
const addingFolderReplacement = `{activeTab === 'passwords' && (
            <input 
              type="password" 
              placeholder="Senha exclusiva (Opcional)" 
              value={newFolderPassword}
              onChange={e => setNewFolderPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800/50 rounded px-3 py-3 text-zinc-100 mb-6 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
            )}`;
content = content.replace(addingFolderTarget, addingFolderReplacement);

// 2. In editingFolder, hide the password field if the folder's tabType is documents (or activeTab)
const editingFolderTarget = `<input 
              type="password" 
              placeholder="Nova senha (Opcional)" 
              value={editFolderPassword}
              onChange={e => setEditFolderPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800/50 rounded px-3 py-3 text-zinc-100 mb-6 text-sm font-mono focus:outline-none focus:border-blue-500"
            />`;
const editingFolderReplacement = `{(editingFolder.tabType === 'passwords' || (!editingFolder.tabType && activeTab === 'passwords')) && (
            <input 
              type="password" 
              placeholder="Nova senha (Opcional)" 
              value={editFolderPassword}
              onChange={e => setEditFolderPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800/50 rounded px-3 py-3 text-zinc-100 mb-6 text-sm font-mono focus:outline-none focus:border-blue-500"
            />
            )}`;
content = content.replace(editingFolderTarget, editingFolderReplacement);

fs.writeFileSync('src/components/Vault.tsx', content);

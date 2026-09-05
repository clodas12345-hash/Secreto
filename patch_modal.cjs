const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

// 1. Add state for newFolderTabType and editFolderTabType around line 281
const stateInject = `
  const [newFolderTabType, setNewFolderTabType] = useState<'passwords' | 'documents'>('passwords');
  const [editFolderTabType, setEditFolderTabType] = useState<'passwords' | 'documents'>('passwords');
`;
content = content.replace(/const \[newFolderPassword, setNewFolderPassword\] = useState\(''\);/, 'const [newFolderPassword, setNewFolderPassword] = useState(\'\');\n' + stateInject);

// 2. Add setEditFolderTabType in edit folder click
content = content.replace(
  /setEditingFolder\(currentFolder\);/g, 
  "setEditingFolder(currentFolder);\n                    setEditFolderTabType(currentFolder.tabType || (activeTab === 'documents' ? 'documents' : 'passwords'));"
);

// 3. Update the IsAddingFolder onClick to initialize newFolderTabType
content = content.replace(
  /onClick=\{\(\) => setIsAddingFolder\(true\)\}/g,
  "onClick={() => { setIsAddingFolder(true); setNewFolderTabType(activeTab === 'documents' ? 'documents' : 'passwords'); }}"
);

// 4. Update isAddingFolder modal UI
const addModalRegex = /<h3 className="text-zinc-100 font-bold mb-4">Adicionar Pasta<\/h3>/;
const addModalReplacement = `<h3 className="text-zinc-100 font-bold mb-4">Adicionar Pasta</h3>
            <div className="flex gap-2 mb-4 p-1 bg-zinc-950 border border-zinc-800/50 rounded-lg">
              <button 
                onClick={() => setNewFolderTabType('passwords')} 
                className={\`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all \${newFolderTabType === 'passwords' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}\`}>
                Senhas
              </button>
              <button 
                onClick={() => setNewFolderTabType('documents')} 
                className={\`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all \${newFolderTabType === 'documents' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}\`}>
                Fotos/Docs
              </button>
            </div>`;
content = content.replace(addModalRegex, addModalReplacement);

// Update save logic for adding folder
const addSaveRegex = /setFolders\(\[\.\.\.folders, \{\s*id: Date.now\(\)\.toString\(\),\s*name: newFolderName\.trim\(\),\s*password: newFolderPassword\.trim\(\) \|\| undefined,\s*tabType: activeTab === 'passwords' \? 'passwords' : 'documents'\s*\}\]\);/;
const addSaveReplacement = `setFolders([...folders, { 
                    id: Date.now().toString(), 
                    name: newFolderName.trim(), 
                    password: newFolderPassword.trim() || undefined,
                    tabType: newFolderTabType
                  }]);`;
content = content.replace(addSaveRegex, addSaveReplacement);


// 5. Update Edit Folder modal UI
const editModalRegex = /<h3 className="text-zinc-100 font-bold mb-4">Editar Pasta<\/h3>/;
const editModalReplacement = `<h3 className="text-zinc-100 font-bold mb-4">Editar Pasta</h3>
            <div className="flex gap-2 mb-4 p-1 bg-zinc-950 border border-zinc-800/50 rounded-lg">
              <button 
                onClick={() => setEditFolderTabType('passwords')} 
                className={\`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all \${editFolderTabType === 'passwords' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}\`}>
                Senhas
              </button>
              <button 
                onClick={() => setEditFolderTabType('documents')} 
                className={\`flex-1 py-2 text-xs font-bold uppercase rounded-md transition-all \${editFolderTabType === 'documents' ? 'bg-blue-600/20 text-blue-400' : 'text-zinc-500 hover:text-zinc-300'}\`}>
                Fotos/Docs
              </button>
            </div>`;
content = content.replace(editModalRegex, editModalReplacement);

// Edit folder save logic
const editSaveRegex = /setFolders\(folders\.map\(f => f\.id === editingFolder\.id \? \{ \.\.\.f, name: editFolderName\.trim\(\), password: editFolderPassword\.trim\(\) \|\| undefined \} : f\)\);/;
const editSaveReplacement = `setFolders(folders.map(f => f.id === editingFolder.id ? { ...f, name: editFolderName.trim(), password: editFolderPassword.trim() || undefined, tabType: editFolderTabType } : f));`;
content = content.replace(editSaveRegex, editSaveReplacement);

// Conditional for password in Edit (only show if tabType === passwords)
content = content.replace(
  /\{\(editingFolder\.tabType === 'passwords' \|\| \(!editingFolder\.tabType && activeTab === 'passwords'\)\) && \(/,
  "{(editFolderTabType === 'passwords') && ("
);

// Conditional for password in Add 
content = content.replace(
  /\{activeTab === 'passwords' && \(/,
  "{newFolderTabType === 'passwords' && ("
);

fs.writeFileSync('src/components/Vault.tsx', content);

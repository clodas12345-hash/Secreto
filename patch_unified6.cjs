const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

// 1. Remove the "activeTab" references that are not 'settings' or 'passwords'/'documents'
// Basically, we want the main view to always show all folders, no filtering by activeTab.
// I already changed the folder filter to just `{[...folders].sort...`.

// 2. We need to make sure the "Adicionar Pasta" button is always visible on the main screen.
const addFolderHeader = `
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-light text-zinc-100 italic">Suas <span className="font-bold not-italic">Pastas</span></h2>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => { setIsAddingFolder(true); setNewFolderTabType('passwords'); }}
                    className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-500 shadow-md text-white rounded text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <FolderPlus className="w-4 h-4" />
                    NOVA PASTA
                  </button>
                </div>
              </div>
`;
content = content.replace(/\{.*?activeFolderId === null && \(\s*<>\s*<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">[\s\S]*?<\/div>/, `{(activeTab !== 'settings' && activeTab !== 'help') && activeFolderId === null && (\n              <>\n${addFolderHeader}`);

fs.writeFileSync('src/components/Vault.tsx', content);

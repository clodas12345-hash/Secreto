const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

// Replace the folder filter block completely
const filterRegex = /folders\.filter\(f => \{[\s\S]*?\}\)\.sort/g;
content = content.replace(filterRegex, 'folders.sort');

// Fix the "Itens da Pasta" add buttons
// We want an "ADICIONAR SENHA" and "ADICIONAR FOTO/DOC" button if in "Sem Pasta".
// If in a folder, we just show the button that matches the folder's tabType.
const addButtonsRegex = /\{newFolderTabType === 'passwords' && \([\s\S]*?\}\)[\s\S]*?\{activeTab === 'documents' && \([\s\S]*?\}\)/;

const newAddButtons = `
                    {(activeFolderId === 'none' || folders.find(f => f.id === activeFolderId)?.tabType === 'passwords' || !folders.find(f => f.id === activeFolderId)?.tabType) && (
                      <button 
                        onClick={() => { setActiveTab('passwords'); setIsAdding(true); }}
                        className="flex-1 sm:flex-none px-4 py-2 bg-blue-600/20 text-blue-500 hover:bg-blue-600/30 border border-blue-500/20 shadow-md rounded text-xs font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-3 h-3" />
                        ADICIONAR SENHA
                      </button>
                    )}
                    {(activeFolderId === 'none' || folders.find(f => f.id === activeFolderId)?.tabType === 'documents') && (
                      <button 
                        onClick={() => { setActiveTab('documents'); setIsAdding(true); }}
                        className="flex-1 sm:flex-none px-4 py-2 bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-500/20 shadow-md rounded text-xs font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-3 h-3" />
                        ADICIONAR FOTO/DOC
                      </button>
                    )}
`;
content = content.replace(addButtonsRegex, newAddButtons);

// Remove the remaining references to `{activeTab === 'passwords' && (` wrapping the password list
// Since we are showing both if activeFolderId === 'none' or the respective one if in a folder.
const pwListConditionRegex = /\{activeTab === 'passwords' && \([\s\S]*?<div className="bg-zinc-900\/50 shadow-xl border border-zinc-800\/50 rounded-xl overflow-hidden mb-6">/;
const newPwListCondition = `{(activeFolderId === 'none' || folders.find(f => f.id === activeFolderId)?.tabType === 'passwords' || !folders.find(f => f.id === activeFolderId)?.tabType) && (
                <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl overflow-hidden mb-6">`;
content = content.replace(pwListConditionRegex, newPwListCondition);

const docListConditionRegex = /\{activeTab === 'documents' && \([\s\S]*?<div className="bg-zinc-900\/50 shadow-xl border border-zinc-800\/50 rounded-xl overflow-hidden mb-6">/;
const newDocListCondition = `{(activeFolderId === 'none' || folders.find(f => f.id === activeFolderId)?.tabType === 'documents') && (
                <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl overflow-hidden mb-6">`;
content = content.replace(docListConditionRegex, newDocListCondition);

fs.writeFileSync('src/components/Vault.tsx', content);

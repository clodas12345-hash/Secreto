const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

const targetButtons = `<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-light text-zinc-100 italic">Itens da <span className="font-bold not-italic">Pasta</span></h2>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => { setActiveTab('passwords'); setIsAdding(true); }}
                      className="flex-1 sm:flex-none px-4 py-2 bg-blue-600/20 text-blue-500 hover:bg-blue-600/30 border border-blue-500/20 shadow-md rounded text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3 h-3" />
                      SENHA
                    </button>
                    <button 
                      onClick={() => { setActiveTab('documents'); setIsAdding(true); }}
                      className="flex-1 sm:flex-none px-4 py-2 bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-500/20 shadow-md rounded text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <Plus className="w-3 h-3" />
                      FOTO/DOC
                    </button>
                  </div>
                </div>`;

const repButtons = `<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-light text-zinc-100 italic">Itens da <span className="font-bold not-italic">Pasta</span></h2>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {activeTab === 'passwords' && (
                      <button 
                        onClick={() => setIsAdding(true)}
                        className="flex-1 sm:flex-none px-4 py-2 bg-blue-600/20 text-blue-500 hover:bg-blue-600/30 border border-blue-500/20 shadow-md rounded text-xs font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-3 h-3" />
                        ADICIONAR
                      </button>
                    )}
                    {activeTab === 'documents' && (
                      <button 
                        onClick={() => setIsAdding(true)}
                        className="flex-1 sm:flex-none px-4 py-2 bg-red-600/20 text-red-500 hover:bg-red-600/30 border border-red-500/20 shadow-md rounded text-xs font-bold transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-3 h-3" />
                        ADICIONAR FOTO/DOC
                      </button>
                    )}
                  </div>
                </div>`;

content = content.replace(targetButtons, repButtons);
fs.writeFileSync('src/components/Vault.tsx', content);

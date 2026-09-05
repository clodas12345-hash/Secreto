const fs = require('fs');
let code = fs.readFileSync('src/components/Vault.tsx', 'utf8');

const target = `            {(activeTab === 'passwords' || activeTab === 'documents') && activeFolderId !== null && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-light text-zinc-100 italic">Cofre de Acesso <span className="font-bold not-italic">Rápido</span></h2>
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-900/200 shadow-md text-white rounded text-xs font-bold transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-3 h-3" />
                    {activeTab === 'passwords' ? 'ADICIONAR SENHA' : 'ADICIONAR FOTO/DOC'}
                  </button>
                </div>
                
                {activeFolderId !== null && (
                  <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm min-w-full">
                    <thead className="bg-zinc-800 text-zinc-600 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3 font-semibold">{activeTab === 'passwords' ? 'Descrição' : 'Documento'}</th>
                        {activeTab !== 'passwords' && <th className="px-6 py-3 font-semibold">Data</th>}
                        <th className="px-6 py-3 font-semibold text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {activeTab === 'passwords' && filteredPasswords.map(pw => (`;

code = code.replace(target, '/* FOLDER_VIEW_REPLACE_START */' + target);

fs.writeFileSync('src/components/Vault.tsx', code);

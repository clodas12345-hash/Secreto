const fs = require('fs');
let code = fs.readFileSync('src/components/Vault.tsx', 'utf8');

const regex = /\/\* FOLDER_VIEW_REPLACE_START \*\/.*?\(\s*<>\s*<div className="flex items-center justify-between mb-2">.*?<\/div>\s*\)\s*\}\s*<\/div>/s;

const newCode = `            {activeFolderId !== null && (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
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
                </div>
                
                <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl overflow-hidden mb-6">
                  <div className="bg-zinc-800/80 px-6 py-3 border-b border-zinc-800/50 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Senhas</span>
                  </div>
                  <table className="w-full text-left text-sm min-w-full">
                  <tbody className="divide-y divide-zinc-800">
                    {filteredPasswords.length === 0 && (
                      <tr><td className="px-6 py-8 text-center text-zinc-500">Nenhuma senha nesta pasta.</td></tr>
                    )}
                    {filteredPasswords.map(pw => (
                      <tr key={pw.id} className="hover:bg-zinc-900/50 shadow-2xl border border-zinc-800/50/30 transition-colors group cursor-pointer" onClick={() => setShowPasswordId(showPasswordId === pw.id ? null : pw.id)}>
                    <td className="px-6 py-4 font-medium text-zinc-100 w-full align-top">
                      <div className="flex items-center gap-2">
                        {pw.title}
                      </div>
                      {showPasswordId === pw.id && (
                        <div className="mt-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-800/50 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
                          {pw.username && (
                            <div>
                              <div className="text-[10px] uppercase text-zinc-600 font-bold mb-1">Login / Usuário</div>
                              <div className="text-sm text-zinc-400 bg-zinc-900/50 shadow-xl px-3 py-2 rounded flex justify-between items-center group/item border border-zinc-800/50/50">
                                {pw.username}
                                <button onClick={() => navigator.clipboard.writeText(pw.username)} className="text-zinc-600 hover:text-zinc-100 transition-colors" title="Copiar Login"><Copy className="w-4 h-4"/></button>
                              </div>
                            </div>
                          )}
                          {pw.password && (
                            <div>
                              <div className="text-[10px] uppercase text-zinc-600 font-bold mb-1">Senha Principal</div>
                              <div className="text-sm text-blue-600 font-mono bg-zinc-900/50 shadow-xl px-3 py-2 rounded flex justify-between items-center group/item border border-zinc-800/50/50">
                                {pw.password}
                                <button onClick={() => navigator.clipboard.writeText(pw.password)} className="text-zinc-600 hover:text-zinc-100 transition-colors" title="Copiar Senha Principal"><Copy className="w-4 h-4"/></button>
                              </div>
                            </div>
                          )}
                          {pw.accessPassword && (
                            <div>
                              <div className="text-[10px] uppercase text-zinc-600 font-bold mb-1">Senha de Acesso</div>
                              <div className="text-sm text-blue-600 font-mono bg-zinc-900/50 shadow-xl px-3 py-2 rounded flex justify-between items-center group/item border border-zinc-800/50/50">
                                {pw.accessPassword}
                                <button onClick={() => navigator.clipboard.writeText(pw.accessPassword)} className="text-zinc-600 hover:text-zinc-100 transition-colors" title="Copiar Senha de Acesso"><Copy className="w-4 h-4"/></button>
                              </div>
                            </div>
                          )}
                          {pw.transactionPassword && (
                            <div>
                              <div className="text-[10px] uppercase text-zinc-600 font-bold mb-1">Senha de Transação</div>
                              <div className="text-sm text-blue-600 font-mono bg-zinc-900/50 shadow-xl px-3 py-2 rounded flex justify-between items-center group/item border border-zinc-800/50/50">
                                {pw.transactionPassword}
                                <button onClick={() => navigator.clipboard.writeText(pw.transactionPassword)} className="text-zinc-600 hover:text-zinc-100 transition-colors" title="Copiar Senha de Transação"><Copy className="w-4 h-4"/></button>
                              </div>
                            </div>
                          )}
                          {pw.alphanumericPassword && (
                            <div>
                              <div className="text-[10px] uppercase text-zinc-600 font-bold mb-1">Senha Alfanumérica</div>
                              <div className="text-sm text-blue-600 font-mono bg-zinc-900/50 shadow-xl px-3 py-2 rounded flex justify-between items-center group/item border border-zinc-800/50/50">
                                {pw.alphanumericPassword}
                                <button onClick={() => navigator.clipboard.writeText(pw.alphanumericPassword)} className="text-zinc-600 hover:text-zinc-100 transition-colors" title="Copiar Senha Alfanumérica"><Copy className="w-4 h-4"/></button>
                              </div>
                            </div>
                          )}
                          {pw.notes && (
                            <div>
                              <div className="text-[10px] uppercase text-zinc-600 font-bold mb-1">Notas</div>
                              <div className="text-sm text-zinc-500 bg-zinc-900/50 shadow-xl px-3 py-2 rounded border border-zinc-800/50/50">
                                {pw.notes}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top w-24">
                      <div className="flex items-center gap-3 justify-end w-full" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => {
                            setEditingItem({ type: 'password', id: pw.id });
                            setEditItemName(pw.title);
                            setEditItemDetail(pw.username);
                            setEditItemPassword(pw.password || '');
                            setEditItemAccessPassword(pw.accessPassword || '');
                            setEditItemTransactionPassword(pw.transactionPassword || '');
                            setEditItemAlphanumericPassword(pw.alphanumericPassword || '');
                          }}
                          className="text-zinc-600 hover:text-zinc-100 transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setShowPasswordId(showPasswordId === pw.id ? null : pw.id)}
                          className="text-zinc-600 hover:text-zinc-100 flex items-center gap-2 transition-colors"
                        >
                          {showPasswordId === pw.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                    ))}
                  </tbody>
                  </table>
                </div>

                <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl overflow-hidden">
                  <div className="bg-zinc-800/80 px-6 py-3 border-b border-zinc-800/50 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Fotos & Documentos</span>
                  </div>
                  <table className="w-full text-left text-sm min-w-full">
                  <tbody className="divide-y divide-zinc-800">
                    {filteredDocuments.length === 0 && (
                      <tr><td className="px-6 py-8 text-center text-zinc-500">Nenhum documento nesta pasta.</td></tr>
                    )}
                    {filteredDocuments.map(doc => (
                      <tr key={doc.id} className="hover:bg-zinc-900/50 shadow-2xl border border-zinc-800/50/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-zinc-100">{doc.title}</td>
                    <td className="px-6 py-4 text-zinc-500">{doc.createdAt}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3 justify-end w-full">
                        <button 
                          onClick={() => {
                            setEditingItem({ type: 'document', id: doc.id });
                            setEditItemName(doc.title);
                            setEditItemDetail(doc.content);
                            setEditItemFile(doc.fileData || null);
                            setEditItemFileType(doc.fileType || null);
                          }}
                          className="text-zinc-600 hover:text-zinc-100 transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setViewingDocument(doc)}
                          className="text-zinc-600 hover:text-zinc-100 flex items-center gap-2 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </>
            )}
      </div>`;

code = code.replace(regex, newCode);

fs.writeFileSync('src/components/Vault.tsx', code);

const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

// I need to find where the bad block starts and ends.
// Looking at the file, the `{(activeTab !== 'settings' && activeTab !== 'help') && activeFolderId !== null && (` is duplicated or something.
// Let's replace everything from the first `{(activeTab !== 'settings' && activeTab !== 'help') && activeFolderId !== null && (`
// to the start of `{activeTab === 'settings' && (`

const startMarker = "{(activeTab !== 'settings' && activeTab !== 'help') && activeFolderId !== null && (";
const endMarker = "{activeTab === 'settings' && (";

const startIndex = content.indexOf(startMarker);
const endIndex = content.lastIndexOf(endMarker); // Make sure it's the right one

if (startIndex !== -1 && endIndex !== -1) {
  const newBlock = `{(activeTab !== 'settings' && activeTab !== 'help') && activeFolderId !== null && (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-2xl font-light text-zinc-100 italic">Itens da <span className="font-bold not-italic">Pasta</span></h2>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
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
                  </div>
                </div>

                {(activeFolderId === 'none' || folders.find(f => f.id === activeFolderId)?.tabType === 'passwords' || !folders.find(f => f.id === activeFolderId)?.tabType) && (
                <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl overflow-hidden mb-6">
                  <div className="bg-zinc-800/80 px-6 py-3 border-b border-zinc-800/50 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Senhas</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[600px]">
                    <tbody className="divide-y divide-zinc-800">
                      {filteredPasswords.length === 0 ? (
                        <tr><td className="px-6 py-8 text-center text-zinc-500 text-sm">Nenhuma senha nesta pasta</td></tr>
                      ) : (
                      filteredPasswords.map(pw => (
                        <tr key={pw.id} className="hover:bg-zinc-800/50 transition-colors">
                          <td className="px-6 py-4 font-bold text-zinc-100">{pw.title}</td>
                          <td className="px-6 py-4 text-zinc-400 font-mono text-xs hidden sm:table-cell">{pw.username}</td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-3">
                              <button 
                                onClick={() => {
                                  setDeletingItem(pw.id);
                                  setDeletingItemType('password');
                                }} 
                                className="text-zinc-600 hover:text-red-400 transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setActiveTab('passwords');
                                  setIsAdding(true);
                                  setEditingItemId(pw.id);
                                  setNewItemName(pw.title);
                                  setNewItemDetail(pw.username);
                                  setNewItemPassword(pw.password || '');
                                  setNewItemAccessPassword(pw.accessPassword || '');
                                  setNewItemTransactionPassword(pw.transactionPassword || '');
                                  setNewItemAlphanumericPassword(pw.alphanumericPassword || '');
                                  setNewItemNotes(pw.notes || '');
                                }} 
                                className="text-zinc-600 hover:text-zinc-100 transition-colors"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => {
                                  setViewingItem(pw);
                                  setViewPasswordPin('');
                                  setViewPasswordError('');
                                  setIsViewPinModalOpen(true);
                                }}
                                className="text-zinc-600 hover:text-zinc-100 flex items-center gap-2 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )))}
                    </tbody>
                    </table>
                  </div>
                </div>
                )}

                {(activeFolderId === 'none' || folders.find(f => f.id === activeFolderId)?.tabType === 'documents') && (
                <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl overflow-hidden mb-6">
                  <div className="bg-zinc-800/80 px-6 py-3 border-b border-zinc-800/50 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Fotos e Docs</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[600px]">
                    <tbody className="divide-y divide-zinc-800">
                      {filteredDocuments.length === 0 ? (
                        <tr><td className="px-6 py-8 text-center text-zinc-500 text-sm">Nenhum documento nesta pasta</td></tr>
                      ) : (
                      filteredDocuments.map(doc => (
                    <tr key={doc.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-zinc-100 flex items-center gap-3">
                        {doc.fileType === 'image' ? <Camera className="w-4 h-4 text-zinc-500" /> : <FileText className="w-4 h-4 text-zinc-500" />}
                        {doc.title}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => {
                              setDeletingItem(doc.id);
                              setDeletingItemType('document');
                            }} 
                            className="text-zinc-600 hover:text-red-400 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              setActiveTab('documents');
                              setIsAdding(true);
                              setEditingItemId(doc.id);
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
                      )))}
                    </tbody>
                    </table>
                  </div>
                </div>
                )}
              </>
            )}
          </div>
      
      `;
  
  content = content.substring(0, startIndex) + newBlock + content.substring(endIndex);
  
  // also verify that main has a closing tag
  if (!content.includes('</main>')) {
    // Add </main> right before the last closing </div> of the component, which is before `);` and `}`
    content = content.replace(/  \);\n\}/, '      </main>\n    </div>\n  );\n}');
  }
  
  fs.writeFileSync('src/components/Vault.tsx', content);
  console.log("Patched successfully");
} else {
  console.log("Markers not found");
}

const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

const target1 = `<div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl overflow-hidden mb-6">
                  <div className="bg-zinc-800/80 px-6 py-3 border-b border-zinc-800/50 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Senhas</span>
                  </div>`;

const rep1 = `{activeTab === 'passwords' && (
                <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl overflow-hidden mb-6">
                  <div className="bg-zinc-800/80 px-6 py-3 border-b border-zinc-800/50 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Senhas</span>
                  </div>`;

const target2 = `                  </table>
                </div>

                <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl overflow-hidden">
                  <div className="bg-zinc-800/80 px-6 py-3 border-b border-zinc-800/50 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Fotos & Documentos</span>
                  </div>`;

const rep2 = `                  </table>
                </div>
                )}

                {activeTab === 'documents' && (
                <div className="bg-zinc-900/50 shadow-xl border border-zinc-800/50 rounded-xl overflow-hidden">
                  <div className="bg-zinc-800/80 px-6 py-3 border-b border-zinc-800/50 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Fotos & Documentos</span>
                  </div>`;

const target3 = `                  </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
              </>
            )}`;

const rep3 = `                  </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
                )}
              </>
            )}`;

content = content.replace(target1, rep1);
content = content.replace(target2, rep2);
content = content.replace(target3, rep3);

fs.writeFileSync('src/components/Vault.tsx', content);

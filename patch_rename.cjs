const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

content = content.replace('<KeyRound className="w-4 h-4" /> Senhas', '<KeyRound className="w-4 h-4" /> Apps e Sites');
content = content.replace('<span className="text-[10px] font-bold uppercase tracking-wider">Senhas</span>', '<span className="text-[10px] font-bold uppercase tracking-wider">Apps/Sites</span>');
content = content.replace('<span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Senhas</span>', '<span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Aplicativos e Sites</span>');
content = content.replace('Nenhuma senha nesta pasta.', 'Nenhum aplicativo ou site nesta pasta.');
content = content.replace("Adicionar {activeTab === 'passwords' ? 'Senha' : 'Documento'}", "Adicionar {activeTab === 'passwords' ? 'App/Site' : 'Documento'}");
content = content.replace("Editar {editingItem.type === 'password' ? 'Senha' : 'Documento'}", "Editar {editingItem.type === 'password' ? 'App/Site' : 'Documento'}");

fs.writeFileSync('src/components/Vault.tsx', content);

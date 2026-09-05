const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

content = content.replace('<span className="text-[10px] font-bold uppercase tracking-wider">Fotos/Docs</span>', '<span className="text-[10px] font-bold uppercase tracking-wider">Fotos e Docs</span>');
content = content.replace('<span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Fotos & Documentos</span>', '<span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Fotos e Documentos</span>');

fs.writeFileSync('src/components/Vault.tsx', content);

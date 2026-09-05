const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

// 1. Remove state and runSecurityScan function
const scanStateRegex = /\s*const \[isScanningStatus, setIsScanningStatus\] = useState\(false\);\s*const \[scanProgress, setScanProgress\] = useState\(0\);\s*const \[scanResults, setScanResults\].*?;\s*const runSecurityScan = \(\) => \{[\s\S]*?\}, 300\);\s*\};\n/m;
content = content.replace(scanStateRegex, '\n');

// 2. Remove the "Varredura de Segurança" block in settings
const varreduraSettingsRegex = /\s*<div className="bg-zinc-900\/50 shadow-xl border border-zinc-800\/50 rounded-xl p-6 mb-4">\s*<h3 className="text-lg font-semibold text-zinc-100 mb-4">Varredura de Segurança<\/h3>[\s\S]*?Ir para Varredura Completa\s*<\/button>\s*<\/div>\s*<\/div>\s*<\/div>/m;
content = content.replace(varreduraSettingsRegex, '');

// 3. Remove the 'security' tab
const securityTabRegex = /\s*\{\s*activeTab === 'security'\s*&&\s*\([\s\S]*?\}\s*\)\s*\}/m;
content = content.replace(securityTabRegex, '');

fs.writeFileSync('src/components/Vault.tsx', content);

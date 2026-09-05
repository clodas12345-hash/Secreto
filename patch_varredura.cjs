const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

content = content.replace('Realize uma varredura para encontrar senhas fracas, reutilizadas ou vazadas.', 'Realize uma varredura para encontrar contas de apps/sites com senhas fracas, reutilizadas ou vazadas.');
content = content.replace('Senhas fracas: {scanResults.weak}', 'Senhas fracas (Apps/Sites): {scanResults.weak}');
content = content.replace('Senhas reutilizadas: {scanResults.reused}', 'Senhas reutilizadas (Apps/Sites): {scanResults.reused}');
content = content.replace('Analise suas senhas salvas em busca de vulnerabilidades, senhas fracas ou reutilizadas que possam comprometer seu cofre.', 'Analise os apps e sites salvos em busca de vulnerabilidades ou senhas reutilizadas que possam comprometer seu cofre.');
content = content.replace('Senhas Fracas', 'Contas Vulneráveis');
content = content.replace('Mesma senha em vários locais', 'Senha repetida em vários Apps/Sites');

fs.writeFileSync('src/components/Vault.tsx', content);

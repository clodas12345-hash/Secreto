const fs = require('fs');
let content = fs.readFileSync('src/types.ts', 'utf8');
content = content.replace('password?: string;', "password?: string;\n  tabType?: 'passwords' | 'documents';");
fs.writeFileSync('src/types.ts', content);

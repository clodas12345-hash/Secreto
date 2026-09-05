const fs = require('fs');

// 1. Fix Auth.tsx
let authContent = fs.readFileSync('src/components/Auth.tsx', 'utf8');
authContent = "import React from 'react';\n" + authContent;
authContent = authContent.replace('const publicKey = {', 'const publicKey: any = {');
authContent = authContent.replace('const publicKey = {', 'const publicKey: any = {');
fs.writeFileSync('src/components/Auth.tsx', authContent);

// 2. Fix App.tsx
// wait, App.tsx is already ok if we just add cloudUserId to Vault Props.

// 3. Fix Vault.tsx
let vaultContent = fs.readFileSync('src/components/Vault.tsx', 'utf8');

// fix Props
vaultContent = vaultContent.replace('userPin: string }) {', 'userPin: string, cloudUserId?: string }) {');

// fix localEncrypted
vaultContent = vaultContent.replace(`try {\n        const localEncrypted = localStorage.getItem('vault_data');`, `let localEncrypted = null;\n      try {\n        localEncrypted = localStorage.getItem('vault_data');`);

// fix WebAuthn
vaultContent = vaultContent.replace('const publicKey = {', 'const publicKey: any = {');

// fix FolderType
vaultContent = vaultContent.replace(/<Folder \| null>/g, '<FolderType | null>');

fs.writeFileSync('src/components/Vault.tsx', vaultContent);

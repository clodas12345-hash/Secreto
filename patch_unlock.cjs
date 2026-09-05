const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

const target = `              onChange={e => { setFolderUnlockPin(e.target.value); setFolderUnlockError(''); }}`;

const replacement = `              onChange={e => {
                const val = e.target.value;
                setFolderUnlockPin(val);
                setFolderUnlockError('');
                if (unlockingFolder && val === unlockingFolder.password) {
                  setActiveFolderId(unlockingFolder.id);
                  setUnlockingFolder(null);
                  setFolderUnlockPin('');
                  setFolderUnlockError('');
                }
              }}`;

content = content.replace(target, replacement);
fs.writeFileSync('src/components/Vault.tsx', content);

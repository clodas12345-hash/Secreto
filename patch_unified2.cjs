const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

// Fix the main view condition
content = content.replace(/\{\(activeTab === 'passwords' \|\| activeTab === 'documents'\) && activeFolderId === null && \(/g, 
  "{(activeTab !== 'settings' && activeTab !== 'help') && activeFolderId === null && (");

// Fix the "Adicionar Pasta" button
// It used activeTab to decide newFolderTabType, but let's just default to 'passwords'
content = content.replace(/setNewFolderTabType\(activeTab === 'documents' \? 'documents' : 'passwords'\);/g, "setNewFolderTabType('passwords');");

// Let's fix the Add Item buttons inside a folder view
// Find {activeFolderId !== null && ( ... )} block
// We need to render the add buttons properly based on folder type.
// If activeFolderId === 'none', we should show BOTH add buttons, or a unified one.
// Let's check how the add buttons are currently written.
fs.writeFileSync('src/components/Vault.tsx', content);

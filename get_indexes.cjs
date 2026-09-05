const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

const startMarker = "{(activeTab !== 'settings' && activeTab !== 'help') && activeFolderId !== null && (";
const endMarker = "{activeTab === 'settings' && (";
console.log("Start marker index:", content.indexOf(startMarker));
console.log("End marker index:", content.indexOf(endMarker));

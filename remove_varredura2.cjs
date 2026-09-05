const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

// The security tab uses nested brackets, making regex tricky. Let's replace by string indexOf
const startIndex = content.indexOf("{activeTab === 'security' && (");
if (startIndex !== -1) {
  // Let's find the end of this block by looking for the next tab
  const endIndex = content.indexOf("{activeTab === 'help' && (");
  if (endIndex !== -1) {
    content = content.slice(0, startIndex) + content.slice(endIndex);
  }
}
fs.writeFileSync('src/components/Vault.tsx', content);

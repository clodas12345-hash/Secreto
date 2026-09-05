const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

// Password Trash
content = content.replace(
  /setDeletingItem\(pw\.id\);\s*setDeletingItemType\('password'\);/,
  "if (confirm('Tem certeza que deseja excluir?')) { setPasswords(passwords.filter(p => p.id !== pw.id)); }"
);

// Password Edit
content = content.replace(
  /setActiveTab\('passwords'\);\s*setIsAdding\(true\);\s*setEditingItemId\(pw\.id\);\s*setNewItemName\(pw\.title\);\s*setNewItemDetail\(pw\.username\);\s*setNewItemPassword\(pw\.password \|\| ''\);\s*setNewItemAccessPassword\(pw\.accessPassword \|\| ''\);\s*setNewItemTransactionPassword\(pw\.transactionPassword \|\| ''\);\s*setNewItemAlphanumericPassword\(pw\.alphanumericPassword \|\| ''\);\s*setNewItemNotes\(pw\.notes \|\| ''\);/,
  "setEditingItem({ type: 'password', id: pw.id }); setEditItemName(pw.title); setEditItemDetail(pw.username); setEditItemPassword(pw.password || ''); setEditItemAccessPassword(pw.accessPassword || ''); setEditItemTransactionPassword(pw.transactionPassword || ''); setEditItemAlphanumericPassword(pw.alphanumericPassword || '');"
);

// Password Eye
content = content.replace(
  /<button\s+onClick=\{\(\) => \{\s*setViewingItem\(pw\);\s*setViewPasswordPin\(''\);\s*setViewPasswordError\(''\);\s*setIsViewPinModalOpen\(true\);\s*\}\}\s+className="text-zinc-600 hover:text-zinc-100 flex items-center gap-2 transition-colors"\s*>\s*<Eye className="w-4 h-4" \/>\s*<\/button>/g,
  ""
);

// Document Trash
content = content.replace(
  /setDeletingItem\(doc\.id\);\s*setDeletingItemType\('document'\);/,
  "if (confirm('Tem certeza que deseja excluir?')) { setDocuments(documents.filter(d => d.id !== doc.id)); }"
);

// Document Edit
content = content.replace(
  /setActiveTab\('documents'\);\s*setIsAdding\(true\);\s*setEditingItemId\(doc\.id\);\s*setEditItemName\(doc\.title\);\s*setEditItemDetail\(doc\.content\);\s*setEditItemFile\(doc\.fileData \|\| null\);\s*setEditItemFileType\(doc\.fileType \|\| null\);/,
  "setEditingItem({ type: 'document', id: doc.id }); setEditItemName(doc.title); setEditItemDetail(doc.content); setEditItemFile(doc.fileData || null); setEditItemFileType(doc.fileType || null);"
);

fs.writeFileSync('src/components/Vault.tsx', content);
console.log("Handlers patched!");

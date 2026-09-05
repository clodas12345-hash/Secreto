const fs = require('fs');
let content = fs.readFileSync('src/components/Vault.tsx', 'utf8');

// 1. Remove Sidebar
const sidebarRegex = /<aside className="w-64 bg-zinc-950\/50 border-r border-zinc-800\/50 p-6 hidden md:flex flex-col">[\s\S]*?<\/aside>/;
content = content.replace(sidebarRegex, '');

// 2. Remove mobile bottom navigation
const bottomNavRegex = /<nav className="md:hidden flex items-center justify-around bg-zinc-950\/90 backdrop-blur-xl border-t border-zinc-800\/50 p-2 pb-safe sticky bottom-0 z-40">[\s\S]*?<\/nav>/;
content = content.replace(bottomNavRegex, '');

// 3. Move settings button to header
const headerSettings = `
          <button onClick={() => setActiveTab(activeTab === 'settings' ? 'passwords' : 'settings')} className={\`transition-colors flex items-center gap-2 font-bold uppercase text-xs tracking-wider \${activeTab === 'settings' ? 'text-blue-500' : 'text-zinc-500 hover:text-zinc-300'}\`}>
            <Settings className="w-5 h-5" />
            <span className="hidden sm:inline">Ajustes</span>
          </button>
`;
content = content.replace(/<button onClick=\{onLogout\}/, headerSettings + '          <button onClick={onLogout}');

// 4. Update the folder filtering (remove activeTab condition)
// Find the logic that filters folders based on activeTab
content = content.replace(/const filteredFolders = folders\.filter\(f => \{[\s\S]*?return activeTab === 'passwords';\n\s*\}\);/, `const filteredFolders = folders;`);

fs.writeFileSync('src/components/Vault.tsx', content);

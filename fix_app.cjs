const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setAuthState('unauthenticated');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);`;

const replacement = `  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        timeoutId = setTimeout(() => {
          setAuthState('unauthenticated');
        }, 60000); // 1 minuto de tolerancia
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);`;

content = content.replace(target, replacement);
fs.writeFileSync('src/App.tsx', content);

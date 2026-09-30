import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

// Registra o Service Worker para suporte PWA / WebIntoApp com atualização automática
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      console.log('SW registered successfully:', registration);

      // Verifica por novas versões a cada 5 minutos
      setInterval(() => {
        registration.update().catch(err => console.log('Error checking for updates:', err));
      }, 5 * 60 * 1000);

      // Também verifica atualizações quando o usuário foca na página novamente
      window.addEventListener('focus', () => {
        registration.update().catch(err => console.log('Error checking focus updates:', err));
      });
    }).catch((err) => {
      console.log('SW registration error:', err);
    });
  });

  // Escuta mudanças de controle para recarregar a página com o novo código instalado
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      console.log('Nova versão detectada! Recarregando a página para aplicar as atualizações...');
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

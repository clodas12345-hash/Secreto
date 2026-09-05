// Utilitário para identificar aplicativos, sites e logos conhecidos
export interface RecognizedApp {
  name: string;
  domain: string;
  iconBg: string;
  iconText: string;
  category: 'Streaming' | 'Rede Social' | 'Banco & Finanças' | 'E-mail & Trabalho' | 'E-commerce' | 'Outro';
  brandColor: string;
  color?: string; // alias para brandColor
  iconUrl?: string; // Favicon URL direta
}

export const KNOWN_APPS: RecognizedApp[] = [
  // Streaming & Vídeo
  { name: 'Netflix', domain: 'netflix.com', iconBg: 'bg-red-600', iconText: 'N', category: 'Streaming', brandColor: '#E50914' },
  { name: 'YouTube', domain: 'youtube.com', iconBg: 'bg-red-600', iconText: 'YT', category: 'Streaming', brandColor: '#FF0000' },
  { name: 'Spotify', domain: 'spotify.com', iconBg: 'bg-emerald-500', iconText: '♫', category: 'Streaming', brandColor: '#1DB954' },
  { name: 'Disney+', domain: 'disneyplus.com', iconBg: 'bg-blue-700', iconText: 'D+', category: 'Streaming', brandColor: '#113CCF' },
  { name: 'Prime Video', domain: 'primevideo.com', iconBg: 'bg-sky-600', iconText: 'PV', category: 'Streaming', brandColor: '#00A8E1' },
  { name: 'HBO Max', domain: 'max.com', iconBg: 'bg-purple-700', iconText: 'MAX', category: 'Streaming', brandColor: '#5822B4' },
  { name: 'Twitch', domain: 'twitch.tv', iconBg: 'bg-purple-600', iconText: 'TW', category: 'Streaming', brandColor: '#9146FF' },

  // Redes Sociais & Mensagens
  { name: 'Instagram', domain: 'instagram.com', iconBg: 'bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600', iconText: 'IG', category: 'Rede Social', brandColor: '#E1306C' },
  { name: 'WhatsApp', domain: 'whatsapp.com', iconBg: 'bg-emerald-600', iconText: 'WA', category: 'Rede Social', brandColor: '#25D366' },
  { name: 'Facebook', domain: 'facebook.com', iconBg: 'bg-blue-600', iconText: 'FB', category: 'Rede Social', brandColor: '#1877F2' },
  { name: 'TikTok', domain: 'tiktok.com', iconBg: 'bg-zinc-900', iconText: 'TT', category: 'Rede Social', brandColor: '#000000' },
  { name: 'Twitter / X', domain: 'x.com', iconBg: 'bg-zinc-900', iconText: '𝕏', category: 'Rede Social', brandColor: '#000000' },
  { name: 'Telegram', domain: 'telegram.org', iconBg: 'bg-sky-500', iconText: 'TG', category: 'Rede Social', brandColor: '#229ED9' },
  { name: 'LinkedIn', domain: 'linkedin.com', iconBg: 'bg-blue-700', iconText: 'in', category: 'Rede Social', brandColor: '#0A66C2' },
  { name: 'Discord', domain: 'discord.com', iconBg: 'bg-indigo-600', iconText: 'DC', category: 'Rede Social', brandColor: '#5865F2' },
  { name: 'Reddit', domain: 'reddit.com', iconBg: 'bg-orange-600', iconText: 'RD', category: 'Rede Social', brandColor: '#FF4500' },

  // Bancos & Finanças
  { name: 'Nubank', domain: 'nubank.com.br', iconBg: 'bg-purple-600', iconText: 'NU', category: 'Banco & Finanças', brandColor: '#820AD1' },
  { name: 'Banco Inter', domain: 'inter.co', iconBg: 'bg-orange-500', iconText: 'IN', category: 'Banco & Finanças', brandColor: '#FF7A00' },
  { name: 'Itaú', domain: 'itau.com.br', iconBg: 'bg-orange-600', iconText: 'IT', category: 'Banco & Finanças', brandColor: '#EC7000' },
  { name: 'Bradesco', domain: 'bradesco.com.br', iconBg: 'bg-red-700', iconText: 'BR', category: 'Banco & Finanças', brandColor: '#CC092F' },
  { name: 'Banco do Brasil', domain: 'bb.com.br', iconBg: 'bg-yellow-400 text-blue-900', iconText: 'BB', category: 'Banco & Finanças', brandColor: '#FDFB00' },
  { name: 'Caixa', domain: 'caixa.gov.br', iconBg: 'bg-blue-600', iconText: 'CX', category: 'Banco & Finanças', brandColor: '#005CA9' },
  { name: 'Santander', domain: 'santander.com.br', iconBg: 'bg-red-600', iconText: 'SAN', category: 'Banco & Finanças', brandColor: '#EC0000' },
  { name: 'Mercado Pago', domain: 'mercadopago.com.br', iconBg: 'bg-sky-500', iconText: 'MP', category: 'Banco & Finanças', brandColor: '#009EE3' },
  { name: 'PicPay', domain: 'picpay.com', iconBg: 'bg-emerald-500', iconText: 'PP', category: 'Banco & Finanças', brandColor: '#21C25E' },
  { name: 'C6 Bank', domain: 'c6bank.com.br', iconBg: 'bg-zinc-900', iconText: 'C6', category: 'Banco & Finanças', brandColor: '#242424' },
  { name: 'PayPal', domain: 'paypal.com', iconBg: 'bg-blue-800', iconText: 'PP', category: 'Banco & Finanças', brandColor: '#003087' },
  { name: 'Binance', domain: 'binance.com', iconBg: 'bg-yellow-500 text-zinc-900', iconText: 'BN', category: 'Banco & Finanças', brandColor: '#F3BA2F' },

  // E-mail & Produtividade
  { name: 'Google / Gmail', domain: 'google.com', iconBg: 'bg-red-500', iconText: 'G', category: 'E-mail & Trabalho', brandColor: '#4285F4' },
  { name: 'Outlook / Microsoft', domain: 'microsoft.com', iconBg: 'bg-blue-600', iconText: 'MS', category: 'E-mail & Trabalho', brandColor: '#00A4EF' },
  { name: 'Apple / iCloud', domain: 'apple.com', iconBg: 'bg-zinc-800', iconText: '🍎', category: 'E-mail & Trabalho', brandColor: '#A2AAAD' },
  { name: 'GitHub', domain: 'github.com', iconBg: 'bg-zinc-900', iconText: 'GH', category: 'E-mail & Trabalho', brandColor: '#24292e' },
  { name: 'ChatGPT / OpenAI', domain: 'openai.com', iconBg: 'bg-emerald-700', iconText: 'AI', category: 'E-mail & Trabalho', brandColor: '#10A37F' },
  { name: 'Yahoo', domain: 'yahoo.com', iconBg: 'bg-purple-800', iconText: 'Y!', category: 'E-mail & Trabalho', brandColor: '#6001D2' },
  { name: 'Notion', domain: 'notion.so', iconBg: 'bg-zinc-900', iconText: 'N', category: 'E-mail & Trabalho', brandColor: '#000000' },
  { name: 'Slack', domain: 'slack.com', iconBg: 'bg-emerald-600', iconText: 'SL', category: 'E-mail & Trabalho', brandColor: '#4A154B' },

  // E-commerce
  { name: 'Amazon', domain: 'amazon.com.br', iconBg: 'bg-amber-600', iconText: 'a', category: 'E-commerce', brandColor: '#FF9900' },
  { name: 'Mercado Livre', domain: 'mercadolivre.com.br', iconBg: 'bg-yellow-400 text-blue-900', iconText: 'ML', category: 'E-commerce', brandColor: '#FFE600' },
  { name: 'Shopee', domain: 'shopee.com.br', iconBg: 'bg-orange-600', iconText: 'SH', category: 'E-commerce', brandColor: '#EE4D2D' },
  { name: 'AliExpress', domain: 'aliexpress.com', iconBg: 'bg-red-600', iconText: 'Ali', category: 'E-commerce', brandColor: '#FF4747' },
  { name: 'Magalu', domain: 'magazineluiza.com.br', iconBg: 'bg-blue-600', iconText: 'LU', category: 'E-commerce', brandColor: '#0086FF' },
  { name: 'iFood', domain: 'ifood.com.br', iconBg: 'bg-red-600', iconText: 'iF', category: 'E-commerce', brandColor: '#EA1D2C' },
  { name: 'Uber', domain: 'uber.com', iconBg: 'bg-zinc-900', iconText: 'UB', category: 'E-commerce', brandColor: '#000000' },
];

/**
 * Identifica o aplicativo ou site com base no nome digitado, URL ou termos chave
 */
export function identifyAppOrSite(input: string, website?: string): RecognizedApp | null {
  const query = (input || website || '').trim().toLowerCase();
  if (!query) return null;

  const targetWebsite = (website || '').trim().toLowerCase();

  // 1. Busca nos apps conhecidos
  for (const app of KNOWN_APPS) {
    const appNameLower = app.name.toLowerCase();
    const domainLower = app.domain.toLowerCase();

    if (
      query === appNameLower ||
      query === domainLower ||
      query.includes(domainLower) ||
      appNameLower.includes(query) ||
      query.includes(appNameLower.split('/')[0].trim()) ||
      (targetWebsite && (targetWebsite.includes(domainLower) || domainLower.includes(targetWebsite)))
    ) {
      return {
        ...app,
        color: app.brandColor,
        iconUrl: `https://www.google.com/s2/favicons?domain=${app.domain}&sz=64`
      };
    }
  }

  // 2. Termos específicos comuns em português
  if (query.includes('insta') || query.includes('face') || query.includes('fb')) {
    const matched = query.includes('insta') ? KNOWN_APPS.find(a => a.name === 'Instagram')! : KNOWN_APPS.find(a => a.name === 'Facebook')!;
    return { ...matched, color: matched.brandColor, iconUrl: `https://www.google.com/s2/favicons?domain=${matched.domain}&sz=64` };
  }
  if (query.includes('whats') || query.includes('zap') || query.includes('wpp')) {
    const matched = KNOWN_APPS.find(a => a.name === 'WhatsApp')!;
    return { ...matched, color: matched.brandColor, iconUrl: `https://www.google.com/s2/favicons?domain=${matched.domain}&sz=64` };
  }
  if (query.includes('nu') || query.includes('nubank') || query.includes('roxinho')) {
    const matched = KNOWN_APPS.find(a => a.name === 'Nubank')!;
    return { ...matched, color: matched.brandColor, iconUrl: `https://www.google.com/s2/favicons?domain=${matched.domain}&sz=64` };
  }
  if (query.includes('inter') || query.includes('banco inter')) {
    const matched = KNOWN_APPS.find(a => a.name === 'Banco Inter')!;
    return { ...matched, color: matched.brandColor, iconUrl: `https://www.google.com/s2/favicons?domain=${matched.domain}&sz=64` };
  }
  if (query.includes('itau') || query.includes('itaú')) {
    const matched = KNOWN_APPS.find(a => a.name === 'Itaú')!;
    return { ...matched, color: matched.brandColor, iconUrl: `https://www.google.com/s2/favicons?domain=${matched.domain}&sz=64` };
  }
  if (query.includes('bradesco')) {
    const matched = KNOWN_APPS.find(a => a.name === 'Bradesco')!;
    return { ...matched, color: matched.brandColor, iconUrl: `https://www.google.com/s2/favicons?domain=${matched.domain}&sz=64` };
  }
  if (query.includes('caixa') || query.includes('cef')) {
    const matched = KNOWN_APPS.find(a => a.name === 'Caixa')!;
    return { ...matched, color: matched.brandColor, iconUrl: `https://www.google.com/s2/favicons?domain=${matched.domain}&sz=64` };
  }
  if (query.includes('santander')) {
    const matched = KNOWN_APPS.find(a => a.name === 'Santander')!;
    return { ...matched, color: matched.brandColor, iconUrl: `https://www.google.com/s2/favicons?domain=${matched.domain}&sz=64` };
  }
  if (query.includes('gmail') || query.includes('google')) {
    const matched = KNOWN_APPS.find(a => a.name === 'Google / Gmail')!;
    return { ...matched, color: matched.brandColor, iconUrl: `https://www.google.com/s2/favicons?domain=${matched.domain}&sz=64` };
  }
  if (query.includes('outlook') || query.includes('hotmail') || query.includes('microsoft')) {
    const matched = KNOWN_APPS.find(a => a.name === 'Outlook / Microsoft')!;
    return { ...matched, color: matched.brandColor, iconUrl: `https://www.google.com/s2/favicons?domain=${matched.domain}&sz=64` };
  }
  if (query.includes('netflix')) {
    const matched = KNOWN_APPS.find(a => a.name === 'Netflix')!;
    return { ...matched, color: matched.brandColor, iconUrl: `https://www.google.com/s2/favicons?domain=${matched.domain}&sz=64` };
  }
  if (query.includes('mercado') || query.includes('ml')) {
    const matched = query.includes('pago') ? KNOWN_APPS.find(a => a.name === 'Mercado Pago')! : KNOWN_APPS.find(a => a.name === 'Mercado Livre')!;
    return { ...matched, color: matched.brandColor, iconUrl: `https://www.google.com/s2/favicons?domain=${matched.domain}&sz=64` };
  }

  // Se parecer uma URL genérica (ex: "app.empresa.com.br" ou campo website)
  const candidateDomain = targetWebsite || query;
  if (candidateDomain.includes('.') && !candidateDomain.includes(' ')) {
    const domainPart = candidateDomain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    const shortName = domainPart.split('.')[0].toUpperCase().slice(0, 3);
    return {
      name: (input && !input.includes('.')) ? input : domainPart,
      domain: domainPart,
      iconBg: 'bg-zinc-800',
      iconText: shortName || '🌐',
      category: 'Outro',
      brandColor: '#3B82F6',
      color: '#3B82F6',
      iconUrl: `https://www.google.com/s2/favicons?domain=${domainPart}&sz=64`
    };
  }

  return null;
}

/**
 * Retorna URL do Favicon oficial do site pelo serviço do Google / DuckDuckGo
 */
export function getFaviconUrl(domainOrName: string): string {
  let domain = domainOrName.toLowerCase().trim();
  const recognized = identifyAppOrSite(domain);
  if (recognized) {
    domain = recognized.domain;
  }
  if (!domain.includes('.')) {
    domain = `${domain}.com`;
  }
  domain = domain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

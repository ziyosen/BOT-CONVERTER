import { generateClashConfig, generateNekoboxConfig, generateSingboxConfig } from './configGenerators.js';
import { checkProxyStatus, generateAllLinks } from './linkParser.js';

// Konfigurasi
const DEFAULT_API_URL = 'https://api.telegram.org';
const PROXY_LIST_URL = 'https://raw.githubusercontent.com/stpdwrld/Stupid-Tunnel/main/allproxy.txt';
const MAX_PROXY_CHECKS = 5;

const servers = ['ID', 'SG', 'US', 'JP', 'DE']; // Contoh server prioritas
const countryFlags = {
  ID: '🇮🇩', SG: '🇸🇬', US: '🇺🇸', 
  JP: '🇯🇵', DE: '🇩🇪' // Tambahkan lainnya sesuai kebutuhan
};

const wildcardDomains = [
  'netflix.com', 'zoom.us', 'google.com', 
  'facebook.com', 'instagram.com'
];

export default class TelegramBot {
  constructor(token, apiUrl = DEFAULT_API_URL) {
    this.token = token;
    this.apiUrl = apiUrl;
    this.userProgress = {};
    this.selectedProxies = {};
  }

  async handleUpdate(update) {
    if (!update.message && !update.callback_query) {
      return new Response('OK', { status: 200 });
    }

    const chatId = update.message?.chat.id || update.callback_query?.message.chat.id;
    const text = update.message?.text || '';
    const callbackData = update.callback_query?.data || '';

    try {
      if (callbackData) {
        await this.handleCallbackQuery(chatId, callbackData, update.callback_query.message.message_id);
      } else if (text.startsWith('/start')) {
        await this.sendStartMessage(chatId);
      } else if (text.startsWith('/create')) {
        await this.startCreation(chatId);
      } else if (text.startsWith('/checkproxy')) {
        await this.handleProxyCheck(chatId, text);
      } else if (text.includes('://')) {
        await this.handleConfigConversion(chatId, text);
      } else if (text.match(/^\d+\.\d+\.\d+\.\d+:\d+$/)) {
        const [ip, port] = text.split(':');
        await this.checkAndDisplayProxyStatus(chatId, ip, port);
      } else {
        await this.sendMessage(chatId, 'Perintah tidak dikenali. Gunakan /start untuk bantuan.');
      }
    } catch (error) {
      console.error(`Error handling update: ${error.message}`);
      await this.sendMessage(chatId, '⚠️ Terjadi error, silakan coba lagi.');
    }

    return new Response('OK', { status: 200 });
  }

  async handleCallbackQuery(chatId, data, messageId) {
    try {
      if (data.startsWith('server_')) {
        const server = data.split('_')[1];
        this.userProgress[chatId] = { server };
        
        await this.deleteMessage(chatId, messageId);
        const loadingMsg = await this.sendMessage(chatId, `🔍 Mencari proxy untuk ${countryFlags[server]} ${server}...`);

        const ipPort = await this.fetchProxyList(server, chatId);
        
        if (loadingMsg) await this.deleteMessage(chatId, loadingMsg);

        if (!ipPort.includes(':')) {
          await this.sendMessage(chatId, ipPort);
          return;
        }

        this.userProgress[chatId].ipPort = ipPort;
        await this.sendInlineButtons(
          chatId,
          `✅ Proxy aktif ditemukan: ${ipPort}\nPilih tipe konfigurasi:`,
          [
            { text: "🌐 Pakai Wildcard", callback_data: "wildcard" },
            { text: "🚫 Tanpa Wildcard", callback_data: "non_wildcard" }
          ]
        );
      } 
      else if (data === 'wildcard') {
        await this.deleteMessage(chatId, messageId);
        await this.handleWildcardSelection(chatId);
      } 
      else if (data === 'non_wildcard') {
        await this.deleteMessage(chatId, messageId);
        await this.finalizeConfig(chatId, 'vpn.stupidworld.web.id');
      } 
      else if (data.startsWith('domain_')) {
        const domain = data.split('_')[1];
        await this.deleteMessage(chatId, messageId);
        await this.finalizeConfig(chatId, domain);
      }
    } catch (error) {
      console.error(`Callback error: ${error.message}`);
      await this.sendMessage(chatId, '❌ Gagal memproses pilihan, silakan coba lagi.');
    }
  }

  async fetchProxyList(countryCode, chatId) {
    try {
      const response = await fetch(PROXY_LIST_URL);
      if (!response.ok) throw new Error('Gagal mengambil daftar proxy');
      
      const textData = await response.text();
      const lines = textData.split('\n')
        .filter(line => line.trim().includes(','))
        .map(line => {
          const [ip, port, country] = line.split(',');
          return { ip: ip.trim(), port: port.trim(), country: country.trim() };
        })
        .filter(proxy => proxy.country.toLowerCase() === countryCode.toLowerCase());

      if (lines.length === 0) {
        return `❌ Tidak ada proxy tersedia untuk ${countryCode}`;
      }

      // Cek beberapa proxy secara acak
      const shuffled = [...lines].sort(() => Math.random() - 0.5);
      const proxiesToCheck = shuffled.slice(0, MAX_PROXY_CHECKS);

      for (const { ip, port } of proxiesToCheck) {
        try {
          const status = await checkProxyStatus(ip, port);
          if (status.status === 'active') {
            return `${ip}:${port}`;
          }
        } catch (error) {
          console.error(`Error checking proxy ${ip}:${port}:`, error);
        }
      }

      return '❌ Tidak menemukan proxy aktif, coba lagi nanti';
    } catch (error) {
      console.error('Error fetching proxy list:', error);
      return '⚠️ Gagal memeriksa proxy, silakan coba lagi nanti';
    }
  }

  // ... [Method-method lainnya tetap sama]
}

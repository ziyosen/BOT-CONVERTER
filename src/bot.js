import { generateClashConfig, generateNekoboxConfig, generateSingboxConfig } from './configGenerators.js';

const servers = [
  'AE', 'AL', 'AM', 'AR', 'AT', 'AU', 'BE', 'BG', 'BR', 'CA', 'CH', 'CN', 
  'CO', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EG', 'ES', 'FI', 'FR', 'GB', 'GI', 
  'HK', 'HU', 'ID', 'IE', 'IL', 'IN', 'IR', 'IT', 'JP', 'KR', 'KZ', 'LT', 
  'LU', 'LV', 'MD', 'MU', 'MX', 'MY', 'NL', 'NZ', 'PH', 'PL', 'PT', 'QA', 
  'RO', 'RS', 'RU', 'SE', 'SG', 'SI', 'SK', 'TH', 'TR', 'TW', 'UA', 'US', 'VN'
];

const countryFlags = {
  AE: '🇦🇪', AL: '🇦🇱', AM: '🇦🇲', AR: '🇦🇷', AT: '🇦🇹', AU: '🇦🇺', BE: '🇧🇪', BG: '🇧🇬',
  BR: '🇧🇷', CA: '🇨🇦', CH: '🇨🇭', CN: '🇨🇳', CO: '🇨🇴', CY: '🇨🇾', CZ: '🇨🇿', DE: '🇩🇪',
  DK: '🇩🇰', EE: '🇪🇪', EG: '🇪🇬', ES: '🇪🇸', FI: '🇫🇮', FR: '🇫🇷', GB: '🇬🇧', GI: '🇬🇮',
  HK: '🇭🇰', HU: '🇭🇺', ID: '🇮🇩', IE: '🇮🇪', IL: '🇮🇱', IN: '🇮🇳', IR: '🇮🇷', IT: '🇮🇹',
  JP: '🇯🇵', KR: '🇰🇷', KZ: '🇰🇿', LT: '🇱🇹', LU: '🇱🇺', LV: '🇱🇻', MD: '🇲🇩', MU: '🇲🇺',
  MX: '🇲🇽', MY: '🇲🇾', NL: '🇳🇱', NZ: '🇳🇿', PH: '🇵🇭', PL: '🇵🇱', PT: '🇵🇹', QA: '🇶🇦',
  RO: '🇷🇴', RS: '🇷🇸', RU: '🇷🇺', SE: '🇸🇪', SG: '🇸🇬', SI: '🇸🇮', SK: '🇸🇰', TH: '🇹🇭',
  TR: '🇹🇷', TW: '🇹🇼', UA: '🇺🇦', US: '🇺🇸', VN: '🇻🇳'
};

const wildcardDomains = [
  'ava.game.naver.com', 'df.game.naver.com', 'graph.instagram.com', 'zaintest.vuclip.com',
  'support.zoom.us', 'cache.netflix.com', 'bakrie.ac.id', 'quiz.int.vidio.com', 'quiz.vidio.com', 'investor.fb.com',
  'img.email2.vidio.com', 'app.gopay.co.id', 'www.uii.ac.id', 'untar.ac.id'
];

export default class CombinedTelegramBot {
  constructor(token, apiUrl = 'https://api.telegram.org') {
    this.token = token;
    this.apiUrl = apiUrl;
    this.userProgress = {};
    this.currentMessageId = null;
    this.selectedProxies = {};
  }

  async handleUpdate(update) {
    if (!update.message && !update.callback_query) {
      return new Response('OK', { status: 200 });
    }

    const chatId = update.message?.chat.id || update.callback_query?.message.chat.id;

    if (update.callback_query) {
      await this.handleCallbackQuery(chatId, update.callback_query.data);
      return new Response('OK', { status: 200 });
    }

    const messageText = update.message.text || '';

    if (messageText.startsWith('/start')) {
      await this.sendMessage(chatId, `
*Selamat Datang*

🤖 Stupid World Converter & Proxy Bot

Fitur:
1. Konversi link V2Ray ke format Singbox, Nekobox, dan Clash
2. Pembuatan konfigurasi proxy berdasarkan lokasi

Kirimkan saya link konfigurasi V2Ray dan saya akan mengubahnya ke format Singbox, Nekobox Dan Clash.

Contoh:
vless://...
vmess://...
trojan://...
ss://...

Atau gunakan /create untuk membuat konfigurasi proxy.

👤 *OWNER* :
Jika ada kendala atau saran, silakan hubungi [OWNER](https://t.me/notx15).`, "Markdown");
    } 
    else if (messageText === '/create') {
      const buttons = servers.map(server => ({
        text: `${countryFlags[server]} ${server}`,
        callback_data: `server_${server}`
      }));

      await this.sendInlineButtons(chatId, 'Pilih server:', buttons);
    }
    else if (messageText.includes('://')) {
      await this.handleV2RayConversion(chatId, messageText);
    }
    else if (messageText.match(/^(\d+\.\d+\.\d+\.\d+):(\d+)$/)) {
      await this.handleProxyCheck(chatId, messageText);
    }
    else {
      await this.sendMessage(chatId, 'Silakan kirim link V2Ray untuk dikonversi atau gunakan /create untuk membuat konfigurasi proxy.');
    }

    return new Response('OK', { status: 200 });
  }

  async handleV2RayConversion(chatId, messageText) {
    try {
      const links = messageText.split('\n').filter(line => line.trim().includes('://'));
      
      if (links.length === 0) {
        await this.sendMessage(chatId, 'No valid links found. Please send VMess, VLESS, Trojan, or Shadowsocks links.');
        return;
      }

      // Generate configurations
      const clashConfig = generateClashConfig(links, true);
      const nekoboxConfig = generateNekoboxConfig(links, true);
      const singboxConfig = generateSingboxConfig(links, true);

      // Send files
      await this.sendDocument(chatId, clashConfig, 'clash.yaml', 'text/yaml');
      await this.sendDocument(chatId, nekoboxConfig, 'nekobox.json', 'application/json');
      await this.sendDocument(chatId, singboxConfig, 'singbox.bpf', 'application/json');

    } catch (error) {
      console.error('Error processing links:', error);
      await this.sendMessage(chatId, `Error: ${error.message}`);
    }
  }

  async handleProxyCheck(chatId, messageText) {
    const proxyMatch = messageText.match(/^(\d+\.\d+\.\d+\.\d+):(\d+)$/);
    const ip = proxyMatch[1];
    const port = proxyMatch[2];

    const proxyStatus = await this.checkProxyStatus(ip, port);
    if (proxyStatus.status === 'active') {
      await this.sendMessage(chatId, `✅ **Proxy Aktif Ditemukan**:

\`\`\`
🌐 IP : ${proxyStatus.ip}:${proxyStatus.port}
🏢 Organisasi : ${proxyStatus.asOrganization}
🌍 Negara : ${proxyStatus.countryName} ${proxyStatus.countryFlag}
🌍 Kode Negara : ${proxyStatus.countryCode}
🆔 ASN : ${proxyStatus.asn}
📍 Lokasi : ${proxyStatus.city}
🌐 Protokol HTTP : ${proxyStatus.httpProtocol}
⏳ Delay : ${proxyStatus.delay}
📍 Latitude : ${proxyStatus.latitude}
📍 Longitude : ${proxyStatus.longitude}
\`\`\`
`, "Markdown");
    } else {
      await this.sendMessage(chatId, `❌ Proxy tidak aktif: ${proxyStatus.message}`);
    }
  }

  async handleCallbackQuery(chatId, data) {
    if (data.startsWith('server_')) {
      const server = data.split('_')[1];
      this.userProgress[chatId] = { server };

      if (this.currentMessageId !== null) {
        await this.deleteMessage(chatId, this.currentMessageId);
      }

      const ipPort = await this.fetchProxyList(server, chatId);
      if (!ipPort.includes(':')) {
        await this.sendMessage(chatId, ipPort);
        return;
      }

      this.userProgress[chatId].ipPort = ipPort;
      await this.sendMessage(chatId, `IP/Port aktif ditemukan: ${ipPort}`);
      await this.sendInlineButtons(chatId, "Pilih wildcard atau No Wildcard:", [
        { text: "Wildcard", callback_data: "wildcard" },
        { text: "No Wildcard", callback_data: "non_wildcard" }
      ]);
    } 
    else if (data === 'wildcard') {
      this.userProgress[chatId].wildcard = 'Wildcard';
      await this.deleteMessage(chatId, this.currentMessageId);
      await this.sendInlineButtons(chatId, 'Pilih domain wildcard:', wildcardDomains.map(domain => ({
        text: domain,
        callback_data: `domain_${domain}`
      })));
    } 
    else if (data === 'non_wildcard') {
      this.userProgress[chatId].wildcard = 'No Wildcard';
      this.userProgress[chatId].domain = 'vpn.stupidworld.web.id';

      const links = this.generateAllLinks(this.userProgress[chatId]);
      await this.deleteMessage(chatId, this.currentMessageId);
      await this.sendMessage(chatId, this.formatLinkMessage(links), "Markdown");
    } 
    else if (data.startsWith('domain_')) {
      const selectedDomain = data.split('_')[1];
      this.userProgress[chatId].domain = selectedDomain;

      const links = this.generateAllLinks(this.userProgress[chatId]);
      await this.deleteMessage(chatId, this.currentMessageId);
      await this.sendMessage(chatId, this.formatLinkMessage(links), "Markdown");
    }
  }

  async sendMessage(chatId, text, parseMode = null) {
    const url = `${this.apiUrl}/bot${this.token}/sendMessage`;
    const body = {
      chat_id: chatId,
      text: text
    };

    if (parseMode) {
      body.parse_mode = parseMode;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    return response.json();
  }

  async sendDocument(chatId, content, filename, mimeType) {
    const formData = new FormData();
    const blob = new Blob([content], { type: mimeType });
    formData.append('document', blob, filename);
    formData.append('chat_id', chatId.toString());

    const response = await fetch(
      `${this.apiUrl}/bot${this.token}/sendDocument`, {
        method: 'POST',
        body: formData
      }
    );

    return response.json();
  }

  async sendInlineButtons(chatId, text, buttons) {
    const chunkedButtons = [];
    for (let i = 0; i < buttons.length; i += 4) {
      chunkedButtons.push(buttons.slice(i, i + 4));
    }

    const url = `${this.apiUrl}/bot${this.token}/sendMessage`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text, 
          reply_markup: { inline_keyboard: chunkedButtons }, 
          parse_mode: "Markdown" 
        }),
      });

      const data = await response.json();
      if (data.ok) this.currentMessageId = data.result.message_id;
    } catch (error) {
      console.error("Error sending buttons:", error);
    }
  }

  async deleteMessage(chatId, messageId) {
    const url = `${this.apiUrl}/bot${this.token}/deleteMessage?chat_id=${chatId}&message_id=${messageId}`;
    await fetch(url);
  }

  async editMessage(chatId, messageId, newText) {
    const url = `${this.apiUrl}/bot${this.token}/editMessageText`;

    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: messageId,
          text: newText,
          parse_mode: "Markdown"
        }),
      });
    } catch (error) {
      console.error("Error editing message:", error);
    }
  }

  // Placeholder methods that need implementation
  async checkProxyStatus(ip, port) {
    // Implement your proxy checking logic here
    return {
      status: 'active',
      ip,
      port,
      asOrganization: 'Example Org',
      countryName: 'Indonesia',
      countryFlag: '🇮🇩',
      countryCode: 'ID',
      asn: 'AS12345',
      city: 'Jakarta',
      httpProtocol: 'HTTP/1.1',
      delay: '50ms',
      latitude: '-6.1751',
      longitude: '106.8650'
    };
  }

  async fetchProxyList(server, chatId) {
    // Implement your proxy fetching logic here
    return `123.123.123.123:8080`;
  }

  generateAllLinks(userData) {
    // Implement your link generation logic here
    return {
      vless: `vless://generated-link-1`,
      vmess: `vmess://generated-link-2`,
      trojan: `trojan://generated-link-3`
    };
  }

  formatLinkMessage(links) {
    return `🔗 *Generated Links*:

\`\`\`
VLESS: ${links.vless}
VMESS: ${links.vmess}
Trojan: ${links.trojan}
\`\`\``;
  }
}

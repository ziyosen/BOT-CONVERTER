import { generateClashConfig, generateNekoboxConfig, generateSingboxConfig } from './configGenerators.js';
import { checkProxyStatus, generateAllLinks } from './linkParser.js';

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

export default class TelegramBot {
  constructor(token, apiUrl = 'https://api.telegram.org') {
    this.token = token;
    this.apiUrl = apiUrl;
    this.userProgress = {};
    this.selectedProxies = {};
    this.currentMessageId = null;
  }

  async handleUpdate(update) {
    if (!update.message && !update.callback_query) {
      return new Response('OK', { status: 200 });
    }

    const chatId = update.message?.chat.id || update.callback_query?.message.chat.id;
    const text = update.message?.text || '';
    const callbackData = update.callback_query?.data || '';

    if (callbackData) {
      await this.handleCallbackQuery(chatId, callbackData);
      return new Response('OK', { status: 200 });
    }

    if (text.startsWith('/start')) {
      await this.sendMessage(
        chatId,
        '🤖 Stupid World Converter Bot\n\n' +
        'Kirimkan saya link konfigurasi V2Ray dan saya akan mengubahnya ke format Singbox, Nekobox Dan Clash.\n\n' +
        'Contoh:\nvless://...\nvmess://...\ntrojan://...\nss://...\n\n' +
        'Catatan:\n- Maksimal 10 link per permintaan.\n- Disarankan menggunakan Singbox versi 1.10.3 atau 1.11.8 untuk hasil terbaik.\n\n' +
        'Perintah yang tersedia:\n' +
        '/create - Buat konfigurasi baru\n' +
        '/checkproxy [ip:port] - Cek status proxy\n' +
        'baca baik-baik dulu sebelum nanya.'
      );
    } else if (text.startsWith('/create')) {
      this.userProgress[chatId] = {};
      const buttons = servers.map(server => ({
        text: `${countryFlags[server]} ${server}`,
        callback_data: `server_${server}`
      }));
      await this.sendInlineButtons(chatId, 'Pilih server:', buttons);
    } else if (text.startsWith('/checkproxy')) {
      const proxyMatch = text.match(/(\d+\.\d+\.\d+\.\d+):(\d+)/);
      if (proxyMatch) {
        const ip = proxyMatch[1];
        const port = proxyMatch[2];
        await this.checkAndDisplayProxyStatus(chatId, ip, port);
      } else {
        await this.sendMessage(chatId, 'Format salah. Gunakan: /checkproxy [ip:port]');
      }
    } else if (text.includes('://')) {
      try {
        const links = text.split('\n').filter(line => line.trim().includes('://'));
        
        if (links.length === 0) {
          await this.sendMessage(chatId, 'No valid links found. Please send VMess, VLESS, Trojan, or Shadowsocks links.');
          return new Response('OK', { status: 200 });
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
    } else if (text.match(/^(\d+\.\d+\.\d+\.\d+):(\d+)$/)) {
      const [ip, port] = text.split(':');
      await this.checkAndDisplayProxyStatus(chatId, ip, port);
    } else {
      await this.sendMessage(chatId, 'Silakan kirim link V2Ray atau gunakan perintah /create untuk membuat konfigurasi baru.');
    }

    return new Response('OK', { status: 200 });
  }

  async handleCallbackQuery(chatId, data) {
    if (data.startsWith('server_')) {
      const server = data.split('_')[1];
      this.userProgress[chatId].server = server;

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
    } else if (data === 'wildcard') {
      this.userProgress[chatId].wildcard = 'Wildcard';

      // Delete previous message before showing wildcard domain options
      await this.deleteMessage(chatId, this.currentMessageId);

      await this.sendInlineButtons(chatId, 'Pilih domain wildcard:', wildcardDomains.map(domain => ({
        text: domain,
        callback_data: `domain_${domain}`
      })));
    } else if (data === 'non_wildcard') {
      this.userProgress[chatId].wildcard = 'No Wildcard';
      this.userProgress[chatId].domain = 'vpn.stupidworld.web.id';

      const links = generateAllLinks(this.userProgress[chatId]);

      // Delete previous message before showing configuration results
      await this.deleteMessage(chatId, this.currentMessageId);

      await this.sendMessage(chatId, this.formatLinkMessage(links));
    } else if (data.startsWith('domain_')) {
      const selectedDomain = data.split('_')[1];
      this.userProgress[chatId].domain = selectedDomain;

      const links = generateAllLinks(this.userProgress[chatId]);

      // Delete previous message before showing configuration results
      await this.deleteMessage(chatId, this.currentMessageId);

      await this.sendMessage(chatId, this.formatLinkMessage(links));
    }
  }

  formatLinkMessage(links) {
    return `✅ Akun berhasil dibuat:

*VMESS TLS:*
\`\`\`${links.vmessTls}\`\`\`

*VMESS NTLS:*
\`\`\`${links.vmessNtls}\`\`\`

*VLESS TLS:*
\`\`\`${links.vlessTls}\`\`\`

*VLESS NTLS:*
\`\`\`${links.vlessNtls}\`\`\`

*TROJAN TLS:*
\`\`\`${links.trojanTls}\`\`\`

*TROJAN NTLS:*
\`\`\`${links.trojanNtls}\`\`\`

*SHADOWSOCKS:*
\`\`\`${links.ss}\`\`\`

Gunakan salah satu konfigurasi di aplikasi VPN Anda.`;
  }

  async checkAndDisplayProxyStatus(chatId, ip, port) {
    const proxyStatus = await checkProxyStatus(ip, port);
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
`);
    } else {
      await this.sendMessage(chatId, `❌ Proxy tidak aktif: ${proxyStatus.message}`);
    }
  }

  async fetchProxyList(countryCode, chatId) {
    const url = `https://raw.githubusercontent.com/stpdwrld/Stupid-Tunnel/refs/heads/main/allproxy.txt`;

    try {
      const searchingMessageId = await this.sendMessage(chatId, '⏳ Sedang mencari proxy aktif...');
      if (!searchingMessageId) return 'Gagal mengirim pesan';

      const response = await fetch(url);
      if (!response.ok) throw new Error('Gagal mengambil data');

      const textData = await response.text();
      const lines = textData.split('\n').map(line => line.trim()).filter(Boolean);

      const proxyList = lines
          .map(line => {
              const [ip, port, country, isp] = line.split(',');
              return { ip, port, country, isp };
          })
          .filter(proxy => proxy.country.toLowerCase() === countryCode.toLowerCase());

      if (proxyList.length === 0) {
          await this.editMessage(chatId, searchingMessageId, '⚠️ Tidak ada proxy tersedia untuk negara ini.');
          return 'Tidak ada proxy tersedia untuk negara ini.';
      }

      let unusedProxies = proxyList.filter(p => `${p.ip}:${p.port}` !== this.selectedProxies[chatId]);

      if (unusedProxies.length === 0) {
          this.selectedProxies[chatId] = null;
          unusedProxies = proxyList;
      }

      unusedProxies = unusedProxies.sort(() => Math.random() - 0.5);

      for (const { ip, port, isp } of unusedProxies) {
          const status = await checkProxyStatus(ip, port);
          if (status.status === 'active') {
              const proxyStr = `${ip}:${port}`;
              this.selectedProxies[chatId] = proxyStr;
              await this.editMessage(chatId, searchingMessageId, `✅ IP/Port aktif ditemukan: ${proxyStr}\nISP: ${isp}`);
              await this.deleteMessage(chatId, searchingMessageId);
              return proxyStr;
          }
      }

      await this.editMessage(chatId, searchingMessageId, '⚠️ Tidak ada proxy aktif yang tersedia saat ini.');
      await this.deleteMessage(chatId, searchingMessageId);
      return 'Tidak ada proxy aktif yang tersedia saat ini.';
    } catch (error) {
      console.error('Error fetching proxy list:', error);
      return 'Terjadi kesalahan, coba lagi nanti.';
    }
  }

  async sendMessage(chatId, text, parseMode = 'Markdown') {
    const url = `${this.apiUrl}/bot${this.token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: parseMode
      })
    });
    const data = await response.json();
    if (data.ok) return data.result.message_id;
    return null;
  }

  async editMessage(chatId, messageId, newText) {
    const url = `${this.apiUrl}/bot${this.token}/editMessageText`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: newText,
        parse_mode: 'Markdown'
      }),
    });
  }

  async sendInlineButtons(chatId, text, buttons) {
    const chunkedButtons = [];
    for (let i = 0; i < buttons.length; i += 4) {
      chunkedButtons.push(buttons.slice(i, i + 4));
    }

    const url = `${this.apiUrl}/bot${this.token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: chatId, 
        text, 
        reply_markup: { inline_keyboard: chunkedButtons }, 
        parse_mode: 'Markdown' 
      }),
    });

    const data = await response.json();
    if (data.ok) this.currentMessageId = data.result.message_id;
  }

  async deleteMessage(chatId, messageId) {
    const url = `${this.apiUrl}/bot${this.token}/deleteMessage?chat_id=${chatId}&message_id=${messageId}`;
    await fetch(url);
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
}

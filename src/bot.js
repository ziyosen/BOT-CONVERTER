import { generateClashConfig, generateNekoboxConfig, generateSingboxConfig } from './configGenerators.js';

export default class TelegramBot {
  constructor(token, apiUrl = 'https://api.telegram.org') {
    this.token = token;
    this.apiUrl = apiUrl;
    this.servers = [
      'AE', 'AL', 'AM', 'AR', 'AT', 'AU', 'BE', 'BG', 'BR', 'CA', 'CH', 'CN', 
      'CO', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EG', 'ES', 'FI', 'FR', 'GB', 'GI', 
      'HK', 'HU', 'ID', 'IE', 'IL', 'IN', 'IR', 'IT', 'JP', 'KR', 'KZ', 'LT', 
      'LU', 'LV', 'MD', 'MU', 'MX', 'MY', 'NL', 'NZ', 'PH', 'PL', 'PT', 'QA', 
      'RO', 'RS', 'RU', 'SE', 'SG', 'SI', 'SK', 'TH', 'TR', 'TW', 'UA', 'US', 'VN'
    ];
    this.countryFlags = {
      AE: '🇦🇪', AL: '🇦🇱', AM: '🇦🇲', AR: '🇦🇷', AT: '🇦🇹', AU: '🇦🇺', BE: '🇧🇪', BG: '🇧🇬',
      BR: '🇧🇷', CA: '🇨🇦', CH: '🇨🇭', CN: '🇨🇳', CO: '🇨🇴', CY: '🇨🇾', CZ: '🇨🇿', DE: '🇩🇪',
      DK: '🇩🇰', EE: '🇪🇪', EG: '🇪🇬', ES: '🇪🇸', FI: '🇫🇮', FR: '🇫🇷', GB: '🇬🇧', GI: '🇬🇮',
      HK: '🇭🇰', HU: '🇭🇺', ID: '🇮🇩', IE: '🇮🇪', IL: '🇮🇱', IN: '🇮🇳', IR: '🇮🇷', IT: '🇮🇹',
      JP: '🇯🇵', KR: '🇰🇷', KZ: '🇰🇿', LT: '🇱🇹', LU: '🇱🇺', LV: '🇱🇻', MD: '🇲🇩', MU: '🇲🇺',
      MX: '🇲🇽', MY: '🇲🇾', NL: '🇳🇱', NZ: '🇳🇿', PH: '🇵🇭', PL: '🇵🇱', PT: '🇵🇹', QA: '🇶🇦',
      RO: '🇷🇴', RS: '🇷🇸', RU: '🇷🇺', SE: '🇸🇪', SG: '🇸🇬', SI: '🇸🇮', SK: '🇸🇰', TH: '🇹🇭',
      TR: '🇹🇷', TW: '🇹🇼', UA: '🇺🇦', US: '🇺🇸', VN: '🇻🇳'
    };
    this.wildcardDomains = [
      'ava.game.naver.com', 'df.game.naver.com', 'graph.instagram.com', 'zaintest.vuclip.com',
      'support.zoom.us', 'cache.netflix.com', 'bakrie.ac.id', 'quiz.int.vidio.com', 'quiz.vidio.com', 'investor.fb.com',
      'img.email2.vidio.com', 'app.gopay.co.id', 'www.uii.ac.id', 'untar.ac.id'
    ];
    this.userProgress = {};
    this.selectedProxies = {};
    this.currentMessageId = null;
    this.passuid = this.generateUUID();
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  async checkProxyStatus(ip, port) {
    const url = `https://api2.stupidworld.web.id/check?ip=${ip}:${port}`;
    console.log(`Checking proxy status for ${ip}:${port}...`);

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.proxyip === true) {
        return {
          status: 'active',
          ip: data.ip ?? 'Unknown',
          port: data.port ?? 'Unknown',
          asOrganization: data.asOrganization ?? 'Unknown',
          countryCode: data.countryCode ?? 'Unknown',
          countryName: data.countryName ?? 'Unknown',
          countryFlag: data.countryFlag ?? '',
          asn: data.asn ?? 'Unknown',
          city: data.colo ?? '',
          httpProtocol: data.httpProtocol ?? 'Unknown',
          delay: data.delay ?? 'Unknown',
          latitude: data.latitude ?? 'Unknown',
          longitude: data.longitude ?? 'Unknown'
        };
      } else {
        return {
          status: 'dead',
          message: data.message ?? 'Proxy mati'
        };
      }
    } catch (error) {
      console.error('Error checking proxy status:', error);
      return {
        status: 'dead',
        message: 'Gagal menghubungi server pengecekan.'
      };
    }
  }

  async fetchProxyList(countryCode, chatId) {
    const url = `https://raw.githubusercontent.com/stpdwrld/Stupid-Tunnel/refs/heads/main/allproxy.txt`;

    try {
      const searchingMessageId = await this.sendMessage(chatId, '⏳ Sedang mencari proxy aktif...');
      if (!searchingMessageId) return;

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
        const proxyStatus = await this.checkProxyStatus(ip, port);
        if (proxyStatus.status === 'active') {
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

  async handleUpdate(update) {
    if (update.message) {
      const chatId = update.message.chat.id;
      const messageText = update.message.text || '';

      if (messageText === '/start') {
        await this.handleStartCommand(chatId);
        return new Response('OK', { status: 200 });
      }

      if (messageText === '/create') {
        await this.handleCreateCommand(chatId);
        return new Response('OK', { status: 200 });
      }

      if (messageText === '/convert') {
        await this.handleConvertCommand(chatId);
        return new Response('OK', { status: 200 });
      }

      const proxyMatch = messageText.match(/^(\d+\.\d+\.\d+\.\d+):(\d+)$/);
      if (proxyMatch) {
        await this.handleProxyCheck(chatId, proxyMatch[1], proxyMatch[2]);
        return new Response('OK', { status: 200 });
      }

      if (messageText.includes('://')) {
        await this.handleLinkConversion(chatId, messageText);
        return new Response('OK', { status: 200 });
      }

      await this.sendMessage(chatId, 'Perintah tidak dikenali. Gunakan /start, /create, atau /convert.');
    } else if (update.callback_query) {
      const chatId = update.callback_query.message.chat.id;
      const messageId = update.callback_query.message.message_id;
      const data = update.callback_query.data;
      
      // Update current message ID before processing
      this.currentMessageId = messageId;
      
      await this.handleCallbackQuery(chatId, data);
    }

    return new Response('OK', { status: 200 });
  }

  async handleStartCommand(chatId) {
    await this.sendMessage(chatId, `
🤖 *Stupid World VPN Bot*

Bot ini memiliki 3 fitur utama:

1. */create* - Buat konfigurasi VPN baru
2. */convert* - Konversi link VPN ke format lain
3. *Check Proxy* - Kirim IP:PORT untuk mengecek status proxy

👤 *OWNER* :
Jika ada kendala atau saran, silakan hubungi [OWNER](https://t.me/notx15).`);
  }

  async handleCreateCommand(chatId) {
    this.userProgress[chatId] = {};
    const buttons = this.servers.map(server => ({
      text: `${this.countryFlags[server]} ${server}`,
      callback_data: `server_${server}`
    }));

    const { message_id } = await this.sendInlineButtons(chatId, 'Pilih server:', buttons);
    this.currentMessageId = message_id;
  }

  async handleConvertCommand(chatId) {
    await this.sendMessage(chatId, 'Kirimkan link konfigurasi V2Ray (VMess, VLESS, Trojan, Shadowsocks) dan saya akan mengubahnya ke format Clash, Nekobox, dan Singbox.\n\nContoh:\nvless://...\nvmess://...\ntrojan://...\nss://...');
  }

  async handleProxyCheck(chatId, ip, port) {
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
`);
    } else {
      await this.sendMessage(chatId, `❌ Proxy tidak aktif: ${proxyStatus.message}`);
    }
  }

  async handleLinkConversion(chatId, messageText) {
    try {
      const links = messageText.split('\n').filter(line => line.trim().includes('://'));
      
      if (links.length === 0) {
        await this.sendMessage(chatId, 'Tidak ada link valid yang ditemukan. Kirimkan link VMess, VLESS, Trojan, atau Shadowsocks.');
        return;
      }

      if (links.length > 10) {
        await this.sendMessage(chatId, 'Maksimal 10 link per permintaan.');
        return;
      }

      await this.sendMessage(chatId, '⏳ Sedang memproses konversi...');
      
      const clashConfig = generateClashConfig(links, true);
      const nekoboxConfig = generateNekoboxConfig(links, true);
      const singboxConfig = generateSingboxConfig(links, true);

      await this.sendDocument(chatId, clashConfig, 'clash.yaml', 'text/yaml');
      await this.sendDocument(chatId, nekoboxConfig, 'nekobox.json', 'application/json');
      await this.sendDocument(chatId, singboxConfig, 'singbox.bpf', 'application/json');

    } catch (error) {
      console.error('Error processing links:', error);
      await this.sendMessage(chatId, `Error: ${error.message}`);
    }
  }

  async handleCallbackQuery(chatId, data) {
    try {
        console.log(`[DEBUG] Handling callback for chat ${chatId}:`, data);
        
        // Initialize user progress if not exists
        if (!this.userProgress[chatId]) {
            this.userProgress[chatId] = {};
        }

        if (data.startsWith('server_')) {
            const server = data.split('_')[1];
            this.userProgress[chatId] = { server };
            
            await this.deleteMessage(chatId, this.currentMessageId);
            
            const searchingMsg = await this.sendMessage(chatId, `🔍 Mencari proxy untuk ${this.countryFlags[server]} ${server}...`);
            
            const ipPort = await this.fetchProxyList(server, chatId);
            console.log(`[DEBUG] Found proxy:`, ipPort);
            
            if (!ipPort.includes(':')) {
                await this.editMessage(chatId, searchingMsg, ipPort);
                return;
            }

            // PROPERLY SAVE THE IP:PORT
            this.userProgress[chatId] = {
                ...this.userProgress[chatId],
                ipPort: ipPort,
                step: 'proxy_found'
            };
            
            await this.deleteMessage(chatId, searchingMsg);
            
            const { message_id } = await this.sendInlineButtons(chatId, 
                `✅ Proxy ditemukan: ${ipPort}\nPilih tipe domain:`,
                [
                    { text: "🌐 Wildcard", callback_data: "wildcard" },
                    { text: "🚫 No Wildcard", callback_data: "nowildcard" }
                ]
            );
            this.currentMessageId = message_id;

        } else if (data === 'wildcard' || data === 'nowildcard') {
            console.log(`[DEBUG] Wildcard selection:`, data);
            console.log(`[DEBUG] Current progress:`, this.userProgress[chatId]);
            
            // STRICT VALIDATION
            if (!this.userProgress[chatId]?.ipPort) {
                console.error('[ERROR] Missing ipPort in:', this.userProgress[chatId]);
                throw new Error('Konfigurasi proxy hilang. Silakan mulai ulang dengan /create');
            }

            this.userProgress[chatId].wildcard = data === 'wildcard' ? 'Wildcard' : 'No Wildcard';
            
            await this.deleteMessage(chatId, this.currentMessageId);

            if (data === 'wildcard') {
                const domainButtons = this.wildcardDomains.map(domain => ({
                    text: domain,
                    callback_data: `domain_${domain.replace(/\./g, '_')}`
                }));
                
                const { message_id } = await this.sendInlineButtons(
                    chatId,
                    'Pilih domain wildcard:',
                    domainButtons
                );
                this.currentMessageId = message_id;
            } else {
                this.userProgress[chatId].domain = 'vpn.stupidworld.web.id';
                await this.generateAndSendLinks(chatId);
            }

        } else if (data.startsWith('domain_')) {
            const selectedDomain = data.split('_')[1].replace(/_/g, '.');
            this.userProgress[chatId].domain = selectedDomain;
            
            await this.deleteMessage(chatId, this.currentMessageId);
            await this.generateAndSendLinks(chatId);
        }
    } catch (error) {
        console.error('[ERROR] Callback failed:', error);
        await this.sendMessage(chatId, `⚠️ Error: ${error.message}\nSilakan gunakan /create untuk memulai ulang.`);
        delete this.userProgress[chatId];
    }
}

async generateAndSendLinks(chatId) {
    try {
        const config = this.userProgress[chatId];
        console.log('[DEBUG] Generating links with config:', config);
        
        // STRICT VALIDATION
        const required = ['server', 'ipPort', 'wildcard'];
        const missing = required.filter(field => !config[field]);
        
        if (missing.length > 0) {
            throw new Error(`Data tidak lengkap: ${missing.join(', ')}`);
        }

        if (config.wildcard === 'Wildcard' && !config.domain) {
            throw new Error('Domain belum dipilih');
        }

        const links = this.generateAllLinks(config);
        await this.sendMessage(chatId, this.formatLinkMessage(links));
        
        // Clean up
        delete this.userProgress[chatId];
    } catch (error) {
        console.error('[ERROR] Generate links failed:', error);
        await this.sendMessage(chatId, `⚠️ Gagal membuat konfigurasi: ${error.message}\nSilakan coba /create lagi.`);
        throw error;
    }
}

  generateAllLinks(config) {
    if (!config || !config.server || !config.ipPort || !config.wildcard) {
      throw new Error('Invalid configuration for generating links');
    }

    const { server, ipPort, wildcard, domain } = config;
    const [ip, port] = ipPort.split(':');

    const uuid = this.passuid;
    const method = 'aes-128-gcm';
    const password = uuid;

    const mainDomain = wildcard === 'Wildcard' ? domain : 'vpn.stupidworld.web.id';
    const fullDomain = wildcard === 'Wildcard' ? `${domain}.vpn.stupidworld.web.id` : 'vpn.stupidworld.web.id';

    return {
      vlessTls: `vless://${uuid}@${mainDomain}:443?host=${fullDomain}&path=%2FStupid-World%2F${ip}-${port}&security=tls&sni=${fullDomain}&type=ws#${server}`,
      vlessNtls: `vless://${uuid}@${mainDomain}:80?flow=&host=${fullDomain}&path=%2FStupid-World%2F${ip}-${port}&type=ws#${server}`,
      trojanTls: `trojan://${uuid}@${mainDomain}:443?host=${fullDomain}&path=%2FStupid-World%2F${ip}-${port}&security=tls&sni=${fullDomain}&type=ws#${server}`,
      trojanNtls: `trojan://${uuid}@${mainDomain}:80?host=${fullDomain}&path=%2FStupid-World%2F${ip}-${port}&type=ws#${server}`,
      vmessTls: `vmess://` + btoa(JSON.stringify({
        v: "2",
        ps: server,
        add: mainDomain,
        port: "443",
        id: uuid,
        aid: "0",
        net: "ws",
        type: "none",
        host: fullDomain,
        path: `/Stupid-World/${ip}-${port}`,
        tls: "tls",
        sni: fullDomain,
        scy: "auto"
      })),
      vmessNtls: `vmess://` + btoa(JSON.stringify({
        v: "2",
        ps: server,
        add: mainDomain,
        port: "80",
        id: uuid,
        aid: "0",
        net: "ws",
        type: "none",
        host: fullDomain,
        path: `/Stupid-World/${ip}-${port}`,
        tls: "",
        scy: "auto"
      })),
      ss: `ss://${btoa(`${method}:${password}`)}@${mainDomain}:443?encryption=none&type=ws&host=${fullDomain}&path=%2FStupid-World%2F${ip}-${port}&security=tls&sni=${fullDomain}#${server}`
    };
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

  async sendMessage(chatId, text, parseMode = "Markdown") {
    const url = `${this.apiUrl}/bot${this.token}/sendMessage`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text, 
          parse_mode: parseMode 
        }),
      });
      const data = await response.json();
      if (data.ok) return data.result.message_id;
      return null;
    } catch (error) {
      console.error("Error sending message:", error);
      return null;
    }
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

  async sendInlineButtons(chatId, text, buttons) {
    const chunkSize = 4;
    const keyboard = [];
    
    for (let i = 0; i < buttons.length; i += chunkSize) {
      keyboard.push(buttons.slice(i, i + chunkSize));
    }

    const url = `${this.apiUrl}/bot${this.token}/sendMessage`;
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text, 
          reply_markup: { inline_keyboard: keyboard },
          parse_mode: "Markdown"
        }),
      });
      
      const data = await response.json();
      if (data.ok) {
        return data.result;
      }
      return null;
    } catch (error) {
      console.error("Error sending buttons:", error);
      return null;
    }
  }

  async deleteMessage(chatId, messageId) {
    const url = `${this.apiUrl}/bot${this.token}/deleteMessage?chat_id=${chatId}&message_id=${messageId}`;
    try {
      await fetch(url);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  }

  async sendDocument(chatId, content, filename, mimeType) {
    const formData = new FormData();
    const blob = new Blob([content], { type: mimeType });
    formData.append('document', blob, filename);
    formData.append('chat_id', chatId.toString());

    try {
      const response = await fetch(
        `${this.apiUrl}/bot${this.token}/sendDocument`, {
          method: 'POST',
          body: formData
        }
      );
      return response.json();
    } catch (error) {
      console.error('Error sending document:', error);
      return null;
    }
  }
}

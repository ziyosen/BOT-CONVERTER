import { generateClashConfig, generateNekoboxConfig, generateSingboxConfig } from './configGenerators.js';

export default class TelegramBot {
  constructor(telegramToken, cloudflareToken, apiUrl = 'https://api.telegram.org') {
    this.telegramToken = telegramToken;
    this.apiUrl = apiUrl;
    this.cfChecker = new CloudflareChecker(cloudflareToken);
  }

  async handleUpdate(update) {
    if (!update.message) return new Response('OK', { status: 200 });

    const chatId = update.message.chat.id;
    const text = update.message.text || '';

    if (text.startsWith('/start')) {
      await this.sendMessage(chatId, '🤖 Stupid World Converter Bot\n\nKirimkan saya link konfigurasi V2Ray dan saya akan mengubahnya ke format Singbox, Nekobox dan Clash.\n\nContoh:\nvless://...\nvmess://...\ntrojan://...\nss://...\n\nCatatan:\n- Maksimal 10 link per permintaan.\n- Disarankan menggunakan Singbox versi 1.10.3 atau 1.11.8 untuk hasil terbaik.\n\nBaca baik-baik dulu sebelum nanya.');
    } else if (text.includes('://')) {
      try {
        const links = text.split('\n').filter(line => line.trim().includes('://'));

        if (links.length === 0) {
          await this.sendMessage(chatId, 'No valid links found. Please send VMess, VLESS, Trojan, or Shadowsocks links.');
          return new Response('OK', { status: 200 });
        }

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
    } else {
      await this.sendMessage(chatId, 'Please send VMess, VLESS, Trojan, or Shadowsocks links for conversion.');
    }

    return new Response('OK', { status: 200 });
  }

  async sendMessage(chatId, text) {
    const url = `${this.apiUrl}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    });
    return response.json();
  }

  async sendDocument(chatId, content, filename, mimeType) {
    const formData = new FormData();
    const blob = new Blob([content], { type: mimeType });
    formData.append('document', blob, filename);
    formData.append('chat_id', chatId.toString());

    const response = await fetch(`${this.apiUrl}/sendDocument`, {
      method: 'POST',
      body: formData
    });

    return response.json();
  }
}

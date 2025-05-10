import { generateClashConfig, generateNekoboxConfig, generateSingboxConfig } from './configGenerators.js';

export default class TelegramBot {
  constructor(token, apiUrl = 'https://api.telegram.org') {
    this.token = token;
    this.apiUrl = apiUrl;
  }

  async handleUpdate(update) {
    if (!update.message) return new Response('OK', { status: 200 });

    const chatId = update.message.chat.id;
    const text = update.message.text || '';

    if (text.startsWith('/start')) {
      await this.sendMessage(chatId, 'Welcome to V2Ray Config Bot! Send me your V2Ray links (VMess, VLESS, Trojan, Shadowsocks) and I will convert them to Clash, Nekobox, and Singbox configurations.');
    } else if (text.includes('://')) {
      try {
        const links = text.split('\n').filter(line => line.trim().includes('://'));

        if (links.length === 0) {
          await this.sendMessage(chatId, 'No valid links found. Please send VMess, VLESS, Trojan, or Shadowsocks links.');
          return new Response('OK', { status: 200 });
        }

        // Process each link batch
        const batchSize = 10; // Maximum number of links to process at once
        for (let i = 0; i < links.length; i += batchSize) {
          const linkBatch = links.slice(i, i + batchSize);

          // Generate configurations for the batch of links
          const clashConfig = generateClashConfig(linkBatch, true);
          const nekoboxConfig = generateNekoboxConfig(linkBatch, true);
          const singboxConfig = generateSingboxConfig(linkBatch, true);

          // Send files for each batch
          await this.sendDocument(chatId, clashConfig, `config-${i / batchSize + 1}.yaml`, 'text/yaml');
          await this.sendDocument(chatId, nekoboxConfig, `config-${i / batchSize + 1}.json`, 'application/json');
          await this.sendDocument(chatId, singboxConfig, `config-${i / batchSize + 1}.bpf`, 'application/json');
        }
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
    const url = `${this.apiUrl}/bot${this.token}/sendMessage`;
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

    const response = await fetch(
      `${this.apiUrl}/bot${this.token}/sendDocument`, {
        method: 'POST',
        body: formData
      }
    );

    return response.json();
  }
}

const { generateClashConfig, generateNekoboxConfig, generateSingboxConfig } = require('./configGenerators');

class TelegramBot {
  constructor(token, apiUrl = 'https://api.telegram.org') {
    this.token = token;
    this.apiUrl = apiUrl;
  }

  async handleUpdate(update) {
    if (!update.message) return;

    const chatId = update.message.chat.id;
    const text = update.message.text || '';

    if (text.startsWith('/start')) {
      await this.sendMessage(chatId, 'Welcome to V2Ray Config Bot! Send me your V2Ray links (VMess, VLESS, Trojan, Shadowsocks) and I will convert them to Clash, Nekobox, and Singbox configurations.');
    } else if (text.includes('://')) {
      try {
        const links = text.split('\n').filter(line => line.trim().includes('://'));
        
        if (links.length === 0) {
          await this.sendMessage(chatId, 'No valid links found. Please send VMess, VLESS, Trojan, or Shadowsocks links.');
          return;
        }

        // Generate configurations
        const clashConfig = generateClashConfig(links, true);
        const nekoboxConfig = generateNekoboxConfig(links, true);
        const singboxConfig = generateSingboxConfig(links, true);

        // Send files
        await this.sendDocument(chatId, clashConfig, 'config.yaml', 'text/yaml');
        await this.sendDocument(chatId, nekoboxConfig, 'config.json', 'application/json');
        await this.sendDocument(chatId, singboxConfig, 'config.bpf', 'application/json');

      } catch (error) {
        console.error('Error processing links:', error);
        await this.sendMessage(chatId, `Error: ${error.message}`);
      }
    } else {
      await this.sendMessage(chatId, 'Please send VMess, VLESS, Trojan, or Shadowsocks links for conversion.');
    }
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
    // For Cloudflare Workers, we need to create a downloadable URL
    // This is a simplified approach - in a real worker you might use R2 or another storage solution
    
    // Create a blob URL (this is a simplified approach for the example)
    // In a real worker, you'd need to implement proper file handling
    const blob = new Blob([content], { type: mimeType });
    const fileUrl = URL.createObjectURL(blob);
    
    const url = `${this.apiUrl}/bot${this.token}/sendDocument`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        document: fileUrl,
        filename: filename
      })
    });
    
    // Clean up
    URL.revokeObjectURL(fileUrl);
    
    return response.json();
  }
}

module.exports = TelegramBot;

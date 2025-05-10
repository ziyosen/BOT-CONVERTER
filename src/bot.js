import { generateClashConfig, generateNekoboxConfig, generateSingboxConfig } from './configGenerators.js';

export default class TelegramBot {
  // ... (constructor tetap sama)

  async handleUpdate(update) {
    if (!update.message) return new Response('OK', { status: 200 });

    const chatId = update.message.chat.id;
    const text = update.message.text || '';

    if (text.startsWith('/start')) {
      await this.sendMessage(chatId, 
        `🤖 *V2Ray Config Converter Bot*\n\n` +
        `Kirim beberapa link sekaligus (VMess/VLESS/Trojan/Shadowsocks), ` +
        `saya akan gabungkan menjadi 1 file config untuk:\n` +
        `- Clash (YAML)\n- Nekobox (JSON)\n- Singbox (BPF)\n\n` +
        `Contoh:\n\`\`\`\nvmess://...\nvless://...\ntrojan://...\n\`\`\``,
        { parse_mode: 'Markdown' }
      );
    } else if (text.includes('://')) {
      try {
        const links = text.split('\n')
          .map(line => line.trim())
          .filter(line => line.startsWith('vmess://') || 
                         line.startsWith('vless://') || 
                         line.startsWith('trojan://') || 
                         line.startsWith('ss://'));

        if (links.length === 0) {
          await this.sendMessage(chatId, '❌ Tidak menemukan link yang valid. Pastikan format link benar.');
          return new Response('OK', { status: 200 });
        }

        // Tampilkan pesan sedang memproses
        await this.sendMessage(chatId, `🔄 Memproses ${links.length} link...`);

        // Generate configs
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const clashConfig = generateClashConfig(links, true);
        const nekoboxConfig = generateNekoboxConfig(links, true);
        const singboxConfig = generateSingboxConfig(links, true);

        // Kirim file
        await this.sendDocument(chatId, clashConfig, `clash-config-${timestamp}.yaml`, 'text/yaml');
        await this.sendDocument(chatId, nekoboxConfig, `nekobox-config-${timestamp}.json`, 'application/json');
        await this.sendDocument(chatId, singboxConfig, `singbox-config-${timestamp}.bpf`, 'application/json');

        await this.sendMessage(chatId, `✅ Berhasil generate config dari ${links.length} link!`);

      } catch (error) {
        console.error('Error:', error);
        await this.sendMessage(chatId, `❌ Gagal memproses: ${error.message}`);
      }
    } else {
      await this.sendMessage(chatId, 
        'Kirim beberapa link config (VMess/VLESS/Trojan/Shadowsocks) dalam 1 pesan, contoh:\n\n' +
        'vmess://...\n' +
        'vless://...\n' +
        'trojan://...'
      );
    }

    return new Response('OK', { status: 200 });
  }

  // ... (method lainnya tetap sama)
}

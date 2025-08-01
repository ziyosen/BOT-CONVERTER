// worker.js
import TelegramBot from './bot.js';

const TELEGRAM_BOT_TOKEN = '7791564952:AAHXcZF0NFk512tuUNs7iEzJ12DZpLyOpo4';
const CLOUDFLARE_API_TOKEN = 'pkgstGhD7W06e8G6LO4rW_TJWpjyuboRkdiNgZRD';

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, CLOUDFLARE_API_TOKEN);

// Untuk Cloudflare Workers atau Fetch-based server
export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Gunakan metode POST', { status: 405 });
    }

    try {
      const update = await request.json();
      await bot.handleUpdate(update);
      return new Response('OK', { status: 200 });
    } catch (err) {
      return new Response('Terjadi kesalahan: ' + err.message, { status: 500 });
    }
  }
};

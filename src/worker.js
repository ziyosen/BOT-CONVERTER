import TelegramBot from './bot.js';

export default {
  async fetch(request, env) {
    if (request.method === 'POST') {
      try {
        const update = await request.json();
        const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN);
        return await bot.handleUpdate(update);  // Tambahkan await di sini
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    return new Response('Method not allowed', { status: 405 });
  }
};

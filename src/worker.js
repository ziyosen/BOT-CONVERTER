import TelegramBot from './bot.js';

export default {
  async fetch(request, env, ctx) {
    // Hanya terima POST request
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN);
      const update = await request.json();
      return bot.handleUpdate(update);
      
    } catch (error) {
      console.error('Error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};

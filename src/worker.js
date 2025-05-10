const TelegramBot = require('./bot');

// Initialize the bot with your Telegram token
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

async function handleRequest(request) {
  if (request.method === 'POST') {
    try {
      const update = await request.json();
      await bot.handleUpdate(update);
      return new Response('OK', { status: 200 });
    } catch (error) {
      console.error('Error handling request:', error);
      return new Response('Error processing request', { status: 500 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

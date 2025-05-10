import TelegramBot from './bot.js';

export default {
  async fetch(request, env) {
    const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN);
    return bot.handleRequest(request);
  }
}

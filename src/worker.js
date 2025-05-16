import { handleUserMessage, handleCallbackQuery, sendMessage, editMessage, sendInlineButtons, deleteMessage } from './bot.js';
import { checkProxyStatus, fetchProxyList } from './linkParser.js';
import { generateAllLinks, formatLinkMessage, passuid } from './configGenerators.js';

console.log('Generated passuid:', passuid);

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const { pathname } = url;

  // Handle POST requests for the first bot (Webhook handling)
  if (request.method === 'POST') {
    try {
      const update = await request.json();
      if (pathname === '/webhook') {
        const { message, callback_query } = update;

        if (message) {
          const chatId = message.chat.id;
          const messageText = message.text;
          await handleUserMessage(chatId, messageText);
        } else if (callback_query) {
          const chatId = callback_query.message.chat.id;
          const data = callback_query.data;
          await handleCallbackQuery(chatId, data);
        }
        return new Response('OK');
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Handle other routes like '/checkProxyStatus' or others
  if (pathname === '/checkProxyStatus') {
    try {
      const proxyList = await fetchProxyList();
      const status = await checkProxyStatus(proxyList);
      return new Response(JSON.stringify(status), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  // Default fallback
  return new Response('Not Found', { status: 404 });
}

// Cloudflare Worker fetch event listener
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

// Export necessary functions for use in other modules
export { sendMessage, editMessage, sendInlineButtons, deleteMessage } from './bot.js';
export { checkProxyStatus, fetchProxyList } from './linkParser.js';
export { generateAllLinks, formatLinkMessage } from './configGenerators.js';

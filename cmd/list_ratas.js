const fs = require('fs');
const path = require('path');

module.exports = function(bot, db, config, client) {
  const ITEMS_PER_PAGE = 10;

  bot.onText(/^[./]ratas(?:@\w+)?(?:\s+(\d+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const page = match[1] ? parseInt(match[1]) : 1;
    await sendRatasPage(chatId, page, msg.message_id);
  });

  
  bot.on('callback_query', async (query) => {
    const data = query.data;
    if (data.startsWith('ratas_page_')) {
      const page = parseInt(data.split('_')[2]);
      const chatId = query.message.chat.id;
      const messageId = query.message.message_id;

      await editRatasPage(chatId, page, messageId);
      bot.answerCallbackQuery(query.id);
    }
  });

  async function getRatasData() {
    const ratasPath = path.join(__dirname, '..', 'database', 'json', 'ratas.json');
    if (!fs.existsSync(ratasPath)) return [];
    try {
      return JSON.parse(fs.readFileSync(ratasPath, 'utf8'));
    } catch (e) {
      return [];
    }
  }

  function generateRatasMessage(ratasData, page) {
    const totalPages = Math.ceil(ratasData.length / ITEMS_PER_PAGE);
    const start = (page - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const paginatedItems = ratasData.slice(start, end);

    let message = "<b>⚠️ ESTAFADORES REPORTADOS ⚠️</b>\n\n";

    if (ratasData.length === 0) {
      return "<b>[!]</b> No hay estafadores reportados aún.";
    }

    paginatedItems.forEach((rata, index) => {
      const globalIndex = start + index + 1;
      const usernameTag = rata.username ? `@${rata.username.replace('@', '')}` : 'No tiene';
      const nameLink = `<a href="tg://user?id=${rata.id}">${rata.name || 'Usuario'}</a>`;
      
      message += `${globalIndex}. <b>${nameLink}</b>\n`;
      message += `├─ <b>ID:</b> <code>${rata.id}</code>\n`;
      message += `├─ <b>USER:</b> ${usernameTag}\n`;
      message += `└─ <b>MOTIVO:</b> <code>${rata.reason}</code>\n\n`;
    });

    message += `<i>Página ${page} de ${totalPages} (Total: ${ratasData.length})</i>`;
    return message;
  }

  function generatePaginationButtons(ratasData, page) {
    const totalPages = Math.ceil(ratasData.length / ITEMS_PER_PAGE);
    const buttons = [];

    if (totalPages > 1) {
      const row = [];
      if (page > 1) {
        row.push({ text: '<', callback_data: `ratas_page_${page - 1}` });
      }
      if (page < totalPages) {
        row.push({ text: '>', callback_data: `ratas_page_${page + 1}` });
      }
      buttons.push(row);
    }
    return { inline_keyboard: buttons };
  }

  async function sendRatasPage(chatId, page, replyToId) {
    const ratasData = await getRatasData();
    const message = generateRatasMessage(ratasData, page);
    const buttons = generatePaginationButtons(ratasData, page);

    bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_to_message_id: replyToId,
      reply_markup: buttons
    });
  }

  async function editRatasPage(chatId, page, messageId) {
    const ratasData = await getRatasData();
    const message = generateRatasMessage(ratasData, page);
    const buttons = generatePaginationButtons(ratasData, page);

    try {
      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: buttons
      });
    } catch (e) {
      
    }
  }
};

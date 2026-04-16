module.exports = function(bot, db, config, client) {
  bot.onText(/^[./]unban(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    
    if (msg.chat.type === 'private') return;

    
    const configAdmins = config.admins || [];
    const configAdmins2 = config.admins2 || [];
    const isOwner = configAdmins.includes(userId) || configAdmins2.includes(userId) || 
                   configAdmins.includes(userId.toString()) || configAdmins2.includes(userId.toString());

    let canUnban = isOwner;

    if (!canUnban) {
      try {
        const member = await bot.getChatMember(chatId, userId);
        if (member.status === 'creator' || member.status === 'administrator') {
          canUnban = true;
        }
      } catch (e) {
        console.error("Error verificando permisos:", e.message);
      }
    }

    if (!canUnban) return; 

    
    let targetUserId = null;
    let targetUsername = null;

    if (msg.reply_to_message) {
      targetUserId = msg.reply_to_message.from.id;
      targetUsername = msg.reply_to_message.from.username ? `@${msg.reply_to_message.from.username}` : msg.reply_to_message.from.first_name;
    } else if (match && match[1]) {
      const query = match[1].trim();
      try {
        
        const entity = await client.getEntity(query.replace('@', ''));
        targetUserId = entity.id.toString();
        targetUsername = query;
      } catch (e) {
        
        if (/^\d+$/.test(query)) {
          targetUserId = query;
          targetUsername = `ID: ${query}`;
        } else {
          return bot.sendMessage(chatId, "[!] No pude encontrar a ese usuario. Asegúrate de que el username sea correcto o usa el ID.", { reply_to_message_id: msg.message_id });
        }
      }
    }

    if (!targetUserId) {
      return bot.sendMessage(chatId, "[!] Responde a un mensaje o usa <code>/unban @username/ID</code>", { 
        parse_mode: 'HTML',
        reply_to_message_id: msg.message_id 
      });
    }

    
    try {
      
      await bot.unbanChatMember(chatId, targetUserId, { only_if_banned: true });
      
      bot.sendMessage(chatId, `✅ <b>¡USUARIO DESBANEADO!</b>\n\n<b>Usuario:</b> ${targetUsername}\n<b>Por orden de:</b> <a href="tg://user?id=${userId}">${msg.from.first_name}</a>`, {
        parse_mode: 'HTML',
        reply_to_message_id: msg.message_id
      });
    } catch (err) {
      bot.sendMessage(chatId, `[!] Error al desbanear: ${err.message}`, { reply_to_message_id: msg.message_id });
    }
  });
};

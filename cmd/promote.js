module.exports = function(bot, db, config, client) {
  
  bot.onText(/^[./]promote(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const fromId = msg.from.id;

    
    if (!config.admins.includes(fromId)) return;

    
    if (!config.mainGroupId) {
      return bot.sendMessage(chatId, '<b>[!] Error:</b> No hay un ID', { parse_mode: 'HTML' });
    }

    const query = match[1] ? match[1].trim() : null;
    let targetId = null;
    let targetName = '';

    
    const groupIds = Array.isArray(config.mainGroupId) ? config.mainGroupId : [config.mainGroupId];

    try {
      
      if (msg.reply_to_message && msg.reply_to_message.from) {
        targetId = msg.reply_to_message.from.id;
        targetName = msg.reply_to_message.from.first_name;
      } else if (query) {
        try {
          
          const entity = await client.getEntity(query.replace(/\s+/g, ''));
          targetId = entity.id.toString();
          targetName = entity.firstName || 'Usuario';
        } catch (e) {
        
          const data = db.read();
          const cleanLook = query.replace('@', '').toLowerCase();
          const found = data.users.find(u => String(u.id) === query || (u.username && u.username.toLowerCase() === cleanLook));
          if (found) {
            targetId = found.id;
            targetName = found.first_name;
          }
        }
      }

      if (!targetId) {
        return bot.sendMessage(chatId, '<b>[!] Error:</b> No se encontró al usuario para promover.', { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
      }

      
      const results = [];
      for (const gid of groupIds) {
        try {
          await bot.promoteChatMember(gid, targetId, {
            can_change_info: true,
            can_post_messages: true,
            can_edit_messages: true,
            can_delete_messages: true,
            can_invite_users: true,
            can_restrict_members: true,
            can_pin_messages: true,
            can_promote_members: false,
            can_manage_chat: true,
            can_manage_video_chats: true
          });
          results.push(`✅ Grupo <code>${gid}</code>: Éxito`);
        } catch (e) {
          results.push(`❌ Grupo <code>${gid}</code>: ${e.description || e.message}`);
        }
      }

      const successMsg = `<b>[⚡]</b> <a href="tg://user?id=${targetId}">${targetName}</a> ahora es admin oficial del grupo`.trim();

      await bot.sendMessage(chatId, successMsg, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });

    } catch (err) {
      console.error('Error en /promote:', err);
      
      let errorMsg = '<b>[!] Error al promover:</b> ';
      if (err.description && err.description.includes('not enough rights')) {
        errorMsg += 'El bot no tiene permisos suficientes en el grupo.';
      } else if (err.description && err.description.includes('user not found')) {
        errorMsg += 'El usuario no está en el grupo.';
      } else {
        errorMsg += err.message || 'Error desconocido.';
      }
      
      bot.sendMessage(chatId, errorMsg, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
    }
  });
};

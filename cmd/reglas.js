const fs = require('fs');
const path = require('path');

module.exports = function(bot, db, config, client) {
  const rulesPath = path.join(__dirname, '..', 'database', 'json', 'rules.json');

  
  if (!fs.existsSync(rulesPath)) {
    fs.writeFileSync(rulesPath, JSON.stringify({ rules: null }, null, 2));
  }

  
  bot.onText(/^[./](rules|reglas)(?:@\w+)?$/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
      const data = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      
      if (!data.rules) {
        return bot.sendMessage(chatId, "<b>[!]</b> Todavía no se han configurado las reglas.", { parse_mode: 'HTML' });
      }

      const { text, file_id, type } = data.rules;

      if (type === 'photo' && file_id) {
        await bot.sendPhoto(chatId, file_id, { 
          caption: text, 
          parse_mode: 'HTML',
          reply_to_message_id: msg.message_id 
        });
      } else {
        await bot.sendMessage(chatId, text, { 
          parse_mode: 'HTML',
          reply_to_message_id: msg.message_id 
        });
      }
    } catch (err) {
      console.error("Error al mostrar reglas:", err);
      bot.sendMessage(chatId, "[!] Error al mostrar las reglas.");
    }
  });

  
  bot.onText(/^[./]adrules?$/, async (msg) => {
    const chatId = msg.chat.id;
    const fromId = msg.from.id;

    
    const isOwner1 = config.admins.includes(fromId);
    const isOwner2 = config.admins2 && config.admins2.includes(fromId);
    
    
    const rolesPath = path.join(__dirname, '..', 'database', 'json', 'roles.json');
    let isAdmin = false;
    if (fs.existsSync(rolesPath)) {
      const rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
      isAdmin = rolesData.some(r => String(r.id) === String(fromId) && r.role === 'admin');
    }

    if (!isOwner1 && !isOwner2 && !isAdmin) return;

    if (!msg.reply_to_message) {
      return bot.sendMessage(chatId, "<b>[!] Error:</b> Debes responder a un mensaje (texto o imagen con texto) para establecerlo como reglas.", { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
    }

    const reply = msg.reply_to_message;
    let newRules = {
      text: reply.text || reply.caption || "",
      file_id: null,
      type: 'text'
    };

    if (reply.photo) {
      
      newRules.file_id = reply.photo[reply.photo.length - 1].file_id;
      newRules.type = 'photo';
    }

    if (!newRules.text && !newRules.file_id) {
      return bot.sendMessage(chatId, "<b>[!] Error:</b> El mensaje debe contener texto o una imagen.", { parse_mode: 'HTML' });
    }

    try {
      fs.writeFileSync(rulesPath, JSON.stringify({ rules: newRules }, null, 2));
      bot.sendMessage(chatId, "<b>✅ REGLAS ACTUALIZADAS</b>\n\nLas reglas han sido guardadas\nusar /reglas para ver.", { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
    } catch (err) {
      console.error("Error al guardar reglas:", err);
      bot.sendMessage(chatId, "[!] Error al guardar las reglas.");
    }
  });
};

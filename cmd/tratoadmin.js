const fs = require('fs');
const path = require('path');

module.exports = function(bot, db, config, client) {
  bot.onText(/^[./]tratoadmin$/, async (msg) => {
    const chatId = msg.chat.id;
    const rolesPath = path.join(__dirname, '..', 'database', 'json', 'roles.json');

    if (!fs.existsSync(rolesPath)) {
      return bot.sendMessage(chatId, "<b>[⚙️]</b> No hay administradores disponibles en este momento.", { parse_mode: 'HTML' });
    }

    try {
      const rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
      
      const admins = rolesData.filter(u => u.role === 'admin');

      if (admins.length === 0) {
        return bot.sendMessage(chatId, "<b>[⚙️]</b> No hay administradores registrados para atender tratos.", { parse_mode: 'HTML' });
      }

      
      const loadingMsg = await bot.sendMessage(chatId, "<b>[!] Buscando admins disponible...</b>\n<code>[□□□□□□□□□□] 0%</code>", { 
        parse_mode: 'HTML',
        reply_to_message_id: msg.message_id 
      });

      
      setTimeout(async () => {
        await bot.editMessageText("<b>[!] Buscando admins disponible...</b>\n<code>[■■■■■□□□□□] 50%</code>", {
          chat_id: chatId,
          message_id: loadingMsg.message_id,
          parse_mode: 'HTML'
        });

        setTimeout(async () => {
          
          const randomAdmin = admins[Math.floor(Math.random() * admins.length)];
          const adminId = randomAdmin.id;
          const adminName = randomAdmin.name || "Administrador";
          const adminUser = randomAdmin.username ? `@${randomAdmin.username.replace('@', '')}` : "No tiene";

          const successMsg = `
<b>✅ ADMINISTRADOR ASIGNADO</b>

<b>NOMBRE:</b> <a href="tg://user?id=${adminId}">${adminName}</a>
<b>ID:</b> <code>${adminId}</code>
<b>USER:</b> ${adminUser}

<i>Por favor contactar al administrador asignado
para proceder con su trato de forma segura y asi evitar ser estafado.</i>
`.trim();

          const opts = {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: 'IR AL CHAT', url: randomAdmin.username ? `https://t.me/${randomAdmin.username.replace('@', '')}` : `tg://user?id=${adminId}` }
                ]
              ]
            }
          };

          await bot.editMessageText(successMsg, opts);
        }, 1000);
      }, 1000);

    } catch (err) {
      console.error("Error en comando tratoadmin:", err);
      bot.sendMessage(chatId, "");
    }
  });
};

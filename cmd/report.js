const fs = require('fs');
const path = require('path');

module.exports = function(bot, db, config, client) {
  
  bot.onText(/^[./]report(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const fromUser = msg.from;
    const reason = match[1] || 'Sin motivo especificado';

    if (!msg.reply_to_message) {
      return bot.sendMessage(chatId, '<b>[!] Error:</b> Debes responder al mensaje que quieres reportar usando <code>/report [motivo]</code>', { 
        parse_mode: 'HTML', 
        reply_to_message_id: msg.message_id 
      });
    }

    const reportedMsg = msg.reply_to_message;
    const reportedUser = reportedMsg.from;
    const messageLink = msg.chat.username ? `https://t.me/${msg.chat.username}/${reportedMsg.message_id}` : `https://t.me/c/${String(chatId).replace("-100", "")}/${reportedMsg.message_id}`;

    // Obtener destinatarios: owners de config y admins de roles.json
    const recipients = new Set();
    
    // 1. Owners del config.json
    if (config.admins) config.admins.forEach(id => recipients.add(String(id)));
    if (config.admins2) config.admins2.forEach(id => recipients.add(String(id)));

    // 2. Admins del roles.json
    const rolesPath = path.join(__dirname, '..', 'database', 'json', 'roles.json');
    if (fs.existsSync(rolesPath)) {
      try {
        const rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
        const admins = rolesData.filter(r => r.role === 'admin');
        admins.forEach(a => recipients.add(String(a.id)));
      } catch (e) {
        console.error("Error leyendo roles para reporte:", e.message);
      }
    }

    const reportForAdmins = `
<b>[🚨] NUEVO REPORTE DE USUARIO</b>

<b>Reportado por:</b>
• Nombre: ${fromUser.first_name}
• ID: <code>${fromUser.id}</code>
• User: @${fromUser.username || 'N/A'}

<b>Usuario Reportado:</b>
• Nombre: ${reportedUser ? reportedUser.first_name : 'Desconocido'}
• ID: <code>${reportedUser ? reportedUser.id : 'N/A'}</code>
• User: @${reportedUser && reportedUser.username ? reportedUser.username : 'N/A'}

<b>Motivo:</b>
<code>${reason}</code>

<b>Mensaje Reportado:</b>
<i>"${reportedMsg.text || '[Contenido Multimedia]'}"</i>

<b>Enlace al mensaje:</b> <a href="${messageLink}">Ver en el grupo</a>
`.trim();

    
    let sentCount = 0;
    for (const adminId of recipients) {
      try {
        await bot.sendMessage(adminId, reportForAdmins, { parse_mode: 'HTML' });
        
        await bot.forwardMessage(adminId, chatId, reportedMsg.message_id);
        sentCount++;
      } catch (e) {
        
        console.error(`Error enviando reporte a ${adminId}:`, e.message);
      }
    }

    
    if (sentCount > 0) {
      bot.sendMessage(chatId, '<b>✅ Reporte enviado:</b> Los administradores verán el caso.', { 
        parse_mode: 'HTML', 
        reply_to_message_id: msg.message_id 
      });
    } else {
      bot.sendMessage(chatId, '<b>[!] Error:</b> No se pudo entregar el reporte. Los administradores deben haber iniciado el bot por privado.', { 
        parse_mode: 'HTML',
        reply_to_message_id: msg.message_id
      });
    }
  });
};

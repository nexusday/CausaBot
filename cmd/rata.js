const fs = require('fs');
const path = require('path');

module.exports = function(bot, db, config, client) {
  
  bot.onText(/^[./]rata(?:\s+([^\s]+))?(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const fromId = msg.from.id;

    
    const rolesPath = path.join(__dirname, '..', 'database', 'json', 'roles.json');
    let rolesData = [];
    if (fs.existsSync(rolesPath)) {
      rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
    }

    const userRoleObj = rolesData.find(r => String(r.id) === String(fromId));
    const userRole = userRoleObj ? userRoleObj.role : null;

    
    const isOwner1 = config.admins.includes(fromId);
    const isOwner2 = config.admins2 && config.admins2.includes(fromId);
    const hasSpecialRole = ['admin', 'quemador', 'certificado'].includes(userRole);

    if (!isOwner1 && !isOwner2 && !hasSpecialRole) return;

    let query = match[1];
    let reason = match[2];
    let target = null;

    
    if (msg.reply_to_message && msg.reply_to_message.from) {
      target = {
        id: String(msg.reply_to_message.from.id),
        username: msg.reply_to_message.from.username,
        first_name: msg.reply_to_message.from.first_name
      };
      
      reason = query ? (query + (reason ? ' ' + reason : '')) : reason;
    } else if (query) {
      
      try {
        const entity = await client.getEntity(query.replace(/\s+/g, ''));
        target = {
          id: entity.id.toString(),
          username: entity.username,
          first_name: entity.firstName
        };
      } catch (e) {
        const data = db.read();
        const cleanLook = query.replace('@', '').toLowerCase();
        const found = data.users.find(u => String(u.id) === query || (u.username && u.username.toLowerCase() === cleanLook));
        if (found) target = found;
      }
    }

    if (!target) {
      return bot.sendMessage(chatId, '<b>[!] Uso:</b> /rata &lt;ID|@User&gt; &lt;Motivo&gt;\nO responde a un mensaje con /rata &lt;Motivo&gt;', { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
    }

    if (!reason || reason.trim().length < 3) {
      return bot.sendMessage(chatId, '<b>[!] Error:</b> Debes especificar un motivo válido para el reporte.', { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
    }

    try {
      const ratasPath = path.join(__dirname, '..', 'database', 'json', 'ratas.json');
      let ratasData = [];
      if (fs.existsSync(ratasPath)) {
        ratasData = JSON.parse(fs.readFileSync(ratasPath, 'utf8'));
      }

      const targetIdStr = String(target.id);
      const reportIndex = ratasData.findIndex(r => String(r.id) === targetIdStr);

      const reportEntry = {
        id: targetIdStr,
        name: target.first_name || 'Desconocido',
        username: target.username || null,
        reason: reason.trim(),
        reportedBy: fromId,
        date: new Date().toISOString()
      };

      if (reportIndex !== -1) {
        ratasData[reportIndex] = reportEntry;
      } else {
        ratasData.push(reportEntry);
      }

      fs.writeFileSync(ratasPath, JSON.stringify(ratasData, null, 2));

      const successMsg = `
<b>[🚨] USUARIO REPORTADO</b>

<b>ID:</b> <code>${targetIdStr}</code>
<b>User:</b> @${target.username || 'N/A'}
<b>Motivo:</b> <code>${reason.trim()}</code>

<i>El reporte ha sido guardado exitosamente.</i>`.trim();

      await bot.sendMessage(chatId, successMsg, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });

    } catch (err) {
      console.error('Error en /rata:', err);
      bot.sendMessage(chatId, '<b>[!] Error interno al procesar el reporte.</b>', { parse_mode: 'HTML' });
    }
  });

  
  bot.onText(/^\/delrata(?:\s+(.+))?$/, async (msg, match) => {
    const fromId = msg.from.id;
    
    
    const rolesPath = path.join(__dirname, '..', 'database', 'json', 'roles.json');
    let rolesData = [];
    if (fs.existsSync(rolesPath)) {
      rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
    }

    const userRoleObj = rolesData.find(r => String(r.id) === String(fromId));
    const userRole = userRoleObj ? userRoleObj.role : null;

    
    const isOwner1 = config.admins.includes(fromId);
    const isOwner2 = config.admins2 && config.admins2.includes(fromId);
    const hasSpecialRole = ['admin', 'quemador', 'certificado'].includes(userRole);

    if (!isOwner1 && !isOwner2 && !hasSpecialRole) return;

    const chatId = msg.chat.id;
    const query = match[1] ? match[1].trim() : null;
    let targetId = null;

    try {
      if (msg.reply_to_message && msg.reply_to_message.from) {
        targetId = String(msg.reply_to_message.from.id);
      } else if (query) {
        try {
          const entity = await client.getEntity(query.replace(/\s+/g, ''));
          targetId = entity.id.toString();
        } catch (e) {
          
          targetId = query.replace('@', '');
        }
      }

      if (!targetId) {
        return bot.sendMessage(chatId, '<b>[!] Uso:</b> /delrata &lt;ID|@User&gt; o responde a un mensaje.', { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
      }

      const ratasPath = path.join(__dirname, '..', 'database', 'json', 'ratas.json');
      if (fs.existsSync(ratasPath)) {
        let ratasData = JSON.parse(fs.readFileSync(ratasPath, 'utf8'));
        const initialLen = ratasData.length;
        ratasData = ratasData.filter(r => String(r.id) !== String(targetId));

        if (ratasData.length < initialLen) {
          fs.writeFileSync(ratasPath, JSON.stringify(ratasData, null, 2));
          bot.sendMessage(chatId, `✅ El reporte para el ID <code>${targetId}</code> ha sido eliminado.`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
        } else {
          bot.sendMessage(chatId, `❌ No se encontró ningún reporte activo para el ID <code>${targetId}</code>.`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
        }
      }
    } catch (err) {
      console.error('Error en /delrata:', err);
      bot.sendMessage(chatId, '❌ Error al procesar la eliminación del reporte.');
    }
  });
};

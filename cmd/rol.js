const fs = require('fs');
const path = require('path');

module.exports = function(bot, db, config, client) {
  
  
  bot.onText(/^[./]rol(?:\s+(admin|certificado|quemador|owner|owner2|nada))?(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const fromId = msg.from.id;

    
    const isOwner1 = config.admins.includes(fromId);
    const isOwner2 = config.admins2 && config.admins2.includes(fromId);

    if (!isOwner1 && !isOwner2) return;

    
    if (!match[1] && !match[2] && !msg.reply_to_message) {
      const helpMsg = `
<b>[!] USO DEL COMANDO ROL</b>

<b>Ejemplos:</b>
 /rol admin @usuario
 /rol certificado 12345678
 /rol owner (respondiendo a un msj)
 /rol owner2 @usuario
 /rol nada (para quitar el rol)

<b>Rangos:</b>
<code>admin, certificado, quemador, owner, owner2, nada</code>

<i>Sólo Owners nivel 1 pueden asignar Owners.</i>`.trim();
      return bot.sendMessage(chatId, helpMsg, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
    }

    const role = match[1] ? match[1].toLowerCase() : null;
    const query = match[2] ? match[2].trim() : null;

    
    if ((role === 'owner' || role === 'owner2') && !isOwner1) {
      return bot.sendMessage(chatId, '<b>[!] Error:</b> Solo los Owners de nivel 1 pueden asignar rangos de administración.', { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
    }

    let target = null;

    try {
      
      if (msg.reply_to_message && msg.reply_to_message.from) {
        target = {
          id: String(msg.reply_to_message.from.id),
          username: msg.reply_to_message.from.username,
          first_name: msg.reply_to_message.from.first_name
        };
      } else if (query) {
        try {
          const cleanQuery = query.replace(/\s+/g, '');
          const entity = await client.getEntity(cleanQuery);
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
        return bot.sendMessage(chatId, '<b>[!] Error:</b> Usuario no encontrado.', { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
      }

      const targetIdNum = Number(target.id);
      const targetIdStr = String(target.id);

      
      if (isOwner2) {
        const isTargetOwner1 = config.admins.includes(targetIdNum);
        const isTargetOwner2 = config.admins2 && config.admins2.includes(targetIdNum);
        
        if (isTargetOwner1) {
          return bot.sendMessage(chatId, '<b>[!] Error:</b> No puedes modificar el rango de un <b>Owner Principal</b>.', { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
        }
        
        if (role === 'nada' && isTargetOwner2) {
          return bot.sendMessage(chatId, '<b>[!] Error:</b> No puedes quitarle el rango a otro <b>Owner</b>.', { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
        }
      }

      const rolesPath = path.join(__dirname, '..', 'database', 'json', 'roles.json');
      let rolesData = [];
      if (fs.existsSync(rolesPath)) {
        rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
      }

      const configPath = path.join(__dirname, '..', 'config.json');

      const currentRoleObj = rolesData.find(r => String(r.id) === targetIdStr);
      const currentRole = currentRoleObj ? currentRoleObj.role : null;

      if (currentRole === role && role !== 'nada') {
          return bot.sendMessage(chatId, `<b>[!] Aviso:</b> El usuario ya tiene el rango <b>${role.toUpperCase()}</b>.`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
      }

      
      if (role === 'owner') {
        if (!config.admins.includes(targetIdNum)) {
          config.admins.push(targetIdNum);
          
          config.admins2 = config.admins2.filter(id => Number(id) !== targetIdNum);
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        }
      } else if (role === 'owner2') {
        if (!config.admins2.includes(targetIdNum)) {
          config.admins2.push(targetIdNum);
        
          config.admins = config.admins.filter(id => Number(id) !== targetIdNum);
          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        }
      } else if (role === 'nada') {
        config.admins = config.admins.filter(id => Number(id) !== targetIdNum);
        config.admins2 = config.admins2.filter(id => Number(id) !== targetIdNum);
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      }

      const roleIndex = rolesData.findIndex(r => String(r.id) === targetIdStr && r.role === role);
      
      if (role === 'nada') {
        
        rolesData = rolesData.filter(r => String(r.id) !== targetIdStr);
      } else {
        const roleEntry = {
          id: targetIdStr,
          name: target.first_name || 'Desconocido',
          username: target.username || null,
          role: role,
          updatedAt: new Date().toISOString()
        };
        
        
        if (roleIndex === -1) {
          rolesData.push(roleEntry);
        } else {
          rolesData[roleIndex] = roleEntry;
        }
      }

      fs.writeFileSync(rolesPath, JSON.stringify(rolesData, null, 2));

      const statusMsg = role !== 'nada'
        ? `<b>[+] ROL ASIGNADO</b>\n\nID: <code>${targetIdStr}</code>\nUser: @${target.username || 'N/A'}\nRol: <b>${role.toUpperCase()}</b>\n`
        : `<b>[-] ROL ELIMINADO</b>\n\nID: <code>${targetIdStr}</code>\n`;

      await bot.sendMessage(chatId, statusMsg, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });

    } catch (err) {
      console.error('Error en /rol:', err);
      bot.sendMessage(chatId, '<b>[!] Error interno al procesar el rol.</b>', { parse_mode: 'HTML' });
    }
  });
};

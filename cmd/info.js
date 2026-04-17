module.exports = function(bot, db, config, client) {
  bot.onText(/^[./]info(?:\s+(.+))?$/, async (msg, match) => {
    const chatId = msg.chat.id;
    let targetUser = null;

    try {
      
      if (msg.reply_to_message && msg.reply_to_message.from) {
        targetUser = msg.reply_to_message.from;
      } 
      else if (match && match[1]) {
        let query = match[1].trim();
        
        try {
          
          let entity;
          try {
            
            const cleanQuery = query.replace(/\s+/g, '');
            entity = await client.getEntity(cleanQuery);
          } catch (e) {
            
            
            const data = db.read();
            const foundLocally = data.users.find(u => String(u.id) === query || (u.username && u.username.toLowerCase() === query.replace('@','').toLowerCase()));
            
            if (foundLocally && foundLocally.id) {
              
              entity = await client.getEntity(foundLocally.id.toString());
            } else {
              throw e;
            }
          }
          
          targetUser = {
            id: entity.id.toString(),
            username: entity.username,
            first_name: entity.firstName,
            last_name: entity.lastName
          };
        } catch (e) {
          
          const data = db.read();
          const cleanLook = query.replace('@', '').toLowerCase();
          const found = data.users.find(u => 
            (u.username && u.username.toLowerCase() === cleanLook) || 
            String(u.id) === query
          );
          if (found) targetUser = found;
          else return bot.sendMessage(chatId, `[!] No encontrado: <code>${query}</code>`, { parse_mode: 'HTML' });
        }
      } 
      else {
        targetUser = msg.from;
      }

      if (!targetUser) return;

      
      let bio = 'No tiene';
      let photoBuffer = null;

      try {
        const { Api, Helpers } = require("telegram");
        
        
        const peerId = require("big-integer")(targetUser.id);
        
        const fullResult = await client.invoke(new Api.users.GetFullUser({
          id: peerId
        }));
        bio = fullResult.fullUser.about || 'No tiene';
        
        
        photoBuffer = await client.downloadProfilePhoto(peerId);
      } catch (e) {
        console.warn('Fallo al obtener Bio/Foto vía GramJS:', e.message);
        
        
        if (targetUser.username) {
            try {
                const { Api } = require("telegram");
                const fullResult = await client.invoke(new Api.users.GetFullUser({
                    id: targetUser.username
                }));
                bio = fullResult.fullUser.about || bio;
                photoBuffer = photoBuffer || await client.downloadProfilePhoto(targetUser.username);
            } catch (e2) {}
        }
      }

    
      const cleanHTML = (text) => text ? String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

    
      const fs = require('fs');
      const path = require('path');
      const rolesPath = path.join(__dirname, '..', 'database', 'json', 'roles.json');
      let userRoles = [];
      
      
      if (config.admins.includes(Number(targetUser.id)) || config.admins.includes(String(targetUser.id))) {
        userRoles.push('OWNER');
      } 
      
      
      if (config.admins2 && (config.admins2.includes(Number(targetUser.id)) || config.admins2.includes(String(targetUser.id)))) {
        userRoles.push('OWNER 2');
      }

      
      if (fs.existsSync(rolesPath)) {
        const rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
        const userRolesInDb = rolesData.filter(r => String(r.id) === String(targetUser.id));
        userRolesInDb.forEach(r => {
          if (r.role && !userRoles.includes(r.role.toUpperCase())) {
            userRoles.push(r.role.toUpperCase());
          }
        });
      }

      const roleText = userRoles.length > 0 ? userRoles.join(', ') : null;

      
      const ratasPath = path.join(__dirname, '..', 'database', 'json', 'ratas.json');
      let reportStatus = '✅ Este usuario no esta reportado, esta complemante limpio.';
      
      if (fs.existsSync(ratasPath)) {
        const ratasData = JSON.parse(fs.readFileSync(ratasPath, 'utf8'));
        const report = ratasData.find(r => String(r.id) === String(targetUser.id));
        if (report) {
          reportStatus = `🚨 [<b>${report.reason.toUpperCase()}</b>] Este usuario esta reportado como estafador.`;
        }
      }

      const infoMsg = `
[+] INFO DEL PERFIL - ${config.botName}

[ϟ] ID: <code>${targetUser.id}</code>
[ϟ] User: ${targetUser.username ? '@' + cleanHTML(targetUser.username) : 'Oculto'}
[ϟ] Nombre: ${cleanHTML(targetUser.first_name) || '—'}
${targetUser.last_name ? `[ϟ] Apellido: ${cleanHTML(targetUser.last_name)}` : ''}

${roleText ? `Este usuario <code>${targetUser.id}</code>  @${targetUser.username || 'sin user'} tiene rol de <b>${roleText}</b>` : `Este usuario <code>${targetUser.id}</code> no tiene ningún rol asignado`}

${reportStatus}`.trim();

      const options = {
        parse_mode: 'HTML',
        reply_to_message_id: msg.message_id,
        reply_markup: {
          inline_keyboard: [
            [{ 
              text: 'VER PERFIL', 
              url: targetUser.username ? `https://t.me/${targetUser.username}` : `tg://openmessage?user_id=${targetUser.id}` 
            }]
          ]
        }
      };

      if (photoBuffer && photoBuffer.length > 0) {
        await bot.sendPhoto(chatId, photoBuffer, { caption: infoMsg, ...options });
      } else {
        await bot.sendMessage(chatId, infoMsg, options);
      }

    } catch (err) {
      console.error('Error en /info:', err);
      bot.sendMessage(chatId, '❌ Error al procesar el comando.');
    }
  });
};

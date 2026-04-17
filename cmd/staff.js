const fs = require('fs');
const path = require('path');

module.exports = function(bot, db, config, client) {
  bot.onText(/^[./]staff(?:@\w+)?$/, async (msg) => {
    const chatId = msg.chat.id;
    const rolesPath = path.join(__dirname, '..', 'database', 'json', 'roles.json');

    if (!fs.existsSync(rolesPath)) {
      return bot.sendMessage(chatId, "<b>[⚙️]</b> No hay staff registrado aún.", { parse_mode: 'HTML' });
    }

    try {
      const staff = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));

      
      const configAdmins = config.admins || []; 
      const configAdmins2 = config.admins2 || [];

      
      async function resolveUser(userId) {
        
        const foundInRoles = staff.find(u => u.id.toString() === userId.toString());
        
        
        const data = db.read();
        const foundInDb = data.users.find(u => u.id.toString() === userId.toString());

        
        let localData = foundInRoles || foundInDb;

        
        try {
          const entity = await client.getEntity(userId.toString());
          return {
            name: `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || localData?.name || localData?.first_name || 'Usuario',
            username: entity.username || localData?.username || null,
            id: userId.toString()
          };
        } catch (e) {
          
          if (localData) {
            return {
              name: localData.name || localData.first_name || 'Staff',
              username: localData.username || null,
              id: userId.toString()
            };
          }
          return { name: 'Staff', username: null, id: userId.toString() };
        }
      }

      
      // Definimos los grupos y sus emojis/títulos
      const categories = [
        { key: 'owner', label: '👑 FUNDADORES', emoji: '' },
        { key: 'co-owner', label: '🥈 CO-FUNDADORES', emoji: '' },
        { key: 'admin', label: '🛡️ TRATO ADMIN', emoji: '' },
        { key: 'staff', label: '🎖️ STAFF', emoji: '' },
        { key: 'quemador', label: '🔥 QUEMADORES', emoji: '' },
        { key: 'certificado', label: '✅ CERTIFICADOS', emoji: '' }
      ];

      let message = "<b>⚜️ STAFF - Causa Market PE ⚜️</b>\n\n";
      const uniqueStaffIds = new Set();

      for (const cat of categories) {
        let members = [];

        if (cat.key === 'owner') {
          for (const id of configAdmins) {
            const user = await resolveUser(id);
            members.push(user);
            uniqueStaffIds.add(id.toString());
          }
        } else if (cat.key === 'co-owner') {
          for (const id of configAdmins2) {
            const user = await resolveUser(id);
            members.push(user);
            uniqueStaffIds.add(id.toString());
          }
        } else {
         
          members = staff.filter(u => u.role === cat.key);
          members.forEach(m => uniqueStaffIds.add(m.id.toString()));
        }

        if (members.length > 0) {
          message += `${cat.emoji} <b>${cat.label}</b>\n`;
          members.forEach(u => {
            const userTag = u.username ? `@${u.username.replace('@', '')}` : 'No tiene';
            const nameLink = `<a href="tg://user?id=${u.id}">${u.name || 'Personal'}</a>`;
            
            message += `├─ <b>NOMBRE:</b> ${nameLink}\n`;
            message += `├─ <b>USER:</b> ${userTag}\n`;
            message += `└─ <b>ID:</b> <code>${u.id}</code>\n\n`;
          });
        }
      }

      if (uniqueStaffIds.size === 0) {
        return bot.sendMessage(chatId, "<b>[⚙️]</b> No se encontró staff con roles asignados en la base de datos.", { 
          parse_mode: 'HTML',
          reply_to_message_id: msg.message_id
        });
      }

      message += `<i>Total: ${uniqueStaffIds.size}</i>`;

      bot.sendMessage(chatId, message, { 
        parse_mode: 'HTML',
        reply_to_message_id: msg.message_id
      });

    } catch (err) {
      console.error("Error en comando /staff:", err);
      bot.sendMessage(chatId, "❌ Error al leer la lista de staff.");
    }
  });
};

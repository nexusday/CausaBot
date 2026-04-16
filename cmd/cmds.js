module.exports = function(bot, db, config, client) {
  bot.onText(/^[./]cmds$/, async (msg) => {
    const chatId = msg.chat.id;
    const fromId = msg.from.id;

    
    const isOwner1 = config.admins.includes(fromId);
    const isOwner2 = config.admins2 && config.admins2.includes(fromId);

    
    let helpMsg = `
<b>[!] MENÚ DE COMANDOS - ${config.botName}</b>

<b>USUARIOS:</b>
/info <code>[id/@]</code> - Ver perfil detallado.
/tratoadmin - Solicitar administrador.
/report <code>[msj]</code> - Reportar.
`.trim();

    
    const fs = require('fs');
    const path = require('path');
    const rolesPath = path.join(__dirname, '..', 'database', 'json', 'roles.json');
    let userRole = null;
    if (fs.existsSync(rolesPath)) {
        const rolesData = JSON.parse(fs.readFileSync(rolesPath, 'utf8'));
        const found = rolesData.find(r => String(r.id) === String(fromId));
        if (found) userRole = found.role;
    }

    const isStaff = ['admin', 'quemador', 'certificado'].includes(userRole);

    
    if (isStaff || isOwner1 || isOwner2) {
      helpMsg += `

<b>REPORTAR:</b>
/rata <code>[id/@] [razón]</code> - Reportar estafador.
/delrata <code>[id/@]</code> - Limpiar reporte.
`.trim();
    }

    
    if (isOwner1 || isOwner2) {
      helpMsg += `

<b>MOD:</b>
/rol <code>[rango] [id/@]</code> - Asignar roles.
  (admin, certificado, quemador, nada)
`.trim();
    }

    
    if (isOwner1) {
      helpMsg += `

<b>OWNER PRINCIPAL:</b>
/promote <code>[id/@]</code> - Dar admin en grupo.
/rol <code>[owner/owner2]</code> - Gestionar jerarquía.
`.trim();
    }

    helpMsg += `\n`.trim();

    await bot.sendMessage(chatId, helpMsg, { 
      parse_mode: 'HTML',
      reply_to_message_id: msg.message_id 
    });
  });
};

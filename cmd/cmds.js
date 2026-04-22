module.exports = function(bot, db, config, client) {
  bot.onText(/^[./]cmds(?:@\w+)?$/, async (msg) => {
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
/reglas - Ver reglas del grupo.
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

    const isStaff = ['admin', 'quemador'].includes(userRole);

    let finalMsg = helpMsg;

    if (isStaff || isOwner1 || isOwner2) {
      finalMsg += `\n\n<b>REPORTAR:</b>\n/rata <code>[id/@] [razón]</code> - Reportar estafador.\n/ratas - Ver lista de estafadores.\n/delrata <code>[id/@]</code> - Limpiar reporte.`;
    }

    if (isOwner1 || isOwner2) {
      finalMsg += `\n\n<b>MOD:</b>\n/rol <code>[rango] [id/@]</code> - Asignar roles.\n  (admin, certificado, quemador, nada)\n/antilink <code>[on/off]</code> - Control de links.\n/mute <code>[id/@]</code> - Silenciar usuario.\n/unmute <code>[id/@]</code> - Quitar silencio.\n/del - Eliminar mensaje (respondiendo).\n/adrules - Configurar reglas (respondiendo).`;
    }

    if (isOwner1) {
      finalMsg += `\n\n<b>OWNER PRINCIPAL:</b>\n/promote <code>[id/@]</code> - Dar admin en grupo.\n/rol <code>[owner/owner2]</code> - Gestionar jerarquía.`;
    }

    await bot.sendMessage(chatId, finalMsg, { 
      parse_mode: 'HTML',
      reply_to_message_id: msg.message_id 
    });
  });
};

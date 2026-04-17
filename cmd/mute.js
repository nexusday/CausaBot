const fs = require('fs');
const path = require('path');

module.exports = function(bot, db, config, client) {
    const muteadosPath = path.join(__dirname, '..', 'database', 'json', 'muteados.json');

    bot.onText(/^[./](mute|unmute)(?:\s+(.+))?$/, async (msg, match) => {
        const chatId = msg.chat.id;
        const fromId = msg.from.id;
        const cmd = match[1].toLowerCase();
        const query = match[2] ? match[2].trim() : null;

        if (msg.chat.type === 'private') return;

        
        const configAdmins = config.admins || [];
        const configAdmins2 = config.admins2 || [];
        let hasAccess = configAdmins.includes(fromId) || configAdmins2.includes(fromId);
        
        if (!hasAccess) {
            try {
                const member = await bot.getChatMember(chatId, fromId);
                hasAccess = ['creator', 'administrator'].includes(member.status);
            } catch (e) {}
        }
        if (!hasAccess) return;

        let target = null;
        if (msg.reply_to_message) {
            target = {
                id: String(msg.reply_to_message.from.id),
                username: msg.reply_to_message.from.username,
                first_name: msg.reply_to_message.from.first_name
            };
        } else if (query) {
            try {
                const entity = await client.getEntity(query.replace('@', ''));
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
            return bot.sendMessage(chatId, `<b>[!] Uso:</b> /${cmd} @user o responde a un mensaje.`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
        }

        
        let isTargetAdmin = false;
        try {
            const targetMember = await bot.getChatMember(chatId, target.id);
            isTargetAdmin = ['creator', 'administrator'].includes(targetMember.status);
        } catch (e) {}

        const isTargetOwner = configAdmins.includes(Number(target.id)) || (configAdmins2 && configAdmins2.includes(Number(target.id)));

        if (cmd === 'mute' && (isTargetAdmin || isTargetOwner)) {
            return bot.sendMessage(chatId, "<b>[!] Error:</b> Ese usuario es administrador, no se puede silenciar.", { 
                parse_mode: 'HTML',
                reply_to_message_id: msg.message_id 
            });
        }

        try {
            if (cmd === 'mute') {
                await bot.restrictChatMember(chatId, target.id, {
                    can_send_messages: false,
                    can_send_media_messages: false,
                    can_send_polls: false,
                    can_send_other_messages: false,
                    can_add_web_page_previews: false
                });

                
                let data = { muted: {} };
                if (fs.existsSync(muteadosPath)) data = JSON.parse(fs.readFileSync(muteadosPath, 'utf8'));
                if (!data.muted[chatId]) data.muted[chatId] = [];
                data.muted[chatId] = data.muted[chatId].filter(m => String(m.id) !== String(target.id));
                data.muted[chatId].push({
                    id: String(target.id),
                    username: target.username || null,
                    first_name: target.first_name || 'Usuario',
                    date: new Date().toISOString(),
                    by: String(fromId),
                    reason: 'Manual'
                });
                fs.writeFileSync(muteadosPath, JSON.stringify(data, null, 2));

                bot.sendMessage(chatId, `<b>USUARIO SILENCIADO</b>\n\n<b>Usuario:</b> <a href="tg://user?id=${target.id}">${target.first_name}</a>\n<b>Por:</b> <a href="tg://user?id=${fromId}">${msg.from.first_name}</a>`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
            } else {
                
                const chat = await bot.getChat(chatId);

                
                await bot.restrictChatMember(chatId, target.id, {
                    ...chat.permissions
                });

                
                if (fs.existsSync(muteadosPath)) {
                    let data = JSON.parse(fs.readFileSync(muteadosPath, 'utf8'));
                    if (data.muted[chatId]) {
                        data.muted[chatId] = data.muted[chatId].filter(m => String(m.id) !== String(target.id));
                        fs.writeFileSync(muteadosPath, JSON.stringify(data, null, 2));
                    }
                }

                bot.sendMessage(chatId, `<b>✅ USUARIO DESMUTEADO</b>\n\n<b>Usuario:</b> <a href="tg://user?id=${target.id}">${target.first_name}</a>\n<b>Por:</b> <a href="tg://user?id=${fromId}">${msg.from.first_name}</a>`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
            }
        } catch (err) {
            bot.sendMessage(chatId, `<b>[!] Error:</b> <code>${err.message}</code>`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
        }
    });
};

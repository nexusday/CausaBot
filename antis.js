const fs = require('fs');
const path = require('path');

module.exports = function(bot, db, config, client) {
    const antisPath = path.join(__dirname, 'database', 'json', 'antis.json');

    function getAntis() {
        if (!fs.existsSync(antisPath)) return { groups: {} };
        try {
            const content = fs.readFileSync(antisPath, 'utf8');
            const data = JSON.parse(content);
            if (!data.groups) return { groups: {} };
            return data;
        } catch (e) {
            return { groups: {} };
        }
    }

    const muteadosPath = path.join(__dirname, 'database', 'json', 'muteados.json');
    function saveMuted(chatId, user, adminId) {
        let data = { muted: {} };
        if (fs.existsSync(muteadosPath)) {
            try { data = JSON.parse(fs.readFileSync(muteadosPath, 'utf8')); } catch(e) {}
        }
        if (!data.muted[chatId]) data.muted[chatId] = [];
        
        
        data.muted[chatId] = data.muted[chatId].filter(m => String(m.id) !== String(user.id));
        
        data.muted[chatId].push({
            id: String(user.id),
            username: user.username || null,
            first_name: user.first_name || 'Usuario',
            date: new Date().toISOString(),
            by: String(adminId),
            reason: 'Anti-link'
        });
        fs.writeFileSync(muteadosPath, JSON.stringify(data, null, 2));
    }

    bot.on('message', async (msg) => {
        if (!msg.text || msg.chat.type === 'private') return;

        const chatId = msg.chat.id;
        const antis = getAntis();

        
        if (!antis.groups[chatId] || !antis.groups[chatId].antilink) return;

        
        const linkRegex = /(https?:\/\/[^\s]+|t\.me\/[^\s]+|www\.[^\s]+)/gi;
        if (linkRegex.test(msg.text)) {
            const userId = msg.from.id;

            
            const configAdmins = config.admins || [];
            const configAdmins2 = config.admins2 || [];
            const isOwner = configAdmins.includes(userId) || configAdmins2.includes(userId);
            
            let isAdmin = isOwner;
            if (!isAdmin) {
                try {
                    const member = await bot.getChatMember(chatId, userId);
                    isAdmin = ['creator', 'administrator'].includes(member.status);
                } catch (e) { isAdmin = false; }
            }

            if (isAdmin) return; 

            
            try {
                
                await bot.deleteMessage(chatId, msg.message_id);

                
                await bot.restrictChatMember(chatId, userId, {
                    can_send_messages: false,
                    can_send_media_messages: false,
                    can_send_polls: false,
                    can_send_other_messages: false,
                    can_add_web_page_previews: false
                });

            
                saveMuted(chatId, msg.from, bot.token.split(':')[0]);

                const muteMsg = `<b>[!] ENLACE DETECTADO</b>\n\nEl usuario <a href="tg://user?id=${userId}">${msg.from.first_name}</a> ha sido silenciado por enviar links.`;
                
                bot.sendMessage(chatId, muteMsg, {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [[
                            { text: '✅ DESMUTEAR', callback_data: `unmute_${userId}` }
                        ]]
                    }
                });
            } catch (err) {
                console.error("Error en antilink:", err.message);
            }
        }
    });

    
    bot.on('callback_query', async (query) => {
        const data = query.data;
        if (data.startsWith('unmute_')) {
            const targetId = data.split('_')[1];
            const userId = query.from.id;
            const chatId = query.message.chat.id;

        
            const configAdmins = config.admins || [];
            const configAdmins2 = config.admins2 || [];
            const isOwner = configAdmins.includes(userId) || configAdmins2.includes(userId);

            let canUnmute = isOwner;
            if (!canUnmute) {
                try {
                    const member = await bot.getChatMember(chatId, userId);
                    canUnmute = ['creator', 'administrator'].includes(member.status);
                } catch (e) { canUnmute = false; }
            }

            if (!canUnmute) {
                return bot.answerCallbackQuery(query.id, { text: "No tienes permiso.", show_alert: true });
            }

            try {
                
                let targetName = "Usuario";
                if (fs.existsSync(muteadosPath)) {
                    let data = JSON.parse(fs.readFileSync(muteadosPath, 'utf8'));
                    if (data.muted[chatId]) {
                        const mInfo = data.muted[chatId].find(m => String(m.id) === String(targetId));
                        if (mInfo) targetName = mInfo.first_name;
                    }
                }

                
                const chat = await bot.getChat(chatId);

                await bot.restrictChatMember(chatId, targetId, {
                    ...chat.permissions
                });

            
                if (fs.existsSync(muteadosPath)) {
                    let data = JSON.parse(fs.readFileSync(muteadosPath, 'utf8'));
                    if (data.muted[chatId]) {
                        data.muted[chatId] = data.muted[chatId].filter(m => String(m.id) !== String(targetId));
                        fs.writeFileSync(muteadosPath, JSON.stringify(data, null, 2));
                    }
                }

                await bot.editMessageText(`<b>✅ USUARIO DESMUTEADO</b>\n\n<b>Usuario:</b> <a href="tg://user?id=${targetId}">${targetName}</a>\n<b>Acción por:</b> <a href="tg://user?id=${userId}">${query.from.first_name}</a>`, {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: 'HTML'
                });
                
                bot.answerCallbackQuery(query.id, { text: "Usuario desmuteado ✅" });
            } catch (err) {
                bot.answerCallbackQuery(query.id, { text: "Error al desmutear." });
            }
        }
    });
};

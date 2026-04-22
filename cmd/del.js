const fs = require('fs');
const path = require('path');

module.exports = function(bot, db, config, client) {
    bot.onText(/^[./]del(?:@\w+)?$/, async (msg) => {
        const chatId = msg.chat.id;
        const fromId = msg.from.id;

        if (msg.chat.type === 'private') return;

    
        const configAdmins = config.admins || [];
        const configAdmins2 = config.admins2 || [];
        const isOwner = configAdmins.includes(fromId) || configAdmins2.includes(fromId);

        let hasAccess = isOwner;
        if (!hasAccess) {
            try {
                const member = await bot.getChatMember(chatId, fromId);
                hasAccess = ['creator', 'administrator'].includes(member.status);
            } catch (e) { hasAccess = false; }
        }

        if (!hasAccess) return;

        if (!msg.reply_to_message) {
            return bot.sendMessage(chatId, "<b>[!] Error:</b> Debes responder al mensaje que quieres eliminar.", { 
                parse_mode: 'HTML',
                reply_to_message_id: msg.message_id 
            });
        }

        try {
            
            await bot.deleteMessage(chatId, msg.reply_to_message.message_id);
            
            await bot.deleteMessage(chatId, msg.message_id);
        } catch (err) {
            console.error("[!] Error al eliminar mensaje");
        }
    });
};

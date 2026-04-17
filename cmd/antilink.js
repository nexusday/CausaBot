const fs = require('fs');
const path = require('path');

module.exports = function(bot, db, config, client) {
    const antisPath = path.join(__dirname, '..', 'database', 'json', 'antis.json');

    bot.onText(/^[./]antilink(?:\s+(on|off))?(?:@\w+)?$/, async (msg, match) => {
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

        const action = match[1] ? match[1].toLowerCase() : null;
        
        let antis = { groups: {} };
        if (fs.existsSync(antisPath)) {
            antis = JSON.parse(fs.readFileSync(antisPath, 'utf8'));
        }

        if (!antis.groups[chatId]) antis.groups[chatId] = { antilink: false };

        if (!action) {
            const status = antis.groups[chatId].antilink ? "ACTIVO ✅" : "DESACTIVADO ❌";
            return bot.sendMessage(chatId, `<b>ANTILINK</b>\n\nEstado actual: <code>${status}</code>\nUso: <code>/antilink on</code> o <code>/antilink off</code>`, { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
        }

        if (action === 'on') {
            antis.groups[chatId].antilink = true;
            fs.writeFileSync(antisPath, JSON.stringify(antis, null, 2));
            bot.sendMessage(chatId, "<b>ANTILINK: ACTIVADO ✅</b>.", { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
        } else {
            antis.groups[chatId].antilink = false;
            fs.writeFileSync(antisPath, JSON.stringify(antis, null, 2));
            bot.sendMessage(chatId, "<b>ANTILINK: DESACTIVADO ❌</b>", { parse_mode: 'HTML', reply_to_message_id: msg.message_id });
        }
    });
};

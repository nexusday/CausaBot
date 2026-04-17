const path = require('path');
const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");
const config = require('./config.json');
const db = require('./database.js');

if (!config.token || config.token === '') {
  console.error('Falta poner token del bot en config.json.');
  process.exit(1);
}


const stringSession = new StringSession(config.session || ""); 

(async () => {
  
  const client = new TelegramClient(stringSession, config.apiId, config.apiHash, {
    connectionRetries: 5,
  });

  console.log("Iniciando sesión conexión...");
  await client.start({
    phoneNumber: async () => await input.text("Ingresa tu número de teléfono (+51...): "),
    password: async () => await input.text("Ingresa tu contraseña (2FA) si tienes: "),
    phoneCode: async () => await input.text("Ingresa el código que te envió Telegram: "),
  });
  
  
  const savedSession = client.session.save();
  if (config.session !== savedSession) {
    const freshConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    freshConfig.session = savedSession;
    fs.writeFileSync('./config.json', JSON.stringify(freshConfig, null, 2));
    console.log("Sesión guardada en config.json ✅");
  }

  console.log("Conexion Mt (Userbot) listo ✅");

  
  const bot = new TelegramBot(config.token, { polling: true });

  bot.onText(/^[./]start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `Hola ${msg.from.first_name || ''}! Soy ${config.botName || 'el bot administrador'}.`);
  });

  function registerUser(from) {
    if (!from || !from.id) return;
    try {
      const data = db.read();
      let user = data.users.find(u => u.id === from.id);
      if (!user) {
        user = {
          id: from.id,
          username: from.username || null,
          first_name: from.first_name || null,
          last_name: from.last_name || null,
          addedAt: new Date().toISOString()
        };
        data.users.push(user);
        db.write(data);
      } else {
        let changed = false;
        if (from.username && user.username !== from.username) { user.username = from.username; changed = true; }
        if (from.first_name && user.first_name !== from.first_name) { user.first_name = from.first_name; changed = true; }
        if (from.last_name && user.last_name !== from.last_name) { user.last_name = from.last_name; changed = true; }
        if (changed) db.write(data);
      }
    } catch (err) {
      console.error('Error registrando usuario:', err.message);
    }
  }

  bot.on('message', (msg) => {
    if (!msg.text) return;
    if (msg.from) registerUser(msg.from);
  });

  
  const cmdsDir = path.join(__dirname, 'cmd');
  if (fs.existsSync(cmdsDir)) {
    const files = fs.readdirSync(cmdsDir);
    files.forEach(file => {
      if (!file.endsWith('.js')) return;
      try {
        const mod = require(path.join(cmdsDir, file));
        if (typeof mod === 'function') {
          mod(bot, db, config, client); 
        }
      } catch (err) {
        console.warn(`Error cargando comando ${file}:`, err.message);
      }
    });
  }

  // Cargar sistema de Antis (Eventos)
  const antisFile = path.join(__dirname, 'antis.js');
  if (fs.existsSync(antisFile)) {
    try {
      require(antisFile)(bot, db, config, client);
      console.log("Sistema Anti-links cargado ✅");
    } catch (err) {
      console.warn("Error cargando antis.js:", err.message);
    }
  }

  console.log(`${config.botName || 'Bot'} (Bot API) iniciado.`);
})();


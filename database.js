const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, 'database', 'json');
const dbFile = path.join(dbDir, 'db.json');

function ensure() {
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify({ users: [], meta: {} }, null, 2), 'utf8');
}

function read() {
  ensure();
  const raw = fs.readFileSync(dbFile, 'utf8');
  return JSON.parse(raw);
}

function write(data) {
  ensure();
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = { read, write, dbFile };

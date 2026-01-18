const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'bot.db');
const journalPath = path.join(process.cwd(), 'bot.db-journal');

console.log('🗑️  Deleting old database...');

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log('✅ Deleted bot.db');
} else {
  console.log('ℹ️  bot.db does not exist');
}

if (fs.existsSync(journalPath)) {
  fs.unlinkSync(journalPath);
  console.log('✅ Deleted bot.db-journal');
}

console.log('✅ Database reset complete!');
console.log('ℹ️  Run "npm run build && npm start" to create a new database with the updated schema.');

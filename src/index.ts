import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { handleNewMember } from './handlers/welcome';
import { handlePrivateMessage } from './handlers/private';
import { handleButtonClick } from './handlers/buttons';
import { handleSetGroupCommand } from './handlers/userPreferences';
import { handleBroadcastCommand, handleBroadcastSend } from './handlers/broadcast';
import { 
  handleConfigCommand,
  handleWelcomeMessageCommand,
  handleReferralCommand,
  handleLiveTradeCommand,
  handleAdminContactsCommand,
  handleCopyTradeCommand,
  handleConfigUpdate
} from './handlers/config';
import { isAdmin } from './utils/admin';
import './database/schema'; // Initialize database

dotenv.config();

console.log('🔄 Starting bot...');
console.log('📁 Database initialized');

const botToken = process.env.BOT_TOKEN;

if (!botToken) {
  console.error('❌ BOT_TOKEN is not set in environment variables');
  process.exit(1);
}

console.log('🔑 Bot token loaded');

const bot = new Telegraf(botToken);

console.log('🤖 Bot instance created');

// Handle new members joining groups
bot.on('new_chat_members', handleNewMember);

// Handle button clicks
bot.on('callback_query', handleButtonClick);

// Handle user preferences
bot.command('setgroup', handleSetGroupCommand);

// Handle broadcast
bot.command('broadcast', handleBroadcastCommand);

// Handle config commands
bot.command('config', handleConfigCommand);
bot.command('welcome_message', handleWelcomeMessageCommand);
bot.command('referral', handleReferralCommand);
bot.command('live_trade', handleLiveTradeCommand);
bot.command('admin_contacts', handleAdminContactsCommand);
bot.command('copy_trade', handleCopyTradeCommand);

// Handle private messages
bot.on('message', async (ctx, next) => {
  const chat = ctx.chat;
  
  if (chat && chat.type === 'private') {
    // Check if admin is updating config or sending broadcast
    const from = ctx.from;
    if (from && isAdmin(from.id)) {
      const broadcastHandled = await handleBroadcastSend(ctx);
      if (broadcastHandled) return;
      
      const configHandled = await handleConfigUpdate(ctx);
      if (configHandled) return;
    }
    
    // Handle private message (buttons, etc.)
    await handlePrivateMessage(ctx);
    return;
  }
  
  await next();
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
});

// Start bot
console.log('🚀 Launching bot...');

bot.launch()
  .then(() => {
    console.log('✅ Bot is running and ready!');
    console.log('📝 Listening for messages...');
  })
  .catch((error) => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Export for Vercel
export default bot;

import { VercelRequest, VercelResponse } from '@vercel/node';
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { handleNewMember } from '../src/handlers/welcome';
import { handlePrivateMessage } from '../src/handlers/private';
import { handleButtonClick } from '../src/handlers/buttons';
import { handleSetGroupCommand } from '../src/handlers/userPreferences';
import { handleBroadcastCommand, handleBroadcastSend } from '../src/handlers/broadcast';
import { 
  handleConfigCommand,
  handleWelcomeMessageCommand,
  handleReferralCommand,
  handleLiveTradeCommand,
  handleAdminContactsCommand,
  handleCopyTradeCommand,
  handleConfigUpdate
} from '../src/handlers/config';
import { isAdmin } from '../src/utils/admin';
import '../src/database/schema'; // Initialize database

dotenv.config();

const botToken = process.env.BOT_TOKEN;

if (!botToken) {
  throw new Error('BOT_TOKEN is not set in environment variables');
}

const bot = new Telegraf(botToken);

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle webhook updates
  if (req.method === 'POST') {
    try {
      await bot.handleUpdate(req.body);
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(200).json({ ok: false, error: 'Internal error' });
    }
  }
  
  // Health check
  if (req.method === 'GET') {
    return res.status(200).json({ status: 'ok', bot: 'running' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

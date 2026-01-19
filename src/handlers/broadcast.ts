import { Context } from 'telegraf';
import { isAdmin } from '../utils/admin';
import { StateManager } from '../utils/state';
import { ensureUserExists, isPrivateChat, extractGroupId, ensureGroupExists } from '../utils/validation';
import { parseWelcomeMessage } from '../utils/messageParser';
import { BroadcastLogModel } from '../database/models';
import { formatMessageForStorage } from '../utils/telegramFormatter';

export async function handleBroadcastCommand(ctx: Context): Promise<void> {
  const chat = ctx.chat;
  const from = ctx.from;
  
  if (!chat || !from) return;

  if (!isAdmin(from.id)) {
    await ctx.reply('❌ You are not authorized to use this command.');
    return;
  }

  if (!isPrivateChat(ctx)) {
    await ctx.reply('⚠️ This command can only be used in private chat with the bot.');
    return;
  }

  const message = ctx.message;
  if (!message || !('text' in message)) return;

  const args = message.text.split(' ').slice(1);
  const groupId = extractGroupId(args);
  
  if (!groupId) {
    await ctx.reply(
      `⚠️ Please provide a valid group ID.\n\n` +
      `Usage: /broadcast <group_id>\n\n` +
      `Example: /broadcast -1001234567890\n\n` +
      `After sending the command, reply with your broadcast message.`
    );
    return;
  }

  // Ensure group exists
  await ensureGroupExists(groupId);

  await ctx.reply(
    `📢 <b>Broadcast to Group ${groupId}</b>\n\n` +
    `Please reply with your broadcast message.\n\n` +
    `<b>Variables:</b>\n• {{name}} - User's first name\n• {{username}} - User's @username\n\n` +
    `Type /cancel to cancel.`,
    { parse_mode: 'HTML' }
  );
  
  StateManager.setWaiting(from.id, `broadcast:${groupId}`);
}

export async function handleBroadcastSend(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  const chat = ctx.chat;
  
  if (!from || !chat) return false;
  if (!isPrivateChat(ctx)) return false;
  if (!isAdmin(from.id)) return false;

  const waitingFor = StateManager.getWaiting(from.id);
  if (!waitingFor || !waitingFor.startsWith('broadcast:')) return false;

  const message = ctx.message;
  if (!message || !('text' in message)) {
    await ctx.reply('❌ Please send a text message.');
    return true;
  }

  const messageText = message.text;
  const entities = 'entities' in message ? message.entities : undefined;
  
  if (!messageText) {
    await ctx.reply('❌ Please send a text message.');
    return true;
  }

  if (messageText.startsWith('/')) {
    if (messageText === '/cancel') {
      StateManager.clearWaiting(from.id);
      await ctx.reply('❌ Broadcast cancelled.');
      return true;
    }
    return false;
  }

  const userTelegramId = from.id.toString();

  // Track user interaction
  await ensureUserExists(
    userTelegramId,
    from.username || null,
    from.first_name || null,
    from.last_name || null,
    false,
    from.language_code || null
  );

  // Format message for storage (convert entities to HTML)
  const formattedMessage = formatMessageForStorage(messageText, entities);

  const groupId = waitingFor.split(':')[1];

  try {
    // Parse message (no user context for broadcast)
    const parsedMessage = parseWelcomeMessage(formattedMessage, 'there', undefined);
    
    // Send broadcast to group
    await ctx.telegram.sendMessage(groupId, parsedMessage, { parse_mode: 'HTML' });
    
    // Log successful broadcast (store formatted message)
    await BroadcastLogModel.create(groupId, formattedMessage, userTelegramId, true);
    
    await ctx.reply(`✅ Broadcast sent successfully to group ${groupId}!`);
  } catch (error) {
    console.error('Broadcast error:', error);
    
    // Log failed broadcast (store formatted message)
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await BroadcastLogModel.create(groupId, formattedMessage, userTelegramId, false, errorMsg);
    
    await ctx.reply(
      `❌ Failed to send broadcast to group ${groupId}.\n\n` +
      `Possible reasons:\n` +
      `• Bot is not in the group\n` +
      `• Bot doesn't have permission to send messages\n` +
      `• Invalid group ID\n\n` +
      `Error: ${errorMsg}`
    );
  }

  StateManager.clearWaiting(from.id);
  return true;
}

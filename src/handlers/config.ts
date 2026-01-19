import { Context } from 'telegraf';
import { isAdmin } from '../utils/admin';
import { GroupConfigModel, WelcomeMessageModel } from '../database/models';
import { StateManager } from '../utils/state';
import { ensureUserExists, isPrivateChat, extractGroupId } from '../utils/validation';
import { getDefaultMessage } from '../utils/defaults';

type ConfigType = 'welcome_message' | 'referral' | 'live_trade' | 'admin_contacts' | 'copy_trade';

export async function handleConfigCommand(ctx: Context): Promise<void> {
  const chat = ctx.chat;
  const from = ctx.from;
  
  if (!chat || !from) return;

  if (!isAdmin(from.id)) {
    await ctx.reply('❌ You are not authorized to use this command.');
    return;
  }

  if (chat.type !== 'private') {
    await ctx.reply('⚠️ This command can only be used in private chat with the bot.');
    return;
  }

  await ctx.reply(
    '⚙️ *Bot Configuration Commands*\n\n' +
    '*Group Configuration:*\n' +
    '1️⃣ `/welcome_message <group_id>` - Set welcome message\n' +
    '2️⃣ `/referral <group_id>` - Set referral message\n' +
    '3️⃣ `/live_trade <group_id>` - Set live trade channel message\n' +
    '4️⃣ `/admin_contacts <group_id>` - Set admin contacts message\n' +
    '5️⃣ `/copy_trade <group_id>` - Set copy trade message\n\n' +
    '*User Preferences:*\n' +
    '6️⃣ `/setgroup <group_id>` - Link private chat to a group\n\n' +
    '*Broadcast:*\n' +
    '7️⃣ `/broadcast <group_id>` - Send message to a group\n\n' +
    '📋 *To get group ID:*\n' +
    '• Add @userinfobot to your group\n' +
    '• Forward any message from the group to @userinfobot\n' +
    '• It will show you the group ID',
    { parse_mode: 'Markdown' }
  );
}

export async function handleWelcomeMessageCommand(ctx: Context): Promise<void> {
  await handleConfigSetup(ctx, 'welcome_message');
}

export async function handleReferralCommand(ctx: Context): Promise<void> {
  await handleConfigSetup(ctx, 'referral');
}

export async function handleLiveTradeCommand(ctx: Context): Promise<void> {
  await handleConfigSetup(ctx, 'live_trade');
}

export async function handleAdminContactsCommand(ctx: Context): Promise<void> {
  await handleConfigSetup(ctx, 'admin_contacts');
}

export async function handleCopyTradeCommand(ctx: Context): Promise<void> {
  await handleConfigSetup(ctx, 'copy_trade');
}

async function handleConfigSetup(ctx: Context, configType: ConfigType): Promise<void> {
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
      `Usage: /${configType} <group_id>\n\n` +
      `Example: /${configType} -1001234567890`
    );
    return;
  }
  let currentValue = '';
  let prompt = '';

  if (configType === 'welcome_message') {
    const welcomeData = await WelcomeMessageModel.getByGroupId(groupId);
    currentValue = welcomeData?.message_text || process.env.WELCOME_MESSAGE || 'Not set';
    prompt = `📝 *Current Welcome Message:*\n\n${currentValue}\n\n` +
      `Please reply with your new welcome message.\n\n` +
      `*Variables:*\n• {{name}} - User's first name\n• {{username}} - User's @username\n\n` +
      `Type /cancel to cancel.`;
  } else {
    const config = await GroupConfigModel.getByGroupId(groupId);
    
    const fieldMap = {
      referral: { field: 'referral_message' as const, emoji: '🔗', name: 'Referral' },
      live_trade: { field: 'live_trade_channel_message' as const, emoji: '📊', name: 'Live Trade' },
      admin_contacts: { field: 'admin_contacts_message' as const, emoji: '💬', name: 'Admin Contact' },
      copy_trade: { field: 'copy_trade_message' as const, emoji: '📈', name: 'Copy Trade' },
    };

    const info = fieldMap[configType];
    currentValue = config?.[info.field] || getDefaultMessage(configType as any);
    prompt = `${info.emoji} *Current ${info.name} Message:*\n\n${currentValue}\n\n` +
      `Please reply with your new ${info.name.toLowerCase()} message.\n\n` +
      `*Variables:*\n• {{name}} - User's first name\n• {{username}} - User's @username\n\n` +
      `Type /cancel to cancel.`;
  }

  await ctx.reply(prompt, { parse_mode: 'Markdown' });
  StateManager.setWaiting(from.id, `${configType}:${groupId}`);
}

export async function handleConfigUpdate(ctx: Context): Promise<boolean> {
  const from = ctx.from;
  const chat = ctx.chat;
  
  if (!from || !chat) return false;
  if (!isPrivateChat(ctx)) return false;
  if (!isAdmin(from.id)) return false;

  const waitingFor = StateManager.getWaiting(from.id);
  if (!waitingFor) return false;

  const message = ctx.message;
  if (!message || !('text' in message)) {
    await ctx.reply('❌ Please send a text message.');
    return true;
  }

  const messageText = message.text;
  
  if (!messageText) {
    await ctx.reply('❌ Please send a text message.');
    return true;
  }

  if (messageText.startsWith('/')) {
    if (messageText === '/cancel') {
      StateManager.clearWaiting(from.id);
      await ctx.reply('❌ Update cancelled.');
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

  const [configType, groupId] = waitingFor.split(':') as [ConfigType, string];

  switch (configType) {
    case 'welcome_message':
      await WelcomeMessageModel.createOrUpdate(groupId, messageText, userTelegramId);
      await ctx.reply(`✅ Welcome message updated for group ${groupId}!`);
      break;
    
    case 'referral':
      await GroupConfigModel.updateField(groupId, 'referral_message', messageText, userTelegramId);
      await ctx.reply(`✅ Referral message updated for group ${groupId}!`);
      break;
    
    case 'live_trade':
      await GroupConfigModel.updateField(groupId, 'live_trade_channel_message', messageText, userTelegramId);
      await ctx.reply(`✅ Live trade message updated for group ${groupId}!`);
      break;
    
    case 'admin_contacts':
      await GroupConfigModel.updateField(groupId, 'admin_contacts_message', messageText, userTelegramId);
      await ctx.reply(`✅ Admin contacts message updated for group ${groupId}!`);
      break;
    
    case 'copy_trade':
      await GroupConfigModel.updateField(groupId, 'copy_trade_message', messageText, userTelegramId);
      await ctx.reply(`✅ Copy trade message updated for group ${groupId}!`);
      break;
  }

  StateManager.clearWaiting(from.id);
  return true;
}

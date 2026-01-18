import { Context } from 'telegraf';
import { getKeyboardButtons } from '../utils/buttons';
import { UserModel, ButtonClickModel, GroupConfigModel } from '../database/models';
import { parseWelcomeMessage } from '../utils/messageParser';
import { ensureUserExists } from '../utils/validation';
import { getDefaultMessages } from '../utils/defaults';

export async function handlePrivateMessage(ctx: Context): Promise<void> {
  const chat = ctx.chat;
  const message = ctx.message;
  const from = ctx.from;
  
  if (!chat || chat.type !== 'private' || !message || !('text' in message) || !from) {
    return;
  }

  const text = message.text.toLowerCase();
  const userId = from.id.toString();
  const name = from.first_name || 'there';
  const username = from.username;

  // Track user interaction
  ensureUserExists(
    userId,
    username || null,
    name,
    from.last_name || null,
    false,
    from.language_code || null
  );

  // Check if user has a preferred group
  const preferredGroupId = UserModel.getPreferredGroup(userId);
  const groupConfig = preferredGroupId ? GroupConfigModel.getByGroupId(preferredGroupId) : null;

  // Get message templates (use group config if available, otherwise defaults)
  const defaults = getDefaultMessages();

  const referralMsg = groupConfig?.referral_message || defaults.referral;
  const liveTradeMsg = groupConfig?.live_trade_channel_message || defaults.liveTrade;
  const adminMsg = groupConfig?.admin_contacts_message || defaults.admin;
  const copyTradeMsg = groupConfig?.copy_trade_message || defaults.copyTrade;

  // Handle button clicks
  if (text.includes('referral')) {
    ButtonClickModel.create(userId, 'referral_link', preferredGroupId);
    const parsedMessage = parseWelcomeMessage(referralMsg, name, username);
    await ctx.reply(parsedMessage, { reply_markup: getKeyboardButtons(), parse_mode: 'Markdown' });
  } else if (text.includes('live trade') || text.includes('trade channel')) {
    ButtonClickModel.create(userId, 'live_trade_channel', preferredGroupId);
    const parsedMessage = parseWelcomeMessage(liveTradeMsg, name, username);
    await ctx.reply(parsedMessage, { reply_markup: getKeyboardButtons(), parse_mode: 'Markdown' });
  } else if (text.includes('contact') || text.includes('admin')) {
    ButtonClickModel.create(userId, 'contact_admin', preferredGroupId);
    const parsedMessage = parseWelcomeMessage(adminMsg, name, username);
    await ctx.reply(parsedMessage, { reply_markup: getKeyboardButtons(), parse_mode: 'Markdown' });
  } else if (text.includes('copy trade') || text.includes('copy')) {
    ButtonClickModel.create(userId, 'copy_trade', preferredGroupId);
    const parsedMessage = parseWelcomeMessage(copyTradeMsg, name, username);
    await ctx.reply(parsedMessage, { reply_markup: getKeyboardButtons(), parse_mode: 'Markdown' });
  } else {
    // Default response with keyboard
    await ctx.reply(
      '👋 Welcome! Use the buttons below to navigate:\n\n' +
      '🔗 Link Referral - Get your referral link\n' +
      '📊 Live Trade Channel - Join our live trading channel\n' +
      '💬 Contact Admin - Need help? Contact us\n' +
      '📈 Copy Trade - Start copying trades',
      { reply_markup: getKeyboardButtons() }
    );
  }
}

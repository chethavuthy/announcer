import { Context } from 'telegraf';
import { GroupConfigModel, ButtonClickModel, UserModel } from '../database/models';
import { parseWelcomeMessage } from '../utils/messageParser';
import { ensureUserExists, ensureGroupExists, getChatTitle } from '../utils/validation';
import { getDefaultMessages } from '../utils/defaults';

export async function handleButtonClick(ctx: Context): Promise<void> {
  const callbackQuery = ctx.callbackQuery;
  if (!callbackQuery || !('data' in callbackQuery)) return;

  const data = callbackQuery.data;
  const from = ctx.from;
  const chat = ctx.chat;

  if (!from || !chat) return;

  const userId = from.id.toString();
  const isPrivateChat = chat.type === 'private';
  const groupId = isPrivateChat ? null : chat.id.toString();

  // Track user
  await ensureUserExists(
    userId,
    from.username || null,
    from.first_name || null,
    from.last_name || null,
    false,
    from.language_code || null
  );

  // Ensure group exists if button clicked in group
  if (groupId) {
    await ensureGroupExists(
      groupId,
      getChatTitle(chat),
      chat.type as 'group' | 'supergroup'
    );
  }

  let messageTemplate = '';
  let buttonType = '';

  // Get config for the group
  // In private chat, use user's preferred group; otherwise use current group
  let configGroupId = groupId;
  if (isPrivateChat) {
    configGroupId = await UserModel.getPreferredGroup(userId);
  }
  
  const config = configGroupId ? await GroupConfigModel.getByGroupId(configGroupId) : null;
  const defaults = getDefaultMessages();

  switch (data) {
    case 'btn_referral':
      buttonType = 'referral_link';
      messageTemplate = config?.referral_message || defaults.referral;
      break;

    case 'btn_live_trade':
      buttonType = 'live_trade_channel';
      messageTemplate = config?.live_trade_channel_message || defaults.liveTrade;
      break;

    case 'btn_admin':
      buttonType = 'contact_admin';
      messageTemplate = config?.admin_contacts_message || defaults.admin;
      break;

    case 'btn_copy_trade':
      buttonType = 'copy_trade';
      messageTemplate = config?.copy_trade_message || defaults.copyTrade;
      break;

    default:
      await ctx.answerCbQuery('Invalid button');
      return;
  }

  // Log button click (use configGroupId for logging in private chat)
  await ButtonClickModel.create(userId, buttonType, groupId || configGroupId);

  // Parse message with user variables
  const name = from.first_name || 'there';
  const username = from.username;
  const parsedMessage = parseWelcomeMessage(messageTemplate, name, username);

  // Answer callback query and send message
  await ctx.answerCbQuery();
  await ctx.reply(parsedMessage, { parse_mode: 'HTML' });
}

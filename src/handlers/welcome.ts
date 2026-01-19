import { Context } from 'telegraf';
import { WelcomeMessageModel, GroupModel, WelcomeLogModel } from '../database/models';
import { parseWelcomeMessage } from '../utils/messageParser';
import { getInlineButtons } from '../utils/buttons';
import { ensureUserExists, ensureGroupExists, getChatTitle } from '../utils/validation';

export async function handleNewMember(ctx: Context): Promise<void> {
  const chat = ctx.chat;
  if (!chat || chat.type === 'private') return;

  const newMembers = ctx.message && 'new_chat_members' in ctx.message 
    ? ctx.message.new_chat_members 
    : [];

  if (newMembers.length === 0) return;

  const groupId = chat.id.toString();
  
  // Track group
  await ensureGroupExists(groupId, getChatTitle(chat), chat.type);
  
  // Check if bot is active for this group
  if (!await GroupModel.isActive(groupId)) {
    return;
  }

  // Get welcome message from database or use default
  const welcomeData = await WelcomeMessageModel.getByGroupId(groupId);
  const defaultMessage = process.env.WELCOME_MESSAGE || 
    'Welcome {{name}}! 🎉\n\nJoin our community and start trading!\n\nUse the buttons below to get started.';
  
  const messageTemplate = welcomeData?.message_text || defaultMessage;

  // Send welcome message for each new member
  for (const member of newMembers) {
    // Skip if the new member is the bot itself
    if (member.is_bot && member.id === ctx.botInfo?.id) continue;

    const name = member.first_name || 'there';
    const username = member.username;
    const userId = member.id.toString();
    
    // Track user
    await ensureUserExists(
      userId,
      username || null,
      name,
      member.last_name || null,
      member.is_bot,
      member.language_code || null
    );

    const parsedMessage = parseWelcomeMessage(messageTemplate, name, username);

    try {
      await ctx.reply(parsedMessage, {
        reply_markup: getInlineButtons(),
        parse_mode: 'HTML',
      });
      
      // Log successful welcome message
      await WelcomeLogModel.create(groupId, userId, true);
    } catch (error) {
      console.error('Error sending welcome message:', error);
      
      // Log failed welcome message
      await WelcomeLogModel.create(groupId, userId, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

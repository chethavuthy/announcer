import { Context } from 'telegraf';
import { UserModel, GroupModel, UserPreferenceLogModel } from '../database/models';
import { isSuperAdmin } from '../utils/admin';
import { isPrivateChat, ensureUserExists, extractGroupId, ensureGroupExists } from '../utils/validation';

export async function handleSetGroupCommand(ctx: Context): Promise<void> {
  const chat = ctx.chat;
  const from = ctx.from;
  
  if (!chat || !from) return;

  // Check if user is super admin
  if (!isSuperAdmin(from.id)) {
    await ctx.reply('⚠️ This command is only available for super administrators.');
    return;
  }

  if (!isPrivateChat(ctx)) {
    await ctx.reply('⚠️ This command can only be used in private chat with the bot.');
    return;
  }

  const message = ctx.message;
  if (!message || !('text' in message)) return;

  const args = message.text.split(' ').slice(1);
  
  // If no group ID provided, show current setting
  if (args.length === 0 || !args[0]) {
    const userId = from.id.toString();
    const preferredGroup = await UserModel.getPreferredGroup(userId);
    
    if (preferredGroup) {
      const group = await GroupModel.getByTelegramId(preferredGroup);
      const groupTitle = group?.title || 'Unknown Group';
      await ctx.reply(
        `📋 <b>Current Setting</b>\n\n` +
        `Your private chat is linked to:\n` +
        `Group ID: <code>${preferredGroup}</code>\n` +
        `Group Name: ${groupTitle}\n\n` +
        `To change: <code>/setgroup &lt;group_id&gt;</code>\n` +
        `To reset: <code>/setgroup reset</code>`,
        { parse_mode: 'HTML' }
      );
    } else {
      await ctx.reply(
        `📋 <b>Current Setting</b>\n\n` +
        `You haven't linked your private chat to any group yet.\n\n` +
        `Usage: <code>/setgroup &lt;group_id&gt;</code>\n\n` +
        `This will make your private chat buttons use the custom messages from that group.`,
        { parse_mode: 'HTML' }
      );
    }
    return;
  }

  const groupIdRaw = args[0];
  const userId = from.id.toString();

  // Track user
  await ensureUserExists(
    userId,
    from.username || null,
    from.first_name || null,
    from.last_name || null,
    false,
    from.language_code || null
  );

  // Handle reset
  if (groupIdRaw.toLowerCase() === 'reset') {
    await UserModel.setPreferredGroup(userId, null);
    
    // Log the reset action
    await UserPreferenceLogModel.create(userId, null, 'reset');
    
    await ctx.reply('✅ Private chat link reset! You will now see default messages.');
    return;
  }

  // Validate and extract group ID
  const groupId = extractGroupId([groupIdRaw]);
  if (!groupId) {
    await ctx.reply('⚠️ Invalid group ID. Group IDs should be numbers (e.g., -1001234567890).');
    return;
  }

  // Ensure group exists
  await ensureGroupExists(groupId);
  const group = await GroupModel.getByTelegramId(groupId);

  // Set preferred group
  await UserModel.setPreferredGroup(userId, groupId);
  
  // Log the preference change
  await UserPreferenceLogModel.create(userId, groupId, 'set');
  
  const groupTitle = group?.title || 'the group';
  await ctx.reply(
    `✅ <b>Private Chat Linked!</b>\n\n` +
    `Your private chat is now linked to:\n` +
    `Group ID: <code>${groupId}</code>\n` +
    `Group Name: ${groupTitle}\n\n` +
    `You will see custom messages from this group when using keyboard buttons.`,
    { parse_mode: 'HTML' }
  );
}

import { Context } from 'telegraf';
import { UserModel, GroupModel, UserPreferenceLogModel, BotSettingsModel } from '../database/models';
import { isSuperAdmin } from '../utils/admin';
import { isPrivateChat, ensureUserExists, extractGroupId, ensureGroupExists } from '../utils/validation';
import db from '../database/connection';

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
    const defaultGroupId = await BotSettingsModel.getDefaultPreferredGroup();
    
    if (defaultGroupId) {
      const group = await GroupModel.getByTelegramId(defaultGroupId);
      const groupTitle = group?.title || 'Unknown Group';
      await ctx.reply(
        `📋 <b>Current Global Default Setting</b>\n\n` +
        `Default preferred group for all users:\n` +
        `Group ID: <code>${defaultGroupId}</code>\n` +
        `Group Name: ${groupTitle}\n\n` +
        `All users without a personal preference will use this group's messages.\n\n` +
        `To change: <code>/setgroup &lt;group_id&gt;</code>\n` +
        `To reset: <code>/setgroup reset</code>`,
        { parse_mode: 'HTML' }
      );
    } else {
      await ctx.reply(
        `📋 <b>Current Global Default Setting</b>\n\n` +
        `No default preferred group is set.\n\n` +
        `Usage: <code>/setgroup &lt;group_id&gt;</code>\n\n` +
        `This will set the default preferred group for all users. Users will see custom messages from this group when they don't have a personal preference.`,
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
    await BotSettingsModel.setDefaultPreferredGroup(null);
    
    await ctx.reply('✅ Global default preferred group reset! All users will now see default messages unless they have a personal preference.');
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

  // Set global default preferred group
  await BotSettingsModel.setDefaultPreferredGroup(groupId);
  
  // Also set preferred group for all existing users who don't have one
  const stmt = db.prepare(`
    UPDATE users 
    SET preferred_group_id = ?
    WHERE preferred_group_id IS NULL
  `);
  const result = await stmt.run(groupId);
  
  const groupTitle = group?.title || 'the group';
  await ctx.reply(
    `✅ <b>Global Default Preferred Group Set!</b>\n\n` +
    `Default preferred group for all users:\n` +
    `Group ID: <code>${groupId}</code>\n` +
    `Group Name: ${groupTitle}\n\n` +
    `Updated ${result.changes || 0} existing users without a preference.\n\n` +
    `All users will now see custom messages from this group when using keyboard buttons.`,
    { parse_mode: 'HTML' }
  );
}

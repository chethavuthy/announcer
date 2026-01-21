/**
 * Common bot messages
 */

export const messages = {
  are_you_sure_to_remove_this_item: '⚠️ Are you sure you want to remove this item?',
  update_cancelled: '❌ Update cancelled.',
  broadcast_cancelled: '❌ Broadcast cancelled.',
  please_send_text_message: '❌ Please send a text message.',
  not_authorized: '❌ You are not authorized to use this command.',
  private_chat_only: '⚠️ This command can only be used in private chat with the bot.',
  invalid_group_id: '⚠️ Please provide a valid group ID.',
  super_admin_only: '⚠️ This command is only available for super administrators.',
} as const;

export type MessageKey = keyof typeof messages;

export function getMessage(key: MessageKey): string {
  return messages[key];
}

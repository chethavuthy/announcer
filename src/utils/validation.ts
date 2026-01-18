/**
 * Validation utilities for ensuring data integrity
 */

import { GroupModel, UserModel } from '../database/models';
import { Context } from 'telegraf';

/**
 * Ensure a group exists in the database, create if not
 */
export function ensureGroupExists(
  groupId: string,
  title: string | null = null,
  type: 'group' | 'supergroup' | 'channel' = 'group'
): void {
  const existing = GroupModel.getByTelegramId(groupId);
  if (!existing) {
    GroupModel.createOrUpdate(groupId, title, type);
  }
}

/**
 * Ensure a user exists in the database, create or update
 */
export function ensureUserExists(
  telegramId: string,
  username: string | null,
  firstName: string | null,
  lastName: string | null,
  isBot: boolean = false,
  languageCode: string | null = null
): void {
  UserModel.createOrUpdate(telegramId, username, firstName, lastName, isBot, languageCode);
}

/**
 * Extract and validate group ID from command arguments
 */
export function extractGroupId(args: string[]): string | null {
  if (args.length === 0 || !args[0]) {
    return null;
  }
  
  const groupId = args[0];
  
  // Basic validation: group IDs are typically negative numbers
  if (!/^-?\d+$/.test(groupId)) {
    return null;
  }
  
  return groupId;
}

/**
 * Check if chat is a group or supergroup
 */
export function isGroupChat(ctx: Context): boolean {
  const chat = ctx.chat;
  return chat !== undefined && (chat.type === 'group' || chat.type === 'supergroup');
}

/**
 * Check if chat is private
 */
export function isPrivateChat(ctx: Context): boolean {
  const chat = ctx.chat;
  return chat !== undefined && chat.type === 'private';
}

/**
 * Get chat title safely
 */
export function getChatTitle(chat: any): string | null {
  return chat && 'title' in chat ? chat.title : null;
}

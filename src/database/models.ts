import db from './schema';

export interface User {
  id: number;
  telegram_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_bot: boolean;
  language_code: string | null;
  preferred_group_id: string | null;
  first_seen_at: string;
  last_interaction_at: string;
  interaction_count: number;
}

export interface Group {
  id: number;
  telegram_id: string;
  title: string | null;
  type: string | null;
  member_count: number | null;
  bot_added_at: string;
  last_activity_at: string;
  is_active: boolean;
}

export interface WelcomeMessage {
  id: number;
  group_id: string;
  message_text: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}


export interface GroupConfig {
  id: number;
  group_id: string;
  referral_message: string | null;
  live_trade_channel_message: string | null;
  admin_contacts_message: string | null;
  copy_trade_message: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WelcomeLog {
  id: number;
  group_id: string;
  user_id: string;
  message_sent: boolean;
  error_message: string | null;
  sent_at: string;
}

export interface ButtonClick {
  id: number;
  user_id: string;
  group_id: string | null;
  button_type: string;
  clicked_at: string;
}

export interface ConfigChangeLog {
  id: number;
  group_id: string;
  config_type: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_user_id: string;
  changed_at: string;
}

export interface UserPreferenceLog {
  id: number;
  user_id: string;
  group_id: string | null;
  action: 'set' | 'reset';
  changed_at: string;
}

export interface BroadcastLog {
  id: number;
  group_id: string;
  message_text: string;
  sent_by_user_id: string;
  success: boolean;
  error_message: string | null;
  sent_at: string;
}

export interface BotSetting {
  id: number;
  setting_key: string;
  setting_value: string | null;
  updated_at: string;
}

export const UserModel = {
  getByTelegramId: async (telegramId: string): Promise<User | undefined> => {
    const stmt = db.prepare('SELECT * FROM users WHERE telegram_id = ?');
    return await stmt.get(telegramId) as User | undefined;
  },

  createOrUpdate: async (telegramId: string, username: string | null, firstName: string | null, lastName: string | null, isBot: boolean = false, languageCode: string | null = null): Promise<void> => {
    const existing = await UserModel.getByTelegramId(telegramId);
    if (existing) {
      const stmt = db.prepare(`
        UPDATE users 
        SET username = ?, first_name = ?, last_name = ?, language_code = ?,
            last_interaction_at = CURRENT_TIMESTAMP, interaction_count = interaction_count + 1
        WHERE telegram_id = ?
      `);
      await stmt.run(username, firstName, lastName, languageCode, telegramId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO users (telegram_id, username, first_name, last_name, is_bot, language_code)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      await stmt.run(telegramId, username, firstName, lastName, isBot ? 1 : 0, languageCode);
    }
  },

  setPreferredGroup: async (telegramId: string, groupId: string | null): Promise<void> => {
    const stmt = db.prepare(`
      UPDATE users 
      SET preferred_group_id = ?
      WHERE telegram_id = ?
    `);
    await stmt.run(groupId, telegramId);
  },

  getPreferredGroup: async (telegramId: string): Promise<string | null> => {
    const user = await UserModel.getByTelegramId(telegramId);
    // Return user's preferred group if set, otherwise return global default
    if (user?.preferred_group_id) {
      return user.preferred_group_id;
    }
    return await BotSettingsModel.getDefaultPreferredGroup();
  },

  getAll: async (): Promise<User[]> => {
    const stmt = db.prepare('SELECT * FROM users ORDER BY last_interaction_at DESC');
    return await stmt.all() as User[];
  },
};

export const GroupModel = {
  getByTelegramId: async (telegramId: string): Promise<Group | undefined> => {
    const stmt = db.prepare('SELECT * FROM groups WHERE telegram_id = ?');
    return await stmt.get(telegramId) as Group | undefined;
  },

  createOrUpdate: async (telegramId: string, title: string | null, type: string | null): Promise<void> => {
    const stmt = db.prepare(`
      INSERT INTO groups (telegram_id, title, type, last_activity_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(telegram_id) DO UPDATE SET
        title = excluded.title,
        type = excluded.type,
        last_activity_at = CURRENT_TIMESTAMP
    `);
    await stmt.run(telegramId, title, type);
  },

  setActive: async (telegramId: string, isActive: boolean): Promise<void> => {
    const stmt = db.prepare(`
      UPDATE groups 
      SET is_active = ?, last_activity_at = CURRENT_TIMESTAMP
      WHERE telegram_id = ?
    `);
    await stmt.run(isActive ? 1 : 0, telegramId);
  },

  isActive: async (telegramId: string): Promise<boolean> => {
    const group = await GroupModel.getByTelegramId(telegramId);
    return group ? Boolean(group.is_active) : true;
  },

  getAll: async (): Promise<Group[]> => {
    const stmt = db.prepare('SELECT * FROM groups WHERE is_active = 1 ORDER BY last_activity_at DESC');
    return await stmt.all() as Group[];
  },
};

export const WelcomeMessageModel = {
  getByGroupId: async (groupId: string): Promise<WelcomeMessage | undefined> => {
    const stmt = db.prepare('SELECT * FROM welcome_messages WHERE group_id = ?');
    return await stmt.get(groupId) as WelcomeMessage | undefined;
  },

  createOrUpdate: async (groupId: string, messageText: string, updatedBy: string | null = null): Promise<void> => {
    // Ensure group exists in groups table (foreign key requirement)
    const group = await GroupModel.getByTelegramId(groupId);
    if (!group) {
      // Create group entry if it doesn't exist
      await GroupModel.createOrUpdate(groupId, null, 'group');
    }

    const existing = await WelcomeMessageModel.getByGroupId(groupId);
    if (existing) {
      const stmt = db.prepare(`
        UPDATE welcome_messages 
        SET message_text = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE group_id = ?
      `);
      await stmt.run(messageText, updatedBy, groupId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO welcome_messages (group_id, message_text, created_by_user_id, updated_by_user_id)
        VALUES (?, ?, ?, ?)
      `);
      await stmt.run(groupId, messageText, updatedBy, updatedBy);
    }
  },

  delete: async (groupId: string): Promise<void> => {
    const stmt = db.prepare('DELETE FROM welcome_messages WHERE group_id = ?');
    await stmt.run(groupId);
  },
};


export const GroupConfigModel = {
  getByGroupId: async (groupId: string): Promise<GroupConfig | undefined> => {
    const stmt = db.prepare('SELECT * FROM group_configs WHERE group_id = ?');
    return await stmt.get(groupId) as GroupConfig | undefined;
  },

  updateField: async (
    groupId: string, 
    fieldName: keyof Omit<GroupConfig, 'id' | 'group_id' | 'created_by_user_id' | 'updated_by_user_id' | 'created_at' | 'updated_at'>,
    value: string,
    updatedBy: string
  ): Promise<void> => {
    // Ensure group exists in groups table (foreign key requirement)
    const group = await GroupModel.getByTelegramId(groupId);
    if (!group) {
      // Create group entry if it doesn't exist
      await GroupModel.createOrUpdate(groupId, null, 'group');
    }

    const existing = await GroupConfigModel.getByGroupId(groupId);
    const oldValue = existing ? (existing[fieldName] as string | null) : null;
    
    if (existing) {
      const stmt = db.prepare(`
        UPDATE group_configs 
        SET ${fieldName} = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE group_id = ?
      `);
      await stmt.run(value, updatedBy, groupId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO group_configs (group_id, ${fieldName}, created_by_user_id, updated_by_user_id)
        VALUES (?, ?, ?, ?)
      `);
      await stmt.run(groupId, value, updatedBy, updatedBy);
    }
    
    // Log the change
    await ConfigChangeLogModel.create(groupId, 'group_config', fieldName, oldValue, value, updatedBy);
  },
};

export const WelcomeLogModel = {
  create: async (groupId: string, userId: string, messageSent: boolean = true, errorMessage: string | null = null): Promise<void> => {
    const stmt = db.prepare(`
      INSERT INTO welcome_logs (group_id, user_id, message_sent, error_message)
      VALUES (?, ?, ?, ?)
    `);
    await stmt.run(groupId, userId, messageSent ? 1 : 0, errorMessage);
  },

  getByGroupId: async (groupId: string, limit: number = 100): Promise<WelcomeLog[]> => {
    const stmt = db.prepare('SELECT * FROM welcome_logs WHERE group_id = ? ORDER BY sent_at DESC LIMIT ?');
    return await stmt.all(groupId, limit) as WelcomeLog[];
  },

  getStats: async (groupId: string): Promise<{ total: number; success: number; failed: number }> => {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN message_sent = 1 THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN message_sent = 0 THEN 1 ELSE 0 END) as failed
      FROM welcome_logs 
      WHERE group_id = ?
    `);
    const result = await stmt.get(groupId) as any;
    return {
      total: result.total || 0,
      success: result.success || 0,
      failed: result.failed || 0,
    };
  },
};

export const ButtonClickModel = {
  create: async (userId: string, buttonType: string, groupId: string | null = null): Promise<void> => {
    const stmt = db.prepare(`
      INSERT INTO button_clicks (user_id, group_id, button_type)
      VALUES (?, ?, ?)
    `);
    await stmt.run(userId, groupId, buttonType);
  },

  getStats: async (groupId: string | null = null, days: number = 30): Promise<{ button_type: string; count: number }[]> => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    let stmt;
    if (groupId) {
      stmt = db.prepare(`
        SELECT button_type, COUNT(*) as count
        FROM button_clicks
        WHERE group_id = ? AND clicked_at >= ?
        GROUP BY button_type
        ORDER BY count DESC
      `);
      return await stmt.all(groupId, cutoffDate.toISOString()) as { button_type: string; count: number }[];
    } else {
      stmt = db.prepare(`
        SELECT button_type, COUNT(*) as count
        FROM button_clicks
        WHERE clicked_at >= ?
        GROUP BY button_type
        ORDER BY count DESC
      `);
      return await stmt.all(cutoffDate.toISOString()) as { button_type: string; count: number }[];
    }
  },
};

export const ConfigChangeLogModel = {
  create: async (
    groupId: string,
    configType: string,
    fieldName: string,
    oldValue: string | null,
    newValue: string | null,
    changedBy: string
  ): Promise<void> => {
    const stmt = db.prepare(`
      INSERT INTO config_change_logs (group_id, config_type, field_name, old_value, new_value, changed_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    await stmt.run(groupId, configType, fieldName, oldValue, newValue, changedBy);
  },

  getByGroupId: async (groupId: string, limit: number = 100): Promise<ConfigChangeLog[]> => {
    const stmt = db.prepare(`
      SELECT * FROM config_change_logs 
      WHERE group_id = ? 
      ORDER BY changed_at DESC 
      LIMIT ?
    `);
    return await stmt.all(groupId, limit) as ConfigChangeLog[];
  },

  getByConfigType: async (groupId: string, configType: string, limit: number = 50): Promise<ConfigChangeLog[]> => {
    const stmt = db.prepare(`
      SELECT * FROM config_change_logs 
      WHERE group_id = ? AND config_type = ?
      ORDER BY changed_at DESC 
      LIMIT ?
    `);
    return await stmt.all(groupId, configType, limit) as ConfigChangeLog[];
  },

  getAll: async (limit: number = 500): Promise<ConfigChangeLog[]> => {
    const stmt = db.prepare(`
      SELECT * FROM config_change_logs 
      ORDER BY changed_at DESC 
      LIMIT ?
    `);
    return await stmt.all(limit) as ConfigChangeLog[];
  },
};

export const UserPreferenceLogModel = {
  create: async (userId: string, groupId: string | null, action: 'set' | 'reset'): Promise<void> => {
    const stmt = db.prepare(`
      INSERT INTO user_preference_logs (user_id, group_id, action)
      VALUES (?, ?, ?)
    `);
    await stmt.run(userId, groupId, action);
  },

  getByUserId: async (userId: string, limit: number = 100): Promise<UserPreferenceLog[]> => {
    const stmt = db.prepare(`
      SELECT * FROM user_preference_logs 
      WHERE user_id = ? 
      ORDER BY changed_at DESC 
      LIMIT ?
    `);
    return await stmt.all(userId, limit) as UserPreferenceLog[];
  },

  getAll: async (limit: number = 500): Promise<UserPreferenceLog[]> => {
    const stmt = db.prepare(`
      SELECT * FROM user_preference_logs 
      ORDER BY changed_at DESC 
      LIMIT ?
    `);
    return await stmt.all(limit) as UserPreferenceLog[];
  },
};

export const BroadcastLogModel = {
  create: async (
    groupId: string,
    messageText: string,
    sentBy: string,
    success: boolean = true,
    errorMessage: string | null = null
  ): Promise<void> => {
    const stmt = db.prepare(`
      INSERT INTO broadcast_logs (group_id, message_text, sent_by_user_id, success, error_message)
      VALUES (?, ?, ?, ?, ?)
    `);
    await stmt.run(groupId, messageText, sentBy, success ? 1 : 0, errorMessage);
  },

  getByGroupId: async (groupId: string, limit: number = 100): Promise<BroadcastLog[]> => {
    const stmt = db.prepare(`
      SELECT * FROM broadcast_logs 
      WHERE group_id = ? 
      ORDER BY sent_at DESC 
      LIMIT ?
    `);
    return await stmt.all(groupId, limit) as BroadcastLog[];
  },

  getBySentBy: async (userId: string, limit: number = 100): Promise<BroadcastLog[]> => {
    const stmt = db.prepare(`
      SELECT * FROM broadcast_logs 
      WHERE sent_by_user_id = ? 
      ORDER BY sent_at DESC 
      LIMIT ?
    `);
    return await stmt.all(userId, limit) as BroadcastLog[];
  },

  getStats: async (groupId: string | null = null): Promise<{ total: number; success: number; failed: number }> => {
    let stmt;
    let result;
    
    if (groupId) {
      stmt = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed
        FROM broadcast_logs 
        WHERE group_id = ?
      `);
      result = await stmt.get(groupId) as any;
    } else {
      stmt = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed
        FROM broadcast_logs
      `);
      result = await stmt.get() as any;
    }
    
    return {
      total: result.total || 0,
      success: result.success || 0,
      failed: result.failed || 0,
    };
  },

  getAll: async (limit: number = 500): Promise<BroadcastLog[]> => {
    const stmt = db.prepare(`
      SELECT * FROM broadcast_logs 
      ORDER BY sent_at DESC 
      LIMIT ?
    `);
    return await stmt.all(limit) as BroadcastLog[];
  },
};

export const BotSettingsModel = {
  get: async (key: string): Promise<string | null> => {
    const stmt = db.prepare('SELECT setting_value FROM bot_settings WHERE setting_key = ?');
    const result = await stmt.get(key) as { setting_value: string | null } | undefined;
    return result?.setting_value || null;
  },

  set: async (key: string, value: string | null): Promise<void> => {
    const stmt = db.prepare(`
      INSERT INTO bot_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = CURRENT_TIMESTAMP
    `);
    await stmt.run(key, value);
  },

  getDefaultPreferredGroup: async (): Promise<string | null> => {
    return await BotSettingsModel.get('default_preferred_group_id');
  },

  setDefaultPreferredGroup: async (groupId: string | null): Promise<void> => {
    await BotSettingsModel.set('default_preferred_group_id', groupId);
  },
};

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

export const UserModel = {
  getByTelegramId: (telegramId: string): User | undefined => {
    const stmt = db.prepare('SELECT * FROM users WHERE telegram_id = ?');
    return stmt.get(telegramId) as User | undefined;
  },

  createOrUpdate: (telegramId: string, username: string | null, firstName: string | null, lastName: string | null, isBot: boolean = false, languageCode: string | null = null): void => {
    const existing = UserModel.getByTelegramId(telegramId);
    if (existing) {
      const stmt = db.prepare(`
        UPDATE users 
        SET username = ?, first_name = ?, last_name = ?, language_code = ?,
            last_interaction_at = CURRENT_TIMESTAMP, interaction_count = interaction_count + 1
        WHERE telegram_id = ?
      `);
      stmt.run(username, firstName, lastName, languageCode, telegramId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO users (telegram_id, username, first_name, last_name, is_bot, language_code)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(telegramId, username, firstName, lastName, isBot ? 1 : 0, languageCode);
    }
  },

  setPreferredGroup: (telegramId: string, groupId: string | null): void => {
    const stmt = db.prepare(`
      UPDATE users 
      SET preferred_group_id = ?
      WHERE telegram_id = ?
    `);
    stmt.run(groupId, telegramId);
  },

  getPreferredGroup: (telegramId: string): string | null => {
    const user = UserModel.getByTelegramId(telegramId);
    return user?.preferred_group_id || null;
  },

  getAll: (): User[] => {
    const stmt = db.prepare('SELECT * FROM users ORDER BY last_interaction_at DESC');
    return stmt.all() as User[];
  },
};

export const GroupModel = {
  getByTelegramId: (telegramId: string): Group | undefined => {
    const stmt = db.prepare('SELECT * FROM groups WHERE telegram_id = ?');
    return stmt.get(telegramId) as Group | undefined;
  },

  createOrUpdate: (telegramId: string, title: string | null, type: string | null): void => {
    const stmt = db.prepare(`
      INSERT INTO groups (telegram_id, title, type, last_activity_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(telegram_id) DO UPDATE SET
        title = excluded.title,
        type = excluded.type,
        last_activity_at = CURRENT_TIMESTAMP
    `);
    stmt.run(telegramId, title, type);
  },

  setActive: (telegramId: string, isActive: boolean): void => {
    const stmt = db.prepare(`
      UPDATE groups 
      SET is_active = ?, last_activity_at = CURRENT_TIMESTAMP
      WHERE telegram_id = ?
    `);
    stmt.run(isActive ? 1 : 0, telegramId);
  },

  isActive: (telegramId: string): boolean => {
    const group = GroupModel.getByTelegramId(telegramId);
    return group ? Boolean(group.is_active) : true;
  },

  getAll: (): Group[] => {
    const stmt = db.prepare('SELECT * FROM groups WHERE is_active = 1 ORDER BY last_activity_at DESC');
    return stmt.all() as Group[];
  },
};

export const WelcomeMessageModel = {
  getByGroupId: (groupId: string): WelcomeMessage | undefined => {
    const stmt = db.prepare('SELECT * FROM welcome_messages WHERE group_id = ?');
    return stmt.get(groupId) as WelcomeMessage | undefined;
  },

  createOrUpdate: (groupId: string, messageText: string, updatedBy: string | null = null): void => {
    // Ensure group exists in groups table (foreign key requirement)
    const group = GroupModel.getByTelegramId(groupId);
    if (!group) {
      // Create group entry if it doesn't exist
      GroupModel.createOrUpdate(groupId, null, 'group');
    }

    const existing = WelcomeMessageModel.getByGroupId(groupId);
    if (existing) {
      const stmt = db.prepare(`
        UPDATE welcome_messages 
        SET message_text = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE group_id = ?
      `);
      stmt.run(messageText, updatedBy, groupId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO welcome_messages (group_id, message_text, created_by_user_id, updated_by_user_id)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(groupId, messageText, updatedBy, updatedBy);
    }
  },

  delete: (groupId: string): void => {
    const stmt = db.prepare('DELETE FROM welcome_messages WHERE group_id = ?');
    stmt.run(groupId);
  },
};


export const GroupConfigModel = {
  getByGroupId: (groupId: string): GroupConfig | undefined => {
    const stmt = db.prepare('SELECT * FROM group_configs WHERE group_id = ?');
    return stmt.get(groupId) as GroupConfig | undefined;
  },

  updateField: (
    groupId: string, 
    fieldName: keyof Omit<GroupConfig, 'id' | 'group_id' | 'created_by_user_id' | 'updated_by_user_id' | 'created_at' | 'updated_at'>,
    value: string,
    updatedBy: string
  ): void => {
    // Ensure group exists in groups table (foreign key requirement)
    const group = GroupModel.getByTelegramId(groupId);
    if (!group) {
      // Create group entry if it doesn't exist
      GroupModel.createOrUpdate(groupId, null, 'group');
    }

    const existing = GroupConfigModel.getByGroupId(groupId);
    const oldValue = existing ? (existing[fieldName] as string | null) : null;
    
    if (existing) {
      const stmt = db.prepare(`
        UPDATE group_configs 
        SET ${fieldName} = ?, updated_by_user_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE group_id = ?
      `);
      stmt.run(value, updatedBy, groupId);
    } else {
      const stmt = db.prepare(`
        INSERT INTO group_configs (group_id, ${fieldName}, created_by_user_id, updated_by_user_id)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run(groupId, value, updatedBy, updatedBy);
    }
    
    // Log the change
    ConfigChangeLogModel.create(groupId, 'group_config', fieldName, oldValue, value, updatedBy);
  },
};

export const WelcomeLogModel = {
  create: (groupId: string, userId: string, messageSent: boolean = true, errorMessage: string | null = null): void => {
    const stmt = db.prepare(`
      INSERT INTO welcome_logs (group_id, user_id, message_sent, error_message)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(groupId, userId, messageSent ? 1 : 0, errorMessage);
  },

  getByGroupId: (groupId: string, limit: number = 100): WelcomeLog[] => {
    const stmt = db.prepare('SELECT * FROM welcome_logs WHERE group_id = ? ORDER BY sent_at DESC LIMIT ?');
    return stmt.all(groupId, limit) as WelcomeLog[];
  },

  getStats: (groupId: string): { total: number; success: number; failed: number } => {
    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN message_sent = 1 THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN message_sent = 0 THEN 1 ELSE 0 END) as failed
      FROM welcome_logs 
      WHERE group_id = ?
    `);
    const result = stmt.get(groupId) as any;
    return {
      total: result.total || 0,
      success: result.success || 0,
      failed: result.failed || 0,
    };
  },
};

export const ButtonClickModel = {
  create: (userId: string, buttonType: string, groupId: string | null = null): void => {
    const stmt = db.prepare(`
      INSERT INTO button_clicks (user_id, group_id, button_type)
      VALUES (?, ?, ?)
    `);
    stmt.run(userId, groupId, buttonType);
  },

  getStats: (groupId: string | null = null, days: number = 30): { button_type: string; count: number }[] => {
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
      return stmt.all(groupId, cutoffDate.toISOString()) as { button_type: string; count: number }[];
    } else {
      stmt = db.prepare(`
        SELECT button_type, COUNT(*) as count
        FROM button_clicks
        WHERE clicked_at >= ?
        GROUP BY button_type
        ORDER BY count DESC
      `);
      return stmt.all(cutoffDate.toISOString()) as { button_type: string; count: number }[];
    }
  },
};

export const ConfigChangeLogModel = {
  create: (
    groupId: string,
    configType: string,
    fieldName: string,
    oldValue: string | null,
    newValue: string | null,
    changedBy: string
  ): void => {
    const stmt = db.prepare(`
      INSERT INTO config_change_logs (group_id, config_type, field_name, old_value, new_value, changed_by_user_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(groupId, configType, fieldName, oldValue, newValue, changedBy);
  },

  getByGroupId: (groupId: string, limit: number = 100): ConfigChangeLog[] => {
    const stmt = db.prepare(`
      SELECT * FROM config_change_logs 
      WHERE group_id = ? 
      ORDER BY changed_at DESC 
      LIMIT ?
    `);
    return stmt.all(groupId, limit) as ConfigChangeLog[];
  },

  getByConfigType: (groupId: string, configType: string, limit: number = 50): ConfigChangeLog[] => {
    const stmt = db.prepare(`
      SELECT * FROM config_change_logs 
      WHERE group_id = ? AND config_type = ?
      ORDER BY changed_at DESC 
      LIMIT ?
    `);
    return stmt.all(groupId, configType, limit) as ConfigChangeLog[];
  },

  getAll: (limit: number = 500): ConfigChangeLog[] => {
    const stmt = db.prepare(`
      SELECT * FROM config_change_logs 
      ORDER BY changed_at DESC 
      LIMIT ?
    `);
    return stmt.all(limit) as ConfigChangeLog[];
  },
};

export const UserPreferenceLogModel = {
  create: (userId: string, groupId: string | null, action: 'set' | 'reset'): void => {
    const stmt = db.prepare(`
      INSERT INTO user_preference_logs (user_id, group_id, action)
      VALUES (?, ?, ?)
    `);
    stmt.run(userId, groupId, action);
  },

  getByUserId: (userId: string, limit: number = 100): UserPreferenceLog[] => {
    const stmt = db.prepare(`
      SELECT * FROM user_preference_logs 
      WHERE user_id = ? 
      ORDER BY changed_at DESC 
      LIMIT ?
    `);
    return stmt.all(userId, limit) as UserPreferenceLog[];
  },

  getAll: (limit: number = 500): UserPreferenceLog[] => {
    const stmt = db.prepare(`
      SELECT * FROM user_preference_logs 
      ORDER BY changed_at DESC 
      LIMIT ?
    `);
    return stmt.all(limit) as UserPreferenceLog[];
  },
};

export const BroadcastLogModel = {
  create: (
    groupId: string,
    messageText: string,
    sentBy: string,
    success: boolean = true,
    errorMessage: string | null = null
  ): void => {
    const stmt = db.prepare(`
      INSERT INTO broadcast_logs (group_id, message_text, sent_by_user_id, success, error_message)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(groupId, messageText, sentBy, success ? 1 : 0, errorMessage);
  },

  getByGroupId: (groupId: string, limit: number = 100): BroadcastLog[] => {
    const stmt = db.prepare(`
      SELECT * FROM broadcast_logs 
      WHERE group_id = ? 
      ORDER BY sent_at DESC 
      LIMIT ?
    `);
    return stmt.all(groupId, limit) as BroadcastLog[];
  },

  getBySentBy: (userId: string, limit: number = 100): BroadcastLog[] => {
    const stmt = db.prepare(`
      SELECT * FROM broadcast_logs 
      WHERE sent_by_user_id = ? 
      ORDER BY sent_at DESC 
      LIMIT ?
    `);
    return stmt.all(userId, limit) as BroadcastLog[];
  },

  getStats: (groupId: string | null = null): { total: number; success: number; failed: number } => {
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
      result = stmt.get(groupId) as any;
    } else {
      stmt = db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed
        FROM broadcast_logs
      `);
      result = stmt.get() as any;
    }
    
    return {
      total: result.total || 0,
      success: result.success || 0,
      failed: result.failed || 0,
    };
  },

  getAll: (limit: number = 500): BroadcastLog[] => {
    const stmt = db.prepare(`
      SELECT * FROM broadcast_logs 
      ORDER BY sent_at DESC 
      LIMIT ?
    `);
    return stmt.all(limit) as BroadcastLog[];
  },
};

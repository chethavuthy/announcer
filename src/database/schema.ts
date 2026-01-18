import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Use /tmp on Vercel, local directory otherwise
const isVercel = process.env.VERCEL === '1';
const dbPath = process.env.DATABASE_PATH || 
  (isVercel ? '/tmp/bot.db' : path.join(process.cwd(), 'bot.db'));

// Ensure directory exists
if (!isVercel) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const db: DatabaseType = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- Users table: Track all users who interact with the bot
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT NOT NULL UNIQUE,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    is_bot BOOLEAN NOT NULL DEFAULT 0,
    language_code TEXT,
    preferred_group_id TEXT,
    first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_interaction_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    interaction_count INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (preferred_group_id) REFERENCES groups(telegram_id) ON DELETE SET NULL
  );

  -- Groups table: Track all groups where the bot is added
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT NOT NULL UNIQUE,
    title TEXT,
    type TEXT CHECK(type IN ('group', 'supergroup', 'channel')),
    member_count INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    bot_added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_activity_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Welcome messages: Custom welcome message per group
  CREATE TABLE IF NOT EXISTS welcome_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL UNIQUE,
    message_text TEXT NOT NULL,
    created_by_user_id TEXT,
    updated_by_user_id TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(telegram_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(telegram_id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(telegram_id) ON DELETE SET NULL
  );

  -- Group configs: Custom messages per group
  CREATE TABLE IF NOT EXISTS group_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL UNIQUE,
    referral_message TEXT,
    live_trade_channel_message TEXT,
    admin_contacts_message TEXT,
    copy_trade_message TEXT,
    created_by_user_id TEXT,
    updated_by_user_id TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(telegram_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(telegram_id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by_user_id) REFERENCES users(telegram_id) ON DELETE SET NULL
  );

  -- Welcome logs: Track when welcome messages are sent
  CREATE TABLE IF NOT EXISTS welcome_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    message_sent BOOLEAN NOT NULL DEFAULT 1,
    error_message TEXT,
    sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(telegram_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE
  );

  -- Button clicks: Track button interactions for analytics
  CREATE TABLE IF NOT EXISTS button_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    group_id TEXT,
    button_type TEXT NOT NULL CHECK(button_type IN ('referral_link', 'live_trade_channel', 'contact_admin', 'copy_trade')),
    clicked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(telegram_id) ON DELETE SET NULL
  );

  -- Config change logs: Audit trail for all configuration changes
  CREATE TABLE IF NOT EXISTS config_change_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL,
    config_type TEXT NOT NULL CHECK(config_type IN ('group_config', 'welcome_message')),
    field_name TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by_user_id TEXT NOT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(telegram_id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by_user_id) REFERENCES users(telegram_id) ON DELETE CASCADE
  );

  -- User preference logs: Track when users link/unlink from groups
  CREATE TABLE IF NOT EXISTS user_preference_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    group_id TEXT,
    action TEXT NOT NULL CHECK(action IN ('set', 'reset')),
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(telegram_id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES groups(telegram_id) ON DELETE SET NULL
  );

  -- Broadcast logs: Track broadcast messages sent to groups
  CREATE TABLE IF NOT EXISTS broadcast_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id TEXT NOT NULL,
    message_text TEXT NOT NULL,
    sent_by_user_id TEXT NOT NULL,
    success BOOLEAN NOT NULL DEFAULT 1,
    error_message TEXT,
    sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(telegram_id) ON DELETE CASCADE,
    FOREIGN KEY (sent_by_user_id) REFERENCES users(telegram_id) ON DELETE CASCADE
  );
`);

// Create indexes (only for non-unique columns that are frequently queried)
db.exec(`
  -- Users indexes
  CREATE INDEX IF NOT EXISTS idx_users_last_interaction ON users(last_interaction_at DESC);
  CREATE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
  
  -- Groups indexes
  CREATE INDEX IF NOT EXISTS idx_groups_is_active ON groups(is_active) WHERE is_active = 1;
  CREATE INDEX IF NOT EXISTS idx_groups_last_activity ON groups(last_activity_at DESC);
  
  -- Welcome logs indexes (for analytics)
  CREATE INDEX IF NOT EXISTS idx_welcome_logs_group_user ON welcome_logs(group_id, user_id);
  CREATE INDEX IF NOT EXISTS idx_welcome_logs_sent_at ON welcome_logs(sent_at DESC);
  CREATE INDEX IF NOT EXISTS idx_welcome_logs_group_sent ON welcome_logs(group_id, sent_at DESC);
  
  -- Button clicks indexes (for analytics)
  CREATE INDEX IF NOT EXISTS idx_button_clicks_user_type ON button_clicks(user_id, button_type);
  CREATE INDEX IF NOT EXISTS idx_button_clicks_clicked_at ON button_clicks(clicked_at DESC);
  CREATE INDEX IF NOT EXISTS idx_button_clicks_type_clicked ON button_clicks(button_type, clicked_at DESC);
  
  -- Config change logs indexes (for audit trail)
  CREATE INDEX IF NOT EXISTS idx_config_logs_group_changed ON config_change_logs(group_id, changed_at DESC);
  CREATE INDEX IF NOT EXISTS idx_config_logs_type_changed ON config_change_logs(config_type, changed_at DESC);
  CREATE INDEX IF NOT EXISTS idx_config_logs_changed_by ON config_change_logs(changed_by_user_id, changed_at DESC);
  
  -- User preference logs indexes
  CREATE INDEX IF NOT EXISTS idx_user_pref_logs_user ON user_preference_logs(user_id, changed_at DESC);
  CREATE INDEX IF NOT EXISTS idx_user_pref_logs_group ON user_preference_logs(group_id, changed_at DESC) WHERE group_id IS NOT NULL;
  
  -- Broadcast logs indexes
  CREATE INDEX IF NOT EXISTS idx_broadcast_logs_group ON broadcast_logs(group_id, sent_at DESC);
  CREATE INDEX IF NOT EXISTS idx_broadcast_logs_sent_by ON broadcast_logs(sent_by_user_id, sent_at DESC);
  CREATE INDEX IF NOT EXISTS idx_broadcast_logs_success ON broadcast_logs(success, sent_at DESC);
`);

export default db;

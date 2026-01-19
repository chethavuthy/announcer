# Telegram Support Bot

A feature-rich Telegram bot for group management with customizable welcome messages, admin controls, and interactive buttons.

## Features

- ✅ Automatic welcome messages when new users join groups
- ✅ Per-group configuration system via private chat commands
- ✅ Dynamic message variables: `{{name}}` and `{{username}}`
- ✅ Inline buttons for groups (2x2 layout): Referral Link, Live Trade Channel, Contact Admin, Copy Trade
- ✅ Keyboard buttons for private chats (2x2 layout)
- ✅ **User preference system** - Link private chat to a specific group's config
- ✅ **Broadcast messages** - Send announcements to specific groups
- ✅ Per-group custom messages for all buttons
- ✅ **Customizable messages for each button** - Create unique messages per group
- ✅ Comprehensive analytics and logging system
- ✅ Audit trail for all configuration changes
- ✅ SQLite database for persistent storage
- ✅ Input validation and data integrity checks
- ✅ Optimized codebase with helper utilities
- ✅ Vercel-ready deployment

## Database Schema

### `users` table

Tracks all users who interact with the bot

- `id` - Primary key
- `telegram_id` - Telegram user ID (unique)
- `username` - Telegram username
- `first_name` - User's first name
- `last_name` - User's last name
- `is_bot` - Boolean flag if user is a bot
- `language_code` - User's language code
- `preferred_group_id` - Group ID for private chat config (foreign key to groups)
- `first_seen_at` - First interaction timestamp
- `last_interaction_at` - Last interaction timestamp
- `interaction_count` - Total number of interactions

### `groups` table

Tracks all groups where the bot is added

- `id` - Primary key
- `telegram_id` - Telegram group ID (unique)
- `title` - Group title/name
- `type` - Group type (group, supergroup, channel)
- `member_count` - Number of members (if available)
- `is_active` - Boolean flag for group status (default: true)
- `bot_added_at` - When bot was added to group
- `last_activity_at` - Last activity in group

### `welcome_messages` table

Custom welcome message per group

- `id` - Primary key
- `group_id` - Telegram group ID (unique)
- `message_text` - Custom welcome message template
- `created_by_user_id` - Telegram ID of user who created (foreign key to users)
- `updated_by_user_id` - Telegram ID of user who last updated (foreign key to users)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### `group_configs` table

Custom messages per group for each button

- `id` - Primary key
- `group_id` - Telegram group ID (unique)
- `referral_message` - Custom message for referral button
- `live_trade_channel_message` - Custom message for live trade button
- `admin_contacts_message` - Custom message for admin contact button
- `copy_trade_message` - Custom message for copy trade button
- `created_by_user_id` - Telegram ID of user who created (foreign key to users)
- `updated_by_user_id` - Telegram ID of user who last updated (foreign key to users)
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### `welcome_logs` table

Tracks when welcome messages are sent (for analytics)

- `id` - Primary key
- `group_id` - Telegram group ID (foreign key to groups)
- `user_id` - Telegram user ID who joined (foreign key to users)
- `message_sent` - Boolean flag if message was sent successfully
- `error_message` - Error message if sending failed
- `sent_at` - Timestamp when message was sent/attempted

### `button_clicks` table

Tracks button interactions for analytics

- `id` - Primary key
- `user_id` - Telegram user ID who clicked (foreign key to users)
- `group_id` - Telegram group ID (optional, for group context)
- `button_type` - Type of button clicked (referral_link, live_trade_channel, contact_admin, copy_trade)
- `clicked_at` - Timestamp when button was clicked

### `config_change_logs` table

Audit trail for all configuration changes

- `id` - Primary key
- `group_id` - Telegram group ID
- `config_type` - Type of configuration (group_config, welcome_message)
- `field_name` - Name of the field changed
- `old_value` - Previous value
- `new_value` - New value
- `changed_by_user_id` - Telegram ID of user who made the change (foreign key to users)
- `changed_at` - Timestamp of the change

### `user_preference_logs` table

Track when users link/unlink from groups

- `id` - Primary key
- `user_id` - Telegram user ID (foreign key to users)
- `group_id` - Group ID linked to (foreign key to groups, NULL for reset)
- `action` - Action performed (set, reset)
- `changed_at` - Change timestamp

### `broadcast_logs` table

Track broadcast messages sent to groups

- `id` - Primary key
- `group_id` - Telegram group ID (foreign key to groups)
- `message_text` - Broadcast message content
- `sent_by_user_id` - Admin who sent the broadcast (foreign key to users)
- `success` - Boolean flag for successful delivery
- `error_message` - Error message if failed
- `sent_at` - Sent timestamp

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env` file with default values (can be overridden per-group via config commands):

```env
BOT_TOKEN=your_telegram_bot_token_here
ADMIN_IDS=123456789,987654321
SUPER_ADMIN_ID=123456789

# Turso Database (for production on Vercel)
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token

# Default messages (optional - can be configured per group)
# Use {{name}} for user's first name and {{username}} for @username
WELCOME_MESSAGE=Welcome {{name}}! 🎉\n\nJoin our community and start trading!
REFERRAL_MESSAGE=🔗 Referral Link: https://example.com/ref\n\nJoin using the link above, {{name}}!
LIVE_TRADE_MESSAGE=📊 Live Trade Channel: https://t.me/livetradechannel\n\nFollow our live trades, {{name}}!
ADMIN_MESSAGE=💬 Contact Admin: https://t.me/admin\n\nReach out for support, {{name}}!
COPY_TRADE_MESSAGE=📈 Copy Trade: https://example.com/copytrade\n\nStart copying trades now, {{name}}!

# Legacy env vars (still supported for backward compatibility)
REFERRAL_LINK=https://example.com/ref
LIVE_TRADE_CHANNEL=@livetradechannel
ADMIN_USERNAME=@admin
COPY_TRADE_LINK=https://example.com/copytrade
```

```env
BOT_TOKEN=your_telegram_bot_token_here
ADMIN_IDS=123456789,987654321
SUPER_ADMIN_ID=123456789

# Optional - Default messages (can be customized per group via bot commands)
WELCOME_MESSAGE=Welcome {{name}}! 🎉\n\nJoin our community!
REFERRAL_MESSAGE=🔗 Referral Link: https://example.com/ref
LIVE_TRADE_MESSAGE=📊 Live Trade: https://t.me/channel
ADMIN_MESSAGE=💬 Contact Admin: https://t.me/admin
COPY_TRADE_MESSAGE=📈 Copy Trade: https://example.com/copytrade
```

### For Production (Vercel)

Add these environment variables in Vercel Dashboard → Settings → Environment Variables:

```env
# Required
BOT_TOKEN=your_telegram_bot_token
ADMIN_IDS=123456789,987654321
SUPER_ADMIN_ID=123456789

# Turso Database (Required for production)
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token

# Optional - Default messages
WELCOME_MESSAGE=Welcome {{name}}! 🎉
# ... (same as local)
```

### Environment Variables Explained

**Required:**
- `BOT_TOKEN` - Get from [@BotFather](https://t.me/BotFather)
- `ADMIN_IDS` - Comma-separated Telegram user IDs who can use config commands
- `SUPER_ADMIN_ID` - Single Telegram user ID who can use `/setgroup` command

**Production Only:**
- `TURSO_DATABASE_URL` - Your Turso database URL (from `turso db show <db-name> --url`)
- `TURSO_AUTH_TOKEN` - Your Turso auth token (from `turso db tokens create <db-name>`)

**Optional:**
- All message variables support `{{name}}` (user's first name) and `{{username}}` (user's @username)
- Can be customized per-group using bot commands

### 3. Get Your Bot Token

1. Talk to [@BotFather](https://t.me/botfather) on Telegram
2. Create a new bot with `/newbot`
3. Copy the bot token to your `.env` file

### 4. Get Admin IDs, Super Admin ID, and Group IDs

**Get Your Admin User ID:**
1. Talk to [@userinfobot](https://t.me/userinfobot) on Telegram
2. Send any message to it
3. Copy your Telegram user ID
4. Add it to `ADMIN_IDS` in `.env` (comma-separated for multiple admins)
5. Set one admin as super admin in `SUPER_ADMIN_ID` (only super admin can use `/setgroup`)

**Example:**
```env
ADMIN_IDS=123456789,987654321
SUPER_ADMIN_ID=123456789
```

**Get Group ID (for configuration):**
1. Add the bot to your Telegram group
2. Add [@userinfobot](https://t.me/userinfobot) to the same group
3. Forward any message from the group to @userinfobot
4. It will show you the group ID (e.g., -1001234567890)

### 5. Run Locally

```bash
npm run dev
```

### 6. Build for Production

```bash
npm run build
npm start
```

## Usage

### In Groups

1. Add the bot to your Telegram group
2. Make the bot an admin (optional, but recommended)
3. When new users join, they'll receive a welcome message with inline buttons

### Admin Commands (Private Chat Only)

All configuration commands must be used in **private chat** with the bot. Each group has its own independent configuration.

#### Available Commands

- `/config` - Display all available configuration commands

**Configuration Commands:**
- `/welcome_message <group_id>` - Set custom welcome message
- `/referral <group_id>` - Set referral button message
- `/live_trade <group_id>` - Set live trade button message
- `/admin_contacts <group_id>` - Set admin contact button message
- `/copy_trade <group_id>` - Set copy trade button message

**Available Variables (for all commands):**
- `{{name}}` - User's first name
- `{{username}}` - User's @username (with @)

#### Usage Flow

1. **Get group ID** (see setup instructions above)
2. **Send config command** in private chat with bot
3. **Reply with your custom message** (can use `{{name}}` and `{{username}}` variables)
4. **Confirmation** - Bot confirms the update

Type `/cancel` at any time to cancel the configuration.

#### Example Sessions

**Welcome Message:**

```text
You: /welcome_message -1001234567890
Bot: 📝 Current Welcome Message: Welcome {{name}}! 🎉...
     Please reply with your new welcome message.
     Variables:
     • {{name}} - User's first name
     • {{username}} - User's @username

You: Hello {{name}}! Welcome to our trading group! 🚀
Bot: ✅ Welcome message updated for group -1001234567890!
```

**Referral Button Message:**

```text
You: /referral -1001234567890
Bot: 🔗 Current Referral Message: 🔗 Referral Link...
     Please reply with your new referral message.
     Variables:
     • {{name}} - User's first name
     • {{username}} - User's @username

You: Hey {{name}}! 🔗 Use my referral link:
     https://mytrading.com/signup?ref=abc123
     
     Get 50% bonus on first deposit!
Bot: ✅ Referral message updated for group -1001234567890!
```

### Private Chat (For All Users)

Any user can chat with the bot privately. The bot displays a 2x2 keyboard with buttons:

**Row 1:**
- 🔗 Link Referral | 📊 Live Trade Channel

**Row 2:**
- 💬 Contact Admin | 📈 Copy Trade

#### Link Private Chat to a Group (Super Admin Only)

The super admin can link their private chat to a specific group to receive that group's custom messages:

- `/setgroup <group_id>` - Link your private chat to a group
- `/setgroup` - Check current linked group
- `/setgroup reset` - Unlink and use default messages

**Example:**
```
/setgroup -1001234567890
✅ Private Chat Linked!
You will see custom messages from this group when using keyboard buttons.
```

**Note:** This command is restricted to the super admin only (configured in `SUPER_ADMIN_ID` environment variable).

## Broadcast Messages (Admin Only)

Send announcements to specific groups:

**Command:**
```
/broadcast <group_id>
```

**Example Session:**
```text
You: /broadcast -1001234567890
Bot: 📢 Broadcast to Group -1001234567890
     Please reply with your broadcast message.
     Variables:
     • {{name}} - User's first name
     • {{username}} - User's @username

You: 🎉 Big announcement! New trading features coming soon!
Bot: ✅ Broadcast sent successfully to group -1001234567890!
```

**Note:** All broadcasts are logged in the database for auditing.

## Database

The bot uses **SQLite** for local development and **Turso** (serverless SQLite) for production on Vercel.

### Local Development

- **Database file:** `bot.db` in project root
- **Auto-created:** On first run
- **No setup required:** Just run the bot
- **Reset database:** `npm run reset-db`

### Production (Vercel)

- **Database:** Turso (serverless SQLite)
- **Persistent:** Data survives redeployments
- **Global:** Distributed edge database
- **Free tier:** 9GB storage, 1B row reads/month
- **Required:** `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` environment variables

### How It Works

```
Development → Detects local environment → Uses bot.db
Production  → Detects Vercel → Uses Turso (if env vars set)
```

The same code runs in both environments. The database layer (`src/database/connection.ts`) automatically switches between local SQLite and Turso based on the environment.

## Project Structure

```
.
├── src/
│   ├── database/
│   │   ├── connection.ts     # Database connection layer (SQLite/Turso)
│   │   ├── schema.ts         # Database schema and initialization
│   │   └── models.ts         # Database models and queries (async)
│   ├── handlers/
│   │   ├── welcome.ts        # Welcome message handler for new members
│   │   ├── config.ts         # Configuration commands handler
│   │   ├── broadcast.ts      # Broadcast message handler (admin only)
│   │   ├── userPreferences.ts # User preference handler (super admin)
│   │   ├── buttons.ts        # Button click handler
│   │   └── private.ts        # Private chat handler
│   ├── utils/
│   │   ├── admin.ts          # Admin and super admin authorization
│   │   ├── buttons.ts        # Button configurations (inline & keyboard)
│   │   ├── messageParser.ts  # Message template parser ({{name}}, {{username}})
│   │   ├── state.ts          # State management for config sessions
│   │   ├── defaults.ts       # Default message templates utility
│   │   └── validation.ts     # Input validation and data integrity helpers
│   └── index.ts              # Main bot file (local/dev)
├── api/
│   └── index.ts              # Vercel serverless function (production)
├── scripts/
│   ├── set-webhook.js        # Helper script to set Telegram webhook
│   └── reset-db.js           # Reset local database
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── vercel.json               # Vercel deployment configuration
├── .env.example              # Environment variables template
└── README.md                 # This file
```

## Success Checklist

After deployment, verify:

- ✅ Vercel build completes without errors
- ✅ Turso database created and accessible
- ✅ Environment variables set in Vercel
- ✅ Webhook set to Vercel URL
- ✅ Webhook status shows `pending_update_count: 0`
- ✅ Bot responds to `/start` in private chat
- ✅ Bot sends welcome message to new group members
- ✅ Inline buttons work in groups
- ✅ Keyboard buttons work in private chat
- ✅ Admin commands work (test `/config`)
- ✅ Data persists in Turso (check dashboard)
- ✅ Vercel logs show "Using Turso database for production"
- ✅ No errors in Vercel function logs

## Performance

### Response Times

- **Local development:** <50ms (local SQLite)
- **Production (warm):** 50-150ms (Turso + Vercel)
- **Production (cold start):** 2-3 seconds (first request)

### Scalability

- **Turso:** Up to 1000 req/s on free plan
- **Vercel:** 100 GB-hours/month on free plan
- **Telegram:** No rate limits for bots

### Costs

**Free tier includes:**
- Turso: 9 GB storage, 1B row reads/month
- Vercel: 100 GB-hours compute, unlimited requests
- Telegram: Free forever

**Estimated capacity:**
- ~10,000 active users
- ~100 active groups
- ~1M messages/month
- All within free tier limits

## Support & Resources

### Documentation
- **Telegram Bot API:** https://core.telegram.org/bots/api
- **Turso Docs:** https://docs.turso.tech
- **Vercel Docs:** https://vercel.com/docs
- **Telegraf:** https://telegraf.js.org

### Useful Bots
- **@BotFather:** Create and manage bots
- **@userinfobot:** Get user and group IDs

### Database Tools
- **Turso CLI:** Manage databases from terminal
- **Turso Web Console:** View data in browser

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally and on Vercel
5. Submit a pull request

## Security

- Never commit `.env` file
- Keep bot token secret
- Rotate tokens if exposed
- Use `SUPER_ADMIN_ID` for sensitive commands
- Validate all user inputs

## License

MIT

import { InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup } from 'telegraf/types';

/**
 * Check if text is just a URL or Telegram username (with optional HTML formatting)
 */
function isOnlyUrl(text: string): string | null {
  if (!text) return null;
  
  // Remove HTML tags and whitespace
  const cleanText = text.replace(/<[^>]*>/g, '').trim();
  
  // Check if it's a URL
  const urlPattern = /^https?:\/\/[^\s]+$/i;
  if (urlPattern.test(cleanText)) {
    return cleanText;
  }
  
  // Check if it's a Telegram username/channel (e.g., @chfxandcrypto or chfxandcrypto)
  const telegramUsernamePattern = /^@?([a-zA-Z0-9_]{5,})$/;
  const usernameMatch = cleanText.match(telegramUsernamePattern);
  if (usernameMatch) {
    const username = usernameMatch[1]; // Without @
    return `https://t.me/${username}`;
  }
  
  return null;
}

/**
 * Extract URL from text if present
 */
function extractUrl(text: string): string | null {
  if (!text) return null;
  
  // Check for HTML link
  const htmlLinkMatch = text.match(/<a[^>]+href=["']([^"']+)["'][^>]*>/i);
  if (htmlLinkMatch) {
    return htmlLinkMatch[1];
  }
  
  // Check for plain URL
  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  if (urlMatch) {
    return urlMatch[0];
  }
  
  return null;
}

export interface ButtonConfig {
  referral_message?: string | null;
  live_trade_channel_message?: string | null;
  admin_contacts_message?: string | null;
  copy_trade_message?: string | null;
}

export function getInlineButtons(config?: ButtonConfig | null): InlineKeyboardMarkup {
  const referralMsg = config?.referral_message || '';
  const liveTradeMsg = config?.live_trade_channel_message || '';
  const adminMsg = config?.admin_contacts_message || '';
  const copyTradeMsg = config?.copy_trade_message || '';
  
  // Check if each message is just a URL
  const referralUrl = isOnlyUrl(referralMsg);
  const liveTradeUrl = isOnlyUrl(liveTradeMsg);
  const adminUrl = isOnlyUrl(adminMsg);
  const copyTradeUrl = isOnlyUrl(copyTradeMsg);
  
  return {
    inline_keyboard: [
      [
        {
          text: '🔗 Link Referral',
          ...(referralUrl ? { url: referralUrl } : { callback_data: 'btn_referral' }),
        },
        {
          text: '📊 Live Trade Channel',
          ...(liveTradeUrl ? { url: liveTradeUrl } : { callback_data: 'btn_live_trade' }),
        },
      ],
      [
        {
          text: '💬 Contact Admin',
          ...(adminUrl ? { url: adminUrl } : { callback_data: 'btn_admin' }),
        },
        {
          text: '📈 Copy Trade',
          ...(copyTradeUrl ? { url: copyTradeUrl } : { callback_data: 'btn_copy_trade' }),
        },
      ],
    ],
  };
}

export function getKeyboardButtons(): ReplyKeyboardMarkup {
  return {
    keyboard: [
      [
        {
          text: '🔗 Link Referral',
        },
        {
          text: '📊 Live Trade Channel',
        },
      ],
      [
        {
          text: '💬 Contact Admin',
        },
        {
          text: '📈 Copy Trade',
        },
      ],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  };
}

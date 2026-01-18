import { InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup } from 'telegraf/types';

export function getInlineButtons(): InlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '🔗 Link Referral',
          callback_data: 'btn_referral',
        },
        {
          text: '📊 Live Trade Channel',
          callback_data: 'btn_live_trade',
        },
      ],
      [
        {
          text: '💬 Contact Admin',
          callback_data: 'btn_admin',
        },
        {
          text: '📈 Copy Trade',
          callback_data: 'btn_copy_trade',
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

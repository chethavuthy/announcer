/**
 * Utility functions for getting default message templates
 */

export interface MessageTemplates {
  referral: string;
  liveTrade: string;
  admin: string;
  copyTrade: string;
}

export function getDefaultMessages(): MessageTemplates {
  const defaultReferralMsg = process.env.REFERRAL_MESSAGE ||
    `🔗 <b>Referral Link:</b>\n${process.env.REFERRAL_LINK || 'https://example.com/ref'}\n\nJoin using the link above!`;
  
  const defaultLiveTradeChannel = process.env.LIVE_TRADE_CHANNEL || 'livetradechannel';
  const channelLink = `https://t.me/${defaultLiveTradeChannel.replace('@', '')}`;
  const defaultLiveTradeMsg = process.env.LIVE_TRADE_MESSAGE ||
    `📊 <b>Live Trade Channel:</b>\n${channelLink}\n\nFollow our live trades!`;
  
  const defaultAdminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminLink = `https://t.me/${defaultAdminUsername.replace('@', '')}`;
  const defaultAdminMsg = process.env.ADMIN_MESSAGE ||
    `💬 <b>Contact Admin:</b>\n${adminLink}\n\nReach out for support!`;
  
  const defaultCopyTradeMsg = process.env.COPY_TRADE_MESSAGE ||
    `📈 <b>Copy Trade:</b>\n${process.env.COPY_TRADE_LINK || 'https://example.com/copytrade'}\n\nStart copying trades now!`;

  return {
    referral: defaultReferralMsg,
    liveTrade: defaultLiveTradeMsg,
    admin: defaultAdminMsg,
    copyTrade: defaultCopyTradeMsg,
  };
}

export function getDefaultMessage(type: keyof MessageTemplates): string {
  const messages = getDefaultMessages();
  return messages[type];
}

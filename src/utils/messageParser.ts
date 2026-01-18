export function parseWelcomeMessage(
  template: string,
  name: string,
  username?: string
): string {
  let message = template;
  
  // Replace {{name}} with user's first name
  message = message.replace(/\{\{name\}\}/g, name || 'there');
  
  // Replace {{username}} with @username or empty string
  const usernameStr = username ? `@${username.replace('@', '')}` : '';
  message = message.replace(/\{\{username\}\}/g, usernameStr);
  
  return message;
}

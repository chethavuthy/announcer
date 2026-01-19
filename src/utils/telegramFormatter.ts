/**
 * Utility to convert Telegram message entities to HTML formatting
 */

interface TelegramEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: any;
}

/**
 * Convert Telegram message with entities to HTML formatted string
 */
export function convertEntitiesToHtml(text: string, entities?: TelegramEntity[]): string {
  if (!entities || entities.length === 0) {
    return escapeHtml(text);
  }

  // Sort entities by offset (in reverse to process from end to start)
  const sortedEntities = [...entities].sort((a, b) => b.offset - a.offset);

  let result = text;

  for (const entity of sortedEntities) {
    const start = entity.offset;
    const end = entity.offset + entity.length;
    const content = text.substring(start, end);

    let replacement = '';

    switch (entity.type) {
      case 'bold':
        replacement = `<b>${escapeHtml(content)}</b>`;
        break;
      case 'italic':
        replacement = `<i>${escapeHtml(content)}</i>`;
        break;
      case 'underline':
        replacement = `<u>${escapeHtml(content)}</u>`;
        break;
      case 'strikethrough':
        replacement = `<s>${escapeHtml(content)}</s>`;
        break;
      case 'code':
        replacement = `<code>${escapeHtml(content)}</code>`;
        break;
      case 'pre':
        replacement = `<pre>${escapeHtml(content)}</pre>`;
        break;
      case 'text_link':
        replacement = `<a href="${escapeHtml(entity.url || '')}">${escapeHtml(content)}</a>`;
        break;
      case 'text_mention':
        replacement = `<a href="tg://user?id=${entity.user?.id}">${escapeHtml(content)}</a>`;
        break;
      case 'url':
      case 'email':
      case 'phone_number':
        replacement = `<a href="${escapeHtml(content)}">${escapeHtml(content)}</a>`;
        break;
      default:
        replacement = escapeHtml(content);
    }

    result = result.substring(0, start) + replacement + result.substring(end);
  }

  return result;
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Convert received Telegram message to HTML format for storage
 * If message has entities, convert them. Otherwise, just escape HTML.
 */
export function formatMessageForStorage(text: string, entities?: TelegramEntity[]): string {
  if (entities && entities.length > 0) {
    return convertEntitiesToHtml(text, entities);
  }
  return escapeHtml(text);
}

/**
 * Convert HTML to human-readable plain text
 * Removes HTML tags and converts HTML entities to readable characters
 */
export function htmlToPlainText(html: string): string {
  if (!html) return html;
  
  let text = html;
  
  // Convert HTML entities back to characters
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
  
  // Remove HTML tags but preserve link text
  // Handle <a href="...">text</a> - keep the text content
  text = text.replace(/<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)<\/a>/gi, '$2 ($1)');
  
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  return text.trim();
}

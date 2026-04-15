/**
 * 聊天导出服务
 * 支持 JSON 和 Markdown 两种导出格式
 */

import { Chat, Message } from '../store/useStore';

/**
 * 导出为 JSON 格式
 */
export function exportChatJSON(chat: Chat): void {
  const data = {
    format: 'sillytavern-chat-v1',
    exportedAt: new Date().toISOString(),
    chat: {
      name: chat.name,
      avatar: chat.avatar,
      roleId: chat.roleId,
      tags: chat.tags || [],
      starred: chat.starred || false,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messages: chat.msgs.map(m => ({
        role: m.isUser ? 'user' : 'assistant',
        content: m.content,
        timestamp: m.timestamp,
        attachments: m.attachments,
      })),
    },
  };

  downloadFile(
    JSON.stringify(data, null, 2),
    `sillytavern-chat-${chat.id}.json`,
    'application/json'
  );
}

/**
 * 导出为 Markdown 格式
 */
export function exportChatMarkdown(chat: Chat, roleName?: string): void {
  const lines: string[] = [];

  // 标题
  lines.push(`# ${chat.name}`);
  if (roleName) {
    lines.push(`**对话角色**: ${roleName}`);
  }
  if (chat.tags && chat.tags.length > 0) {
    lines.push(`**标签**: ${chat.tags.join(', ')}`);
  }
  lines.push(`**导出时间**: ${new Date().toLocaleString()}`);
  lines.push(`**创建时间**: ${new Date(chat.createdAt).toLocaleString()}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // 消息列表
  for (const msg of chat.msgs) {
    const sender = msg.isUser ? '👤 用户' : '🤖 AI';
    lines.push(`### ${sender} · ${msg.timestamp}`);
    lines.push('');
    lines.push(msg.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  downloadFile(
    lines.join('\n'),
    `sillytavern-chat-${chat.id}.md`,
    'text/markdown'
  );
}

/**
 * 导出为纯文本格式（方便粘贴到其他应用）
 */
export function exportChatText(chat: Chat, roleName?: string): void {
  const lines: string[] = [];

  lines.push(`对话: ${chat.name}`);
  if (roleName) lines.push(`角色: ${roleName}`);
  lines.push(`导出时间: ${new Date().toLocaleString()}`);
  lines.push('='.repeat(40));
  lines.push('');

  for (const msg of chat.msgs) {
    const sender = msg.isUser ? '[用户]' : '[AI]';
    lines.push(`${sender} ${msg.timestamp}`);
    lines.push(msg.content);
    lines.push('');
  }

  downloadFile(
    lines.join('\n'),
    `sillytavern-chat-${chat.id}.txt`,
    'text/plain'
  );
}

/**
 * 导出所有聊天数据（完整备份）
 */
export function exportAllData(data: { chats: Chat[]; roles: any[]; settings: any; worldInfo: any[] }): void {
  const backup = {
    format: 'sillytavern-backup-v1',
    exportedAt: new Date().toISOString(),
    ...data,
  };

  downloadFile(
    JSON.stringify(backup, null, 2),
    `sillytavern-backup-${Date.now()}.json`,
    'application/json'
  );
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * World Info / Lorebook 服务
 * 扫描聊天消息，匹配关键词，返回需要注入上下文的条目
 */

import { WorldInfoEntry } from '../store/useStore';
import { ChatMessage } from './ai';

/**
 * 扫描消息列表，返回匹配的 WorldInfo 条目内容
 * @param entries 所有 WorldInfo 条目
 * @param messages 当前聊天消息列表
 * @returns { before: string, after: string, matched: WorldInfoEntry[] }
 */
export function scanWorldInfo(
  entries: WorldInfoEntry[],
  messages: ChatMessage[]
): { before: string; after: string; matched: WorldInfoEntry[] } {
  const enabledEntries = entries.filter(e => e.enabled);
  if (enabledEntries.length === 0) {
    return { before: '', after: '', matched: [] };
  }

  // 合并需要扫描的消息文本
  const scanTexts = messages
    .slice(-(Math.max(...enabledEntries.map(e => e.scanDepth), 1)))
    .map(m => m.content)
    .join('\n');

  const beforeEntries: WorldInfoEntry[] = [];
  const afterEntries: WorldInfoEntry[] = [];

  for (const entry of enabledEntries) {
    if (entry.constant) {
      // 常驻条目始终注入
      if (entry.position === 'after') {
        afterEntries.push(entry);
      } else {
        beforeEntries.push(entry);
      }
      continue;
    }

    // 检查关键词是否匹配
    const matched = entry.keys.some(key => {
      if (!key.trim()) return false;
      if (entry.caseSensitive) {
        return scanTexts.includes(key);
      } else {
        return scanTexts.toLowerCase().includes(key.toLowerCase());
      }
    });

    if (matched) {
      if (entry.position === 'after') {
        afterEntries.push(entry);
      } else {
        beforeEntries.push(entry);
      }
    }
  }

  // 按 order 排序
  const sortByOrder = (a: WorldInfoEntry, b: WorldInfoEntry) => a.order - b.order;
  beforeEntries.sort(sortByOrder);
  afterEntries.sort(sortByOrder);

  const formatEntries = (ents: WorldInfoEntry[]) =>
    ents.map(e => e.content).filter(Boolean).join('\n\n');

  return {
    before: formatEntries(beforeEntries),
    after: formatEntries(afterEntries),
    matched: [...beforeEntries, ...afterEntries],
  };
}

/**
 * 将 WorldInfo 内容注入到消息列表中
 * @param worldInfoBefore 注入到 system 之后的内容
 * @param worldInfoAfter 追加到消息末尾的内容
 * @param messages 原始消息列表
 * @returns 增强后的消息列表
 */
export function injectWorldInfo(
  worldInfoBefore: string,
  worldInfoAfter: string,
  messages: ChatMessage[]
): ChatMessage[] {
  const result = [...messages];

  // 注入 before 内容（在 system 消息之后）
  if (worldInfoBefore) {
    const systemIdx = result.findIndex(m => m.role === 'system');
    if (systemIdx !== -1) {
      // 将 WorldInfo 附加到 system 消息中
      result[systemIdx] = {
        role: 'system',
        content: result[systemIdx].content + '\n\n[World Info]\n' + worldInfoBefore,
      };
    } else {
      // 没有 system 消息则创建一个
      result.unshift({
        role: 'system',
        content: '[World Info]\n' + worldInfoBefore,
      });
    }
  }

  // 注入 after 内容（在消息末尾，作为 system 消息）
  if (worldInfoAfter) {
    result.push({
      role: 'system',
      content: '[Additional Context]\n' + worldInfoAfter,
    });
  }

  return result;
}

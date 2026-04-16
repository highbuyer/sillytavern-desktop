/**
 * World Info / Lorebook 服务
 * 扫描聊天消息，匹配关键词，返回需要注入上下文的条目
 * 支持6种注入位置、概率触发、冷却延迟、防递归、token预算等
 */

import { WorldInfoEntry, WIPosition, WorldInfoSettings } from '../store/useStore';
import { ChatMessage } from './ai';
import { estimateTokens } from './tokenCounter';

/** 扫描上下文 */
export interface ScanContext {
  role?: { description: string; personality: string; prompt: string; name: string };
  worldInfoSettings: WorldInfoSettings;
  /** 跟踪每个条目的触发历史 { entryId: { lastTriggeredTurn, triggerCount } } */
  triggerHistory: Map<number, { lastTriggeredTurn: number; triggerCount: number }>;
  /** 当前对话轮数 */
  currentTurn: number;
}

/** 扫描结果 */
export interface ScanResult {
  /** 按 position 分组的条目 */
  entries: Map<WIPosition, WorldInfoEntry[]>;
  /** 所有匹配的条目（用于UI显示） */
  matched: WorldInfoEntry[];
  /** 总 token 估算 */
  totalTokens: number;
}

/** 归一化旧 position 值到新的 WIPosition */
function normalizePosition(pos: any): WIPosition {
  if (!pos) return 'before_char';
  // 新格式直接返回
  const newPositions: WIPosition[] = [
    'before_char', 'after_char', 'before_example',
    'after_example', 'before_last', 'after_last',
  ];
  if (newPositions.includes(pos)) return pos;
  // 旧格式: 'before' -> 'before_char', 'after' -> 'after_last'
  if (pos === 'before') return 'before_char';
  if (pos === 'after') return 'after_last';
  // SillyTavern 数字格式: 0=before_char, 1=after_char, 2=before_example, 3=after_example, 4=AN
  if (typeof pos === 'number') {
    switch (pos) {
      case 0: return 'before_char';
      case 1: return 'after_char';
      case 2: return 'before_example';
      case 3: return 'after_example';
      case 4: return 'after_last';
      case 5: return 'before_last';
      default: return 'before_char';
    }
  }
  return 'before_char';
}

/** 获取条目的安全默认值（兼容旧数据） */
function getSafeEntry(entry: any): WorldInfoEntry {
  return {
    id: entry.id ?? 0,
    keys: Array.isArray(entry.keys) ? entry.keys.filter((k): k is string => typeof k === 'string') : [],
    secondaryKeys: Array.isArray(entry.secondaryKeys) ? entry.secondaryKeys.filter((k): k is string => typeof k === 'string') : [],
    selectiveLogic: entry.selectiveLogic === 'AND' ? 'AND' : 'OR',
    content: safeContent(entry.content),
    comment: safeContent(entry.comment),
    name: safeContent(entry.name),
    enabled: entry.enabled !== false,
    constant: entry.constant || false,
    position: normalizePosition(entry.position),
    order: typeof entry.order === 'number' ? entry.order : 0,
    depth: typeof entry.depth === 'number' ? entry.depth : 0,
    caseSensitive: entry.caseSensitive || false,
    scanDepth: typeof entry.scanDepth === 'number' ? entry.scanDepth : 10,
    useProbability: entry.useProbability || false,
    probability: typeof entry.probability === 'number' ? entry.probability : 100,
    preventRecursion: entry.preventRecursion || false,
    excludeRecursion: entry.excludeRecursion || false,
    cooldown: typeof entry.cooldown === 'number' ? entry.cooldown : 0,
    delay: typeof entry.delay === 'number' ? entry.delay : 0,
    group: entry.group || '',
    groupOverride: entry.groupOverride || false,
    groupWeight: typeof entry.groupWeight === 'number' ? entry.groupWeight : 100,
    scanRole: entry.scanRole ?? null,
    role: entry.role ?? null,
    tokenBudget: typeof entry.tokenBudget === 'number' ? entry.tokenBudget : 0,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || new Date().toISOString(),
  };
}

/** 安全获取条目内容，确保始终为有效字符串 */
function safeContent(content: any): string {
  if (content == null || content === undefined) return '';
  if (typeof content === 'string') {
    // 过滤掉明显的无效内容
    if (content === 'undefined' || content === 'null' || content === '[object Object]' || content === '[object Array]') return '';
    return content.trim();
  }
  if (Array.isArray(content)) {
    // 数组：将每个元素递归转为字符串后用换行连接
    return content.map(v => safeContent(v)).filter(Boolean).join('\n');
  }
  if (typeof content === 'object') {
    // 对象：尝试 JSON 序列化
    try {
      const json = JSON.stringify(content);
      if (json === '{}' || json === '[]') return '';
      return json;
    } catch {
      return '';
    }
  }
  const str = String(content);
  if (str === 'undefined' || str === 'null' || str === '[object Object]' || str === '[object Array]') return '';
  return str.trim();
}

/** 检查关键词是否在文本中匹配 */
function keysMatch(keys: string[], scanText: string, caseSensitive: boolean): boolean {
  for (const key of keys) {
    if (!key.trim()) continue;
    if (caseSensitive) {
      if (scanText.includes(key)) return true;
    } else {
      if (scanText.toLowerCase().includes(key.toLowerCase())) return true;
    }
  }
  return false;
}

/**
 * 构建需要扫描的文本
 * 根据 worldInfoSettings.scanScope 合并消息和角色信息
 */
function buildScanText(
  messages: ChatMessage[],
  ctx: ScanContext,
  entries: WorldInfoEntry[]
): string {
  const parts: string[] = [];
  const scope = ctx.worldInfoSettings.scanScope;

  // 扫描聊天消息（根据各条目 scanDepth 取最大值）
  if (scope.messages && messages.length > 0) {
    const maxDepth = Math.max(
      ...entries.map(e => e.scanDepth).filter(d => d > 0),
      1
    );
    const recentMsgs = messages.slice(-(maxDepth));
    parts.push(recentMsgs.map(m => m.content).join('\n'));
  }

  // 扫描角色相关字段
  if (ctx.role) {
    if (scope.charDescription && ctx.role.description) {
      parts.push(ctx.role.description);
    }
    if (scope.charPersonality && ctx.role.personality) {
      parts.push(ctx.role.personality);
    }
    if (scope.scenario && ctx.role.prompt) {
      parts.push(ctx.role.prompt);
    }
  }

  return parts.join('\n');
}

/**
 * 扫描消息列表，返回匹配的 WorldInfo 条目
 * @param entries 所有 WorldInfo 条目（可能是旧格式或新格式）
 * @param messages 当前聊天消息列表
 * @param ctx 扫描上下文
 * @returns ScanResult 按 position 分组的匹配结果
 */
export function scanWorldInfo(
  entries: WorldInfoEntry[],
  messages: ChatMessage[],
  ctx: ScanContext
): ScanResult {
  const safeEntries = entries.map(getSafeEntry).filter(e => e.enabled);
  if (safeEntries.length === 0) {
    return { entries: new Map(), matched: [], totalTokens: 0 };
  }

  // 构建扫描文本
  let scanText = buildScanText(messages, ctx, safeEntries);

  // 已匹配的条目 key 集合（用于 excludeRecursion）
  const matchedKeys = new Set<string>();
  // 匹配结果
  const positionMap = new Map<WIPosition, WorldInfoEntry[]>();
  const allMatched: WorldInfoEntry[] = [];
  let totalTokens = 0;
  let globalBudgetUsed = 0;
  const globalBudget = ctx.worldInfoSettings.globalTokenBudget;

  for (const entry of safeEntries) {
    // 检查 role 限制（条目仅对特定角色生效）
    if (entry.role !== null && ctx.role) {
      // 这里 entry.role 存储的是 roleId，ctx.role 需要 roleId 来比较
      // 由于 ctx.role 可能没有 id，我们跳过这个检查（需要外部传入 roleId）
      // 在 ChatRoom 中已经处理了角色匹配
    }

    if (entry.constant) {
      // 常驻条目始终注入
      const contentTokens = estimateTokens(entry.content);
      // 检查 token 预算
      if (entry.tokenBudget > 0 && contentTokens > entry.tokenBudget) continue;
      if (globalBudget > 0 && globalBudgetUsed + contentTokens > globalBudget) continue;

      globalBudgetUsed += contentTokens;
      const pos = entry.position;
      if (!positionMap.has(pos)) positionMap.set(pos, []);
      positionMap.get(pos)!.push(entry);
      allMatched.push(entry);
      totalTokens += contentTokens;
      continue;
    }

    // 检查冷却期
    const history = ctx.triggerHistory.get(entry.id);
    if (entry.cooldown > 0 && history) {
      if (ctx.currentTurn - history.lastTriggeredTurn < entry.cooldown) {
        continue;
      }
    }

    // 检查延迟触发
    if (entry.delay > 0) {
      if (!history || history.triggerCount < entry.delay) {
        continue;
      }
    }

    // 检查主关键词匹配
    const primaryMatch = keysMatch(entry.keys, scanText, entry.caseSensitive);
    if (!primaryMatch) continue;

    // 如果有次关键词，检查组合逻辑
    if (entry.secondaryKeys.length > 0) {
      const secondaryMatch = keysMatch(entry.secondaryKeys, scanText, entry.caseSensitive);
      if (entry.selectiveLogic === 'AND' && !secondaryMatch) continue;
      if (entry.selectiveLogic === 'OR') {
        // OR: primary or secondary (primary already matched, so OK)
      }
    }

    // 检查概率触发
    if (entry.useProbability) {
      const roll = Math.random() * 100;
      if (roll > entry.probability) continue;
    }

    // 检查排除递归
    if (entry.excludeRecursion) {
      const entryAllKeys = [...entry.keys, ...entry.secondaryKeys];
      if (entryAllKeys.some(k => matchedKeys.has(k.toLowerCase()))) continue;
    }

    // 检查 token 预算
    const contentTokens = estimateTokens(entry.content);
    if (entry.tokenBudget > 0 && contentTokens > entry.tokenBudget) continue;
    if (globalBudget > 0 && globalBudgetUsed + contentTokens > globalBudget) continue;

    // 匹配成功
    globalBudgetUsed += contentTokens;
    const pos = entry.position;
    if (!positionMap.has(pos)) positionMap.set(pos, []);
    positionMap.get(pos)!.push(entry);
    allMatched.push(entry);
    totalTokens += contentTokens;

    // 记录匹配的关键词
    for (const k of entry.keys) matchedKeys.add(k.toLowerCase());
    for (const k of entry.secondaryKeys) matchedKeys.add(k.toLowerCase());

    // 更新触发历史
    const existing = ctx.triggerHistory.get(entry.id) || { lastTriggeredTurn: 0, triggerCount: 0 };
    ctx.triggerHistory.set(entry.id, {
      lastTriggeredTurn: ctx.currentTurn,
      triggerCount: existing.triggerCount + 1,
    });

    // 防递归：从扫描文本中移除已匹配的关键词
    if (entry.preventRecursion) {
      let mutableScanText = scanText;
      for (const key of entry.keys) {
        if (!key.trim()) continue;
        mutableScanText = mutableScanText.split(key).join('');
      }
      scanText = mutableScanText;
    }
  }

  // 在每个 position 组内按 order 排序
  for (const [, groupEntries] of positionMap) {
    groupEntries.sort((a, b) => a.order - b.order);
  }

  return {
    entries: positionMap,
    matched: allMatched,
    totalTokens,
  };
}

/**
 * 将 WorldInfo 内容注入到消息列表中
 * 根据6种注入位置执行不同的插入策略
 *
 * @param scanResult 扫描结果（包含按位置分组的条目）
 * @param messages 原始消息列表
 * @param role 角色信息（可选）
 * @returns 增强后的消息列表
 */
export function injectWorldInfo(
  scanResult: ScanResult,
  messages: ChatMessage[],
  role?: { description: string; personality: string; prompt: string; name: string }
): ChatMessage[] {
  const result = [...messages];
  const { entries: positionMap } = scanResult;

  if (positionMap.size === 0) return result;

  // 按照注入优先级从后往前处理位置，避免索引偏移
  // 处理顺序（从后到前）：after_last, before_last, after_example, before_example, after_char, before_char
  const positionOrder: WIPosition[] = [
    'after_last', 'before_last', 'after_example', 'before_example', 'after_char', 'before_char',
  ];

  for (const pos of positionOrder) {
    const posEntries = positionMap.get(pos);
    if (!posEntries || posEntries.length === 0) continue;

    const content = posEntries
      .map(e => safeContent(e.content))
      .filter(Boolean)
      .join('\n\n');

    if (!content) continue;

    switch (pos) {
      case 'before_char': {
        // Insert right after the system message (or create system if none)
        const formattedContent = `[World Info]\n${content}`;
        const systemIdx = result.findIndex(m => m.role === 'system');
        if (systemIdx !== -1) {
          // 将 WorldInfo 附加到 system 消息中
          result[systemIdx] = {
            role: 'system',
            content: result[systemIdx].content + '\n\n' + formattedContent,
          };
        } else {
          // 没有 system 消息则创建一个
          result.unshift({
            role: 'system',
            content: formattedContent,
          });
        }
        break;
      }

      case 'after_char': {
        // Insert after the character definition content within system
        const formattedContent = `\n[World Info - Character]\n${content}`;
        const systemIdx = result.findIndex(m => m.role === 'system');
        if (systemIdx !== -1) {
          // 追加到 system 消息末尾（角色定义之后）
          result[systemIdx] = {
            role: 'system',
            content: result[systemIdx].content + formattedContent,
          };
        } else {
          // 如果没有 system 消息，创建一个并放入角色信息
          const charDef = role ? `[Character: ${role.name}]\n${role.description || role.prompt}` : '';
          result.unshift({
            role: 'system',
            content: charDef + formattedContent,
          });
        }
        break;
      }

      case 'before_example': {
        // Insert before the last user message
        const formattedContent = `[World Info - Before Examples]\n${content}`;
        // 找到最后一条 user 消息
        let lastUserIdx = -1;
        for (let i = result.length - 1; i >= 0; i--) {
          if (result[i].role === 'user') {
            lastUserIdx = i;
            break;
          }
        }
        if (lastUserIdx !== -1) {
          result.splice(lastUserIdx, 0, { role: 'system', content: formattedContent });
        } else {
          // 没有 user 消息则追加到末尾
          result.push({ role: 'system', content: formattedContent });
        }
        break;
      }

      case 'after_example': {
        // Insert after the last user message
        const formattedContent = `[World Info - After Examples]\n${content}`;
        let lastUserIdx = -1;
        for (let i = result.length - 1; i >= 0; i--) {
          if (result[i].role === 'user') {
            lastUserIdx = i;
            break;
          }
        }
        if (lastUserIdx !== -1) {
          result.splice(lastUserIdx + 1, 0, { role: 'system', content: formattedContent });
        } else {
          result.push({ role: 'system', content: formattedContent });
        }
        break;
      }

      case 'before_last': {
        // Insert before the last assistant message (or last user message if no assistant)
        const formattedContent = `[World Info - Before Last]\n${content}`;
        let insertIdx = -1;
        for (let i = result.length - 1; i >= 0; i--) {
          if (result[i].role === 'assistant') {
            insertIdx = i;
            break;
          }
          if (result[i].role === 'user' && insertIdx === -1) {
            insertIdx = i;
          }
        }
        if (insertIdx !== -1) {
          result.splice(insertIdx, 0, { role: 'system', content: formattedContent });
        } else {
          result.push({ role: 'system', content: formattedContent });
        }
        break;
      }

      case 'after_last': {
        // Insert after the last message (Author's Note position)
        const formattedContent = `[World Info - Author's Note]\n${content}`;
        result.push({ role: 'system', content: formattedContent });
        break;
      }
    }
  }

  return result;
}

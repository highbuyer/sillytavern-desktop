/**
 * TavernAI 角色卡服务
 * 支持 V2 / V3 规格的角色卡
 * 支持从 JSON 文件和 PNG 图片文件导入
 */

import type { Role, WorldInfoEntry, WIPosition } from '../store/useStore';

// ==================== 类型定义 ====================

export interface TavernAIV2Card {
  spec: 'chara_card_v2';
  spec_version: '2.0';
  data: {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    creator_notes: string;
    system_prompt: string;
    post_history_instructions: string;
    alternate_greetings: string[];
    tags: string[];
    creator: string;
    character_version: string;
    extensions: Record<string, any>;
    avatar?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    character_book?: any;
  };
}

// V3 角色卡的 data 部分（和 V2 基本一致）
export interface CharacterCardData {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creator_notes: string;
  system_prompt: string;
  post_history_instructions: string;
  tags: string[];
  creator: string;
  character_version: string;
  alternate_greetings: string[];
  extensions: Record<string, any>;
  character_book?: any;
  group_only_greetings?: any;
}

// V3 完整结构（顶层字段和 data 重复，兼容两种读取方式）
export interface TavernAIV3Card {
  spec: 'chara_card_v3';
  spec_version: '3.0';
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creatorcomment: string;
  avatar: string;
  tags: string[];
  data: CharacterCardData;
  create_date?: string;
}

// 统一接口
export interface ParsedCharacterCard {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  system_prompt: string;
  post_history_instructions: string;
  creator_notes: string;
  tags: string[];
  creator: string;
  character_version: string;
  alternate_greetings: string[];
  avatar: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  talkativeness?: number;
  /** 角色卡中嵌入的世界书数据（V2/V3 规范） */
  character_book?: any;
}

// ==================== PNG 解析 ====================

/**
 * 从 PNG 文件的 ArrayBuffer 中提取 tEXt chunk
 * 返回 keyword -> text 的 Map
 */
function extractPNGTextChunks(buffer: ArrayBuffer): Map<string, string> {
  const chunks = new Map<string, string>();
  const view = new DataView(buffer);
  let offset = 8; // 跳过 PNG 签名

  while (offset < buffer.byteLength) {
    const length = view.getUint32(offset);
    offset += 4;

    // 读取 chunk type (4 bytes)
    const typeBytes = new Uint8Array(buffer, offset, 4);
    const type = String.fromCharCode(...typeBytes);
    offset += 4;

    // 读取 chunk data
    const data = new Uint8Array(buffer, offset, length);
    offset += length;

    // 跳过 CRC (4 bytes)
    offset += 4;

    if (type === 'tEXt') {
      // tEXt: keyword\0text
      const nullIdx = data.indexOf(0);
      if (nullIdx !== -1) {
        const keyword = new TextDecoder('latin1').decode(data.slice(0, nullIdx));
        const text = new TextDecoder('latin1').decode(data.slice(nullIdx + 1));
        chunks.set(keyword, text);
      }
    } else if (type === 'IEND') {
      break;
    }
  }

  return chunks;
}

/**
 * 从 PNG 的 tEXt chunk 中提取角色卡数据
 * 支持 base64 编码（标准）和 zlib 压缩（旧版）
 */
function extractCharaFromPNG(buffer: ArrayBuffer): ParsedCharacterCard | null {
  const chunks = extractPNGTextChunks(buffer);

  let rawText = chunks.get('chara');
  if (!rawText) {
    return null;
  }

  // 尝试 base64 解码（标准方式）
  let jsonStr: string | null = null;
  try {
    // 浏览器环境用 atob，Node 用 Buffer
    if (typeof atob !== 'undefined') {
      const binaryStr = atob(rawText);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      jsonStr = new TextDecoder('utf-8').decode(bytes);
    } else if (typeof Buffer !== 'undefined') {
      const buf = Buffer.from(rawText, 'base64');
      jsonStr = buf.toString('utf-8');
    }
  } catch {
    // base64 失败，尝试直接作为 UTF-8
    jsonStr = rawText;
  }

  if (!jsonStr) return null;

  try {
    const json = JSON.parse(jsonStr);
    return normalizeCharacterCard(json);
  } catch {
    // 可能是 zlib 压缩的（旧格式）
    try {
      // 尝试 zlib 解压
      if (typeof require === 'function') {
        const zlib = require('zlib');
        const buf = Buffer.from(rawText, 'base64');
        const decompressed = zlib.inflateRawSync(buf).toString('utf-8');
        const json = JSON.parse(decompressed);
        return normalizeCharacterCard(json);
      }
    } catch {
      // 都失败了
    }
    return null;
  }
}

/**
 * 将任意格式的角色卡 JSON 标准化为统一格式
 */
export function normalizeCharacterCard(json: any): ParsedCharacterCard | null {
  if (!json || typeof json !== 'object') return null;

  // V3 格式
  if (json.spec === 'chara_card_v3' || json.spec_version === '3.0') {
    const data = json.data || json;
    return {
      name: data.name || json.name || '',
      description: data.description || '',
      personality: data.personality || '',
      scenario: data.scenario || '',
      first_mes: data.first_mes || '',
      mes_example: data.mes_example || '',
      system_prompt: data.system_prompt || '',
      post_history_instructions: data.post_history_instructions || '',
      creator_notes: data.creator_notes || json.creatorcomment || '',
      tags: data.tags || json.tags || [],
      creator: data.creator || '',
      character_version: data.character_version || '',
      alternate_greetings: data.alternate_greetings || [],
      avatar: data.avatar || json.avatar || '',
      temperature: data.extensions?.depth_prompt?.prompt ? undefined : undefined,
      talkativeness: data.extensions?.talkativeness ?? 50,
      character_book: data.character_book || json.character_book || undefined,
    };
  }

  // V2 格式
  if (json.spec === 'chara_card_v2' && json.data) {
    const data = json.data;
    return {
      name: data.name || '',
      description: data.description || '',
      personality: data.personality || '',
      scenario: data.scenario || '',
      first_mes: data.first_mes || '',
      mes_example: data.mes_example || '',
      system_prompt: data.system_prompt || '',
      post_history_instructions: data.post_history_instructions || '',
      creator_notes: data.creator_notes || '',
      tags: data.tags || [],
      creator: data.creator || '',
      character_version: data.character_version || '',
      alternate_greetings: data.alternate_greetings || [],
      avatar: data.avatar || '',
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      topP: data.topP,
      frequencyPenalty: data.frequencyPenalty,
      presencePenalty: data.presencePenalty,
      talkativeness: data.extensions?.talkativeness ?? 50,
      character_book: data.character_book || data.extensions?.character_book || undefined,
    };
  }

  // 兼容：裸 data 对象（有 name 就认为是角色卡）
  if (json.name) {
    return {
      name: json.name || '',
      description: json.description || '',
      personality: json.personality || '',
      scenario: json.scenario || '',
      first_mes: json.first_mes || '',
      mes_example: json.mes_example || '',
      system_prompt: json.system_prompt || json.prompt || '',
      post_history_instructions: json.post_history_instructions || '',
      creator_notes: json.creator_notes || json.creatorcomment || '',
      tags: json.tags || [],
      creator: json.creator || '',
      character_version: json.character_version || '',
      alternate_greetings: json.alternate_greetings || [],
      avatar: json.avatar || '',
      character_book: json.character_book || undefined,
    };
  }

  return null;
}

// ==================== 转换函数 ====================

export function roleToTavernCard(role: Role): TavernAIV2Card {
  return {
    spec: 'chara_card_v2',
    spec_version: '2.0',
    data: {
      name: role.name,
      description: role.description || '',
      personality: role.personality || '',
      scenario: role.scenario || '',
      first_mes: role.first_mes || '',
      mes_example: role.mes_example || '',
      creator_notes: role.creator_notes || '',
      system_prompt: role.system_prompt || role.prompt || '',
      post_history_instructions: role.post_history_instructions || '',
      alternate_greetings: role.alternate_greetings || [],
      tags: role.tags || [],
      creator: role.creator || 'SillyTavern Desktop',
      character_version: role.character_version || '1.0',
      extensions: {
        ...(role.talkativeness !== undefined ? { talkativeness: role.talkativeness } : {}),
      },
      avatar: role.avatar,
      temperature: role.temperature,
      maxTokens: role.maxTokens,
      topP: role.topP,
      frequencyPenalty: role.frequencyPenalty,
      presencePenalty: role.presencePenalty,
    },
  };
}

export function parsedCardToRole(card: ParsedCharacterCard): Omit<Role, 'id' | 'createdAt'> {
  return {
    name: card.name,
    description: card.description || '',
    avatar: card.avatar || generateDefaultAvatar(card.name),
    prompt: card.system_prompt || '',
    personality: card.personality || '',
    scenario: card.scenario || '',
    first_mes: card.first_mes || '',
    mes_example: card.mes_example || '',
    alternate_greetings: card.alternate_greetings || [],
    system_prompt: card.system_prompt || '',
    post_history_instructions: card.post_history_instructions || '',
    creator_notes: card.creator_notes || '',
    creator: card.creator || '',
    character_version: card.character_version || '',
    tags: card.tags || [],
    talkativeness: card.talkativeness ?? 50,
    fav: false,
    temperature: card.temperature ?? 0.7,
    maxTokens: card.maxTokens ?? 2000,
    topP: card.topP ?? 0.9,
    frequencyPenalty: card.frequencyPenalty ?? 0.0,
    presencePenalty: card.presencePenalty ?? 0.0,
  };
}

function generateDefaultAvatar(name: string): string {
  const colors = ['#5B3FD9', '#00CED1', '#FF6B6B', '#4CAF50', '#FF9800', '#E91E63', '#2196F3', '#9C27B0'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const initial = name.charAt(0).toUpperCase();
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="${color}"/><text x="64" y="75" text-anchor="middle" font-size="48" fill="white" font-family="sans-serif">${initial}</text></svg>`;
}

// ==================== 世界书转换 ====================

/**
 * 安全地将任意值转换为字符串
 * 处理 null、undefined、对象、数组等非字符串类型
 */
function safeString(val: any): string {
  if (val == null) return '';
  if (typeof val === 'string') {
    // 过滤掉明显的无效字符串值
    if (val === 'undefined' || val === 'null' || val === '[object Object]' || val === '[object Array]') return '';
    return val.trim();
  }
  if (Array.isArray(val)) {
    // 数组：将每个元素转为字符串后用换行连接
    const parts = val.map(v => safeString(v)).filter(Boolean);
    return parts.join('\n');
  }
  if (typeof val === 'object') {
    // 对象：尝试 JSON 序列化，如果结果无效则返回空字符串
    try {
      const json = JSON.stringify(val);
      if (json === '{}' || json === '[]') return '';
      return json;
    } catch {
      return '';
    }
  }
  const str = String(val);
  if (str === 'undefined' || str === 'null' || str === '[object Object]' || str === '[object Array]') return '';
  return str.trim();
}

/**
 * 将 character_book 中的 position 数字映射为 WIPosition
 * SillyTavern 标准: 0=before_char, 1=after_char, 2=before_example, 3=after_example, 4=before/after_last
 */
function mapCharBookPosition(pos: any): WIPosition {
  if (!pos && pos !== 0) return 'before_char';
  if (typeof pos === 'string') {
    const valid: WIPosition[] = ['before_char', 'after_char', 'before_example', 'after_example', 'before_last', 'after_last'];
    if (valid.includes(pos as WIPosition)) return pos as WIPosition;
    if (pos === 'before') return 'before_char';
    if (pos === 'after') return 'after_last';
    return 'before_char';
  }
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

/**
 * 从角色卡的 character_book 字段提取世界书条目
 * @param characterBook 角色卡中的 character_book 对象
 * @param charName 角色名称（用作世界书名称的一部分）
 * @returns { name: string, entries: WorldInfoEntry[] } 或 null
 *
 * character_book 结构（SillyTavern 标准）：
 * {
 *   name?: string,            // 世界书名称
 *   entries?: {               // 条目集合（对象形式，key 为 uid 字符串）
 *     "0": { uid, keys, content, ... },
 *     "1": { uid, keys, content, ... },
 *   }
 * }
 */
export function extractWorldBookFromCharacterBook(
  characterBook: any,
  charName: string
): { name: string; entries: WorldInfoEntry[] } | null {
  if (!characterBook || typeof characterBook !== 'object') return null;

  const entriesObj = characterBook.entries;
  if (!entriesObj || typeof entriesObj !== 'object') return null;

  // entries 可能是数组或对象
  let rawEntries: any[] = [];
  if (Array.isArray(entriesObj)) {
    rawEntries = entriesObj;
  } else {
    rawEntries = Object.values(entriesObj);
  }

  if (rawEntries.length === 0) return null;

  // 构建 group 映射（如果 character_book.groups 存在）
  const groupsMap = new Map<number | string, string>();
  if (Array.isArray(characterBook.groups)) {
    for (const g of characterBook.groups) {
      const gid = g.id ?? g.uid ?? g.index;
      const gname = g.name || g.title || '';
      if (gname && gid !== undefined) {
        groupsMap.set(gid, gname);
        groupsMap.set(String(gid), gname);
      }
    }
  }

  const now = new Date().toISOString();
  const parsedEntries: WorldInfoEntry[] = rawEntries.map((entry: any, index: number) => {
    const ext = entry.extensions || {};
    const keys = entry.key || entry.keys || [];
    const keyArray = Array.isArray(keys) ? keys : typeof keys === 'string' ? keys.split(',').map((k: string) => k.trim()).filter(Boolean) : [];
    const secKeys = entry.keysecondary || entry.secondary_keys || entry.secondaryKeys || [];
    const secondaryKeyArray = Array.isArray(secKeys) ? secKeys : typeof secKeys === 'string' ? secKeys.split(',').map((k: string) => k.trim()).filter(Boolean) : [];

    // 解析 group
    let groupVal = entry.group ?? ext.group ?? '';
    if (typeof groupVal === 'number' && groupsMap.size > 0) {
      const resolved = groupsMap.get(groupVal) || groupsMap.get(String(groupVal));
      if (resolved) groupVal = resolved;
      else groupVal = String(groupVal);
    }
    if (groupVal == null) groupVal = '';

    return {
      id: entry.uid ?? entry.id ?? Date.now() + index + Math.random(),
      keys: keyArray,
      secondaryKeys: secondaryKeyArray,
      selectiveLogic: entry.selectiveLogic === 1 || entry.selectiveLogic === 'AND' ? 'AND' : 'OR',
      content: safeString(entry.content),
      comment: safeString(entry.comment),
      name: safeString(entry.name) || safeString(entry.comment),
      enabled: entry.disable === true ? false : (entry.enabled !== false),
      constant: entry.constant || false,
      position: mapCharBookPosition(entry.position),
      order: entry.order ?? entry.displayIndex ?? index,
      depth: entry.depth ?? ext.depth ?? 4,
      caseSensitive: entry.caseSensitive ?? ext.case_sensitive ?? false,
      scanDepth: entry.scanDepth ?? ext.scan_depth ?? 10,
      useProbability: entry.useProbability ?? ext.useProbability ?? false,
      probability: entry.probability ?? ext.probability ?? 100,
      preventRecursion: entry.preventRecursion ?? ext.prevent_recursion ?? false,
      excludeRecursion: entry.excludeRecursion ?? ext.exclude_recursion ?? false,
      cooldown: entry.cooldown ?? ext.cooldown ?? 0,
      delay: entry.delay ?? ext.delay ?? 0,
      group: String(groupVal).trim(),
      groupOverride: entry.groupOverride ?? ext.group_override ?? false,
      groupWeight: entry.groupWeight ?? ext.group_weight ?? 100,
      scanRole: null,
      role: null,
      tokenBudget: entry.tokenBudget ?? 0,
      createdAt: now,
      updatedAt: now,
    };
  });

  const bookName = characterBook.name
    ? `${charName} - ${characterBook.name}`
    : `${charName} 世界书`;

  return { name: bookName, entries: parsedEntries };
}

// ==================== 工具函数 ====================

/**
 * 将 ArrayBuffer 转换为 Base64 字符串
 * 兼容浏览器和 Node.js 环境
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * 将图片 buffer 缩放并转为 base64 data URI，用于头像显示
 * 保持 PNG 格式以保留透明通道，限制最大 256px
 */
function resizeImageToAvatar(buffer: ArrayBuffer, maxSize = 256): Promise<string> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // 如果图片已经小于最大尺寸，直接用原始 base64
      if (width <= maxSize && height <= maxSize) {
        resolve(`data:image/png;base64,${arrayBufferToBase64(buffer)}`);
        return;
      }

      // 等比缩放
      if (width > height) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('无法创建 Canvas 上下文'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      // 保持 PNG 格式保留透明通道
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };
    img.src = url;
  });
}

// ==================== 导出 ====================

export function exportRoleCard(role: Role): void {
  const card = roleToTavernCard(role);
  const json = JSON.stringify(card, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${role.name.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAllRoles(roles: Role[]): void {
  const data = roles.map(role => roleToTavernCard(role));
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sillytavern_roles_export.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==================== PNG 导出 ====================

/**
 * 将角色卡导出为 PNG 图片（嵌入 chara 数据到 tEXt chunk）
 * 与 SillyTavern 生态完全兼容
 */
export function exportRoleCardAsPNG(role: Role): void {
  const card = roleToTavernCard(role);
  // 更新扩展字段
  if (role.depth_prompt) {
    card.data.extensions = card.data.extensions || {};
    card.data.extensions.depth_prompt = role.depth_prompt;
  }
  if (role.impersonation_prompt) {
    card.data.extensions = card.data.extensions || {};
    card.data.extensions.impersonation_prompt = role.impersonation_prompt;
  }
  if (role.nickname) {
    card.data.extensions = card.data.extensions || {};
    card.data.extensions.nickname = role.nickname;
  }
  if (role.group_only_greetings && role.group_only_greetings.length > 0) {
    card.data.extensions = card.data.extensions || {};
    card.data.extensions.group_only_greetings = role.group_only_greetings;
  }
  if (role.character_book) {
    card.data.character_book = role.character_book;
  }

  const json = JSON.stringify(card);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('无法创建 Canvas');

  // 尝试从角色头像加载图片
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);
    downloadPNGFromCanvas(canvas, json, role.name);
  };
  img.onerror = () => {
    // 头像加载失败，生成默认头像 PNG
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const colors = ['#5B3FD9', '#00CED1', '#FF6B6B', '#4CAF50', '#FF9800', '#E91E63', '#2196F3', '#9C27B0'];
    const color = colors[role.name.charCodeAt(0) % colors.length];
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'white';
    ctx.font = 'bold 256px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(role.name.charAt(0).toUpperCase(), size / 2, size / 2);
    downloadPNGFromCanvas(canvas, json, role.name);
  };
  img.src = role.avatar;
}

/**
 * 从 Canvas 生成 PNG 并嵌入 chara 数据后下载
 */
function downloadPNGFromCanvas(canvas: HTMLCanvasElement, charaData: string, name: string) {
  // 将 JSON 编码为 base64
  const utf8Bytes = new TextEncoder().encode(charaData);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  const base64 = btoa(binary);

  // 从 Canvas 获取 PNG blob
  canvas.toBlob((blob) => {
    if (!blob) throw new Error('PNG 生成失败');
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      // 在 IEND chunk 之前插入 tEXt chunk
      const modified = insertTEXtChunk(buffer, 'chara', base64);
      const url = URL.createObjectURL(new Blob([modified], { type: 'image/png' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
    reader.readAsArrayBuffer(blob);
  }, 'image/png');
}

/**
 * 在 PNG 文件的 IEND chunk 之前插入一个 tEXt chunk
 */
function insertTEXtChunk(pngBuffer: ArrayBuffer, keyword: string, text: string): ArrayBuffer {
  const view = new DataView(pngBuffer);
  const bytes = new Uint8Array(pngBuffer);

  // 找到 IEND chunk 的位置
  let iendOffset = -1;
  let offset = 8; // 跳过 PNG 签名
  while (offset < bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    if (type === 'IEND') {
      iendOffset = offset;
      break;
    }
    offset += 12 + length; // 4(length) + 4(type) + data + 4(CRC)
  }
  if (iendOffset === -1) throw new Error('无效的 PNG 文件');

  // 构建 tEXt chunk: keyword\0text
  const encoder = new TextEncoder();
  const keywordBytes = encoder.encode(keyword);
  const textBytes = encoder.encode(text);
  const chunkData = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
  chunkData.set(keywordBytes);
  chunkData[keywordBytes.length] = 0; // null separator
  chunkData.set(textBytes, keywordBytes.length + 1);

  // CRC: over type + data
  const crcInput = new Uint8Array(4 + chunkData.length);
  crcInput[0] = 0x74; // 't'
  crcInput[1] = 0x45; // 'E'
  crcInput[2] = 0x58; // 'X'
  crcInput[3] = 0x74; // 't'
  crcInput.set(chunkData, 4);
  const crc = crc32(crcInput);

  // 组装新 PNG
  const before = bytes.slice(0, iendOffset);
  const after = bytes.slice(iendOffset);
  const newTextChunk = new Uint8Array(12 + chunkData.length);
  new DataView(newTextChunk.buffer).setUint32(0, chunkData.length); // length
  newTextChunk[4] = 0x74; newTextChunk[5] = 0x45; newTextChunk[6] = 0x58; newTextChunk[7] = 0x74; // 'tEXt'
  newTextChunk.set(chunkData, 8);
  new DataView(newTextChunk.buffer).setUint32(8 + chunkData.length, crc); // CRC

  const result = new Uint8Array(before.length + newTextChunk.length + after.length);
  result.set(before);
  result.set(newTextChunk, before.length);
  result.set(after, before.length + newTextChunk.length);
  return result.buffer;
}

/**
 * CRC32 计算（用于 PNG chunk CRC）
 */
function crc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ==================== 导入 ====================

/**
 * 从文件导入角色卡（支持 .json 和 .png）
 * @returns 解析后的统一角色卡数据
 */
export function importRoleCardFromFile(): Promise<ParsedCharacterCard> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.png,.charx';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('没有选择文件'));
        return;
      }

      try {
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.png')) {
          // PNG 文件：提取 tEXt chunk 中的角色卡数据
          const buffer = await file.arrayBuffer();
          const card = extractCharaFromPNG(buffer);
          if (!card) {
            reject(new Error('无法从 PNG 中提取角色卡数据。该 PNG 可能不包含角色卡信息。'));
            return;
          }
          // 始终用 PNG 图片本身作为头像（PNG角色卡的头像就是图片本身）
          try {
            card.avatar = await resizeImageToAvatar(buffer);
          } catch {
            // 缩放失败，尝试用原始 base64
            card.avatar = `data:image/png;base64,${arrayBufferToBase64(buffer)}`;
          }
          resolve(card);
        } else {
          // JSON 文件
          const text = await file.text();
          const json = JSON.parse(text);
          const card = normalizeCharacterCard(json);
          if (!card) {
            reject(new Error('无法识别的角色卡格式。需要包含 name 字段。'));
            return;
          }
          resolve(card);
        }
      } catch (error: any) {
        reject(new Error(`导入失败: ${error.message}`));
      }
    };
    input.click();
  });
}

/**
 * 批量导入角色
 */
export function importRolesFromFile(): Promise<Omit<Role, 'id' | 'createdAt'>[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('没有选择文件'));
        return;
      }

      try {
        const text = await file.text();
        const json = JSON.parse(text);

        let cards: ParsedCharacterCard[];

        if (Array.isArray(json)) {
          cards = json.map((item: any) => normalizeCharacterCard(item)).filter(Boolean) as ParsedCharacterCard[];
        } else {
          const card = normalizeCharacterCard(json);
          if (!card) {
            reject(new Error('无法识别的角色卡格式'));
            return;
          }
          cards = [card];
        }

        if (cards.length === 0) {
          reject(new Error('文件中没有有效的角色卡'));
          return;
        }

        const roles = cards.map(card => parsedCardToRole(card));
        resolve(roles);
      } catch (error: any) {
        reject(new Error(`导入失败: ${error.message}`));
      }
    };
    input.click();
  });
}

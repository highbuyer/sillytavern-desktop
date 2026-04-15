/**
 * TavernAI 角色卡服务
 * 支持 V2 / V3 规格的角色卡
 * 支持从 JSON 文件和 PNG 图片文件导入
 */

import type { Role } from '../store/useStore';

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
  system_prompt: string;
  creator_notes: string;
  tags: string[];
  creator: string;
  character_version: string;
  avatar: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
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
function normalizeCharacterCard(json: any): ParsedCharacterCard | null {
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
      system_prompt: data.system_prompt || '',
      creator_notes: data.creator_notes || json.creatorcomment || '',
      tags: data.tags || json.tags || [],
      creator: data.creator || '',
      character_version: data.character_version || '',
      avatar: data.avatar || json.avatar || '',
      temperature: data.extensions?.depth_prompt?.prompt ? undefined : undefined,
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
      system_prompt: data.system_prompt || '',
      creator_notes: data.creator_notes || '',
      tags: data.tags || [],
      creator: data.creator || '',
      character_version: data.character_version || '',
      avatar: data.avatar || '',
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      topP: data.topP,
      frequencyPenalty: data.frequencyPenalty,
      presencePenalty: data.presencePenalty,
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
      system_prompt: json.system_prompt || json.prompt || '',
      creator_notes: json.creator_notes || json.creatorcomment || '',
      tags: json.tags || [],
      creator: json.creator || '',
      character_version: json.character_version || '',
      avatar: json.avatar || '',
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
      personality: '',
      scenario: '',
      first_mes: '',
      mes_example: '',
      creator_notes: '',
      system_prompt: role.prompt,
      post_history_instructions: '',
      alternate_greetings: [],
      tags: [],
      creator: 'SillyTavern Desktop',
      character_version: '1.0',
      extensions: {},
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
    description: card.description || card.personality || '',
    avatar: card.avatar || generateDefaultAvatar(card.name),
    prompt: card.system_prompt || card.first_mes || card.description || '',
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

/**
 * TavernAI v2 角色卡服务
 * 支持导入/导出 JSON 格式角色卡
 * PNG 角色卡需要解析 PNG tEXt chunk（浏览器端可借助 canvas）
 */

import type { Role } from '../store/useStore';

// TavernAI v2 角色卡 JSON 结构
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
    // 我们扩展的字段
    avatar?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
  };
}

// 将 Role 转换为 TavernAI v2 角色卡
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

// 将 TavernAI v2 角色卡转换为 Role
export function tavernCardToRole(card: TavernAIV2Card): Omit<Role, 'id' | 'createdAt'> {
  const data = card.data;
  return {
    name: data.name,
    description: data.description || data.personality || '',
    avatar: data.avatar || generateDefaultAvatar(data.name),
    prompt: data.system_prompt || data.first_mes || data.description || '',
    temperature: data.temperature,
    maxTokens: data.maxTokens,
    topP: data.topP,
    frequencyPenalty: data.frequencyPenalty,
    presencePenalty: data.presencePenalty,
  };
}

// 生成默认头像（SVG）
function generateDefaultAvatar(name: string): string {
  const colors = ['#5B3FD9', '#00CED1', '#FF6B6B', '#4CAF50', '#FF9800', '#E91E63', '#2196F3', '#9C27B0'];
  const color = colors[name.charCodeAt(0) % colors.length];
  const initial = name.charAt(0).toUpperCase();
  return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="${color}"/><text x="64" y="75" text-anchor="middle" font-size="48" fill="white" font-family="sans-serif">${initial}</text></svg>`;
}

// 验证角色卡格式
export function validateTavernCard(json: any): { valid: boolean; error?: string } {
  if (!json || typeof json !== 'object') {
    return { valid: false, error: '无效的 JSON 对象' };
  }

  // 检查 spec 字段
  if (json.spec === 'chara_card_v2' && json.data) {
    if (!json.data.name) {
      return { valid: false, error: '角色卡缺少 name 字段' };
    }
    return { valid: true };
  }

  // 兼容：如果直接传入 data 对象
  if (json.name) {
    return { valid: true };
  }

  return { valid: false, error: '不是有效的 TavernAI 角色卡格式' };
}

// 导出角色卡为 JSON 文件
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

// 从文件导入角色卡
export function importRoleCardFromFile(): Promise<TavernAIV2Card> {
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

        // 如果是 data 字段包裹的
        if (json.spec === 'chara_card_v2') {
          const validation = validateTavernCard(json);
          if (!validation.valid) {
            reject(new Error(validation.error));
            return;
          }
          resolve(json);
        } else {
          // 直接就是 data
          const validation = validateTavernCard(json);
          if (!validation.valid) {
            reject(new Error(validation.error));
            return;
          }
          resolve({ spec: 'chara_card_v2', spec_version: '2.0', data: json });
        }
      } catch (error: any) {
        reject(new Error(`导入失败: ${error.message}`));
      }
    };
    input.click();
  });
}

// 批量导出所有角色
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

// 批量导入角色
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

        let cards: TavernAIV2Card[];

        if (Array.isArray(json)) {
          // 批量导入
          cards = json.map((item: any) =>
            item.spec === 'chara_card_v2' ? item : { spec: 'chara_card_v2', spec_version: '2.0', data: item }
          );
        } else if (json.spec === 'chara_card_v2') {
          // 单个导入
          cards = [json];
        } else {
          reject(new Error('不支持的文件格式'));
          return;
        }

        const roles = cards.map(card => tavernCardToRole(card));
        resolve(roles);
      } catch (error: any) {
        reject(new Error(`导入失败: ${error.message}`));
      }
    };
    input.click();
  });
}

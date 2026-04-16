import React from 'react';

export type Message = {
  id: number;
  content: string;
  isUser: boolean;
  timestamp: string;
  attachments?: string[];
};

export type Chat = {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  unread: number;
  msgs: Message[];
  roleId?: number;
  starred?: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
};

export type Role = {
  id: number;
  name: string;
  description: string;
  avatar: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  createdAt: string;
};

export type AIProvider = 'openai' | 'claude' | 'ollama' | 'openrouter';

// SillyTavern 6 注入位置
export type WIPosition =
  | 'before_char'     // 0: 角色定义之前 (system之后)
  | 'after_char'      // 1: 角色定义之后
  | 'before_example'  // 2: 示例消息之前
  | 'after_example'   // 3: 示例消息之后
  | 'before_last'     // 4: 最后一条消息之前
  | 'after_last';     // 5: 最后一条消息之后 (Author's Note位置)

export type WorldInfoEntry = {
  id: number;
  // 基础字段
  keys: string[];              // 主触发关键词列表
  secondaryKeys: string[];     // 次关键词列表
  selectiveLogic: 'AND' | 'OR'; // 主+次关键词组合逻辑
  content: string;             // 条目内容
  comment: string;             // 备注
  name: string;                // 条目名称
  enabled: boolean;
  constant: boolean;           // 常驻注入
  // 位置与顺序
  position: WIPosition;        // 注入位置（6选1）
  order: number;               // 排序/注入顺序
  depth: number;               // 注入深度（插入到倒数第几条消息之前，0=按position）
  // 匹配控制
  caseSensitive: boolean;
  scanDepth: number;           // 扫描最近N条消息
  useProbability: boolean;     // 启用概率触发
  probability: number;         // 触发概率 0-100
  preventRecursion: boolean;   // 防递归（匹配后从扫描文本移除关键词）
  excludeRecursion: boolean;   // 排除递归条目
  // 时序控制
  cooldown: number;            // 触发冷却轮数
  delay: number;               // 延迟触发轮数
  // 分组与过滤
  group: string;               // 分组名
  groupOverride: boolean;      // 组覆盖
  groupWeight: number;         // 组权重
  scanRole: number | null;     // 仅匹配指定角色的消息 (null=所有)
  role: number | null;         // 限制条目对特定角色生效 (null=所有)
  // Token 控制
  tokenBudget: number;         // 单条目token上限 (0=不限)
  // 时间戳
  createdAt: string;
  updatedAt: string;
};

export type WorldInfoSettings = {
  globalTokenBudget: number;    // 全局token预算 (0=不限)
  scanScope: {
    messages: boolean;          // 扫描聊天消息
    charDescription: boolean;   // 扫描角色描述
    charPersonality: boolean;   // 扫描角色人设
    scenario: boolean;          // 扫描场景
    creatorNotes: boolean;      // 扫描作者备注
  };
};

export type WorldBook = {
  name: string;
  entries: WorldInfoEntry[];
};

// ── 扩展程序类型 ──
export type ExtensionId =
  | 'regex'
  | 'memory'
  | 'summarize'
  | 'tts'
  | 'caption'
  | 'translate'
  | 'expressions'
  | 'quick-reply'
  | 'stable-diffusion'
  | 'token-counter'
  | 'vectors'
  | 'connection-manager';

export type ExtensionDefinition = {
  id: ExtensionId;
  name: string;
  description: string;
  icon: string;
  category: 'built-in' | 'third-party';
  version: string;
};

export type ExtensionSettings = Record<ExtensionId, Record<string, any>>;

const defaultWorldInfoSettings: WorldInfoSettings = {
  globalTokenBudget: 0,
  scanScope: {
    messages: true,
    charDescription: true,
    charPersonality: true,
    scenario: true,
    creatorNotes: false,
  },
};

export type Settings = {
  worldInfo: WorldInfoSettings;
  api: {
    activeProvider: AIProvider;
    activeModel: string;
    openaiKey: string;
    openaiUrl: string;
    openaiModel: string;
    claudeKey: string;
    claudeUrl: string;
    claudeModel: string;
    ollamaUrl: string;
    ollamaModel: string;
    openrouterKey: string;
    openrouterUrl: string;
    openrouterModel: string;
    proxyUrl?: string;  // 代理URL
  };
  generation: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    authorsNote: string;
    authorsNotePosition: 'before_last' | 'after_last';
  };
  ui: {
    theme: 'dark' | 'light' | 'auto';
    language: string;
    fontSize: number;
    enableMarkdown: boolean;
    enableTTS: boolean;
  };
  storage: {
    autoSave: boolean;
    backupInterval: number;
  };
};

const mockAvatars = [
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#5B3FD9"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect x="4" y="8" width="32" height="32" rx="6" fill="#00CED1"/></svg>',
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><polygon points="20,4 36,34 4,34" fill="#FF6B6B"/></svg>',
];

const defaultSettings: Settings = {
  worldInfo: {
    globalTokenBudget: 0,
    scanScope: {
      messages: true,
      charDescription: true,
      charPersonality: true,
      scenario: true,
      creatorNotes: false,
    },
  },
  api: {
    activeProvider: 'openai',
    activeModel: 'gpt-4o-mini',
    openaiKey: '',
    openaiUrl: 'https://api.openai.com/v1',
    openaiModel: 'gpt-4o-mini',
    claudeKey: '',
    claudeUrl: 'https://api.anthropic.com/v1',
    claudeModel: 'claude-3-5-sonnet-20241022',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3',
    openrouterKey: '',
    openrouterUrl: 'https://openrouter.ai/api/v1',
    openrouterModel: 'openrouter/auto',
    proxyUrl: '',
  },
  generation: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    authorsNote: '',
    authorsNotePosition: 'before_last' as const,
  },
  ui: {
    theme: 'dark',
    language: 'zh-CN',
    fontSize: 14,
    enableMarkdown: true,
    enableTTS: false,
  },
  storage: {
    autoSave: true,
    backupInterval: 300,
  },
};

const defaultRoles: Role[] = [
  {
    id: 1,
    name: 'AI助手',
    description: '通用AI助手',
    avatar: mockAvatars[0],
    prompt: '你是一个有帮助的AI助手。',
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: '创意作家',
    description: '擅长创意写作',
    avatar: mockAvatars[1],
    prompt: '你是一个创意作家，擅长写故事、诗歌和创意内容。',
    temperature: 0.8,
    maxTokens: 2500,
    topP: 0.95,
    frequencyPenalty: 0.1,
    presencePenalty: 0.1,
    createdAt: new Date().toISOString(),
  },
];

const initialChats: Chat[] = [
  {
    id: 1,
    name: 'AI助手',
    avatar: mockAvatars[0],
    lastMessage: '你好！',
    unread: 0,
    msgs: [{ id: 1, content: '你好！有什么可以帮助你的吗？', isUser: false, timestamp: '10:00' }],
    roleId: 1,
    starred: false,
    tags: ['助手'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: '创意写作',
    avatar: mockAvatars[1],
    lastMessage: '在吗？',
    unread: 3,
    msgs: [
      { id: 2, content: '大家好！', isUser: false, timestamp: '09:30' },
      { id: 3, content: '在吗？', isUser: true, timestamp: '09:31' },
    ],
    roleId: 2,
    starred: true,
    tags: ['写作'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 从localStorage加载数据
const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error(`Error loading ${key} from storage:`, e);
  }
  return defaultValue;
};

/**
 * 安全地将任意值转换为有效字符串
 * 用于清洗世界书条目字段，防止 undefined/[object Object] 注入 prompt
 */
function sanitizeEntryField(val: any): string {
  if (val == null) return '';
  if (typeof val === 'string') {
    if (val === 'undefined' || val === 'null' || val === '[object Object]' || val === '[object Array]') return '';
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(v => sanitizeEntryField(v)).filter(Boolean).join('\n');
  }
  if (typeof val === 'object') {
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
  return str;
}

/**
 * 清洗世界书条目数组，确保所有字段类型安全
 */
function sanitizeWorldBookEntries(entries: WorldInfoEntry[]): WorldInfoEntry[] {
  return entries.map(e => ({
    ...e,
    content: sanitizeEntryField(e.content),
    comment: sanitizeEntryField(e.comment),
    name: sanitizeEntryField(e.name),
    keys: Array.isArray(e.keys) ? e.keys.filter((k): k is string => typeof k === 'string') : [],
    secondaryKeys: Array.isArray(e.secondaryKeys) ? e.secondaryKeys.filter((k): k is string => typeof k === 'string') : [],
  }));
}

const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e: any) {
    console.error(`Error saving ${key} to storage:`, e);
    throw new Error(`存储失败：${e.message || '可能超出浏览器存储限制'}`);
  }
};

const createStore = () => {
  const subscribers = new Set<(state: any) => void>();
  
  // 加载设置后，深度合并默认值，确保新增字段不会因旧数据缺失而 undefined
  const loadedSettings = loadFromStorage<Settings>('sillytavern-settings', defaultSettings);
  const mergedSettings: Settings = {
    ...defaultSettings,
    ...loadedSettings,
    api: { ...defaultSettings.api, ...(loadedSettings.api || {}) },
    generation: { ...defaultSettings.generation, ...(loadedSettings.generation || {}) },
    ui: { ...defaultSettings.ui, ...(loadedSettings.ui || {}) },
    storage: { ...defaultSettings.storage, ...(loadedSettings.storage || {}) },
    worldInfo: { ...defaultSettings.worldInfo, ...(loadedSettings.worldInfo || {}) },
  };

  // ── 迁移：从旧的 worldInfo 键迁移到 worldBooks ──
  let loadedWorldBooks = loadFromStorage<Record<string, WorldBook>>('sillytavern-worldbooks', {});
  let loadedActiveWorldBook = loadFromStorage<string>('sillytavern-active-worldbook', '');

  // 清洗所有已加载的世界书条目数据
  const sanitizeWorldBooks = (books: Record<string, WorldBook>): Record<string, WorldBook> => {
    const sanitized: Record<string, WorldBook> = {};
    for (const [key, book] of Object.entries(books)) {
      sanitized[key] = {
        ...book,
        entries: book.entries ? sanitizeWorldBookEntries(book.entries) : [],
      };
    }
    return sanitized;
  };
  loadedWorldBooks = sanitizeWorldBooks(loadedWorldBooks);

  // 检查旧数据是否存在
  const oldWorldInfoRaw = localStorage.getItem('sillytavern-worldinfo');
  if (oldWorldInfoRaw && Object.keys(loadedWorldBooks).length === 0) {
    try {
      const oldEntries: WorldInfoEntry[] = JSON.parse(oldWorldInfoRaw);
      if (oldEntries && oldEntries.length > 0) {
        loadedWorldBooks = { '默认世界书': { name: '默认世界书', entries: sanitizeWorldBookEntries(oldEntries) } };
        loadedActiveWorldBook = '默认世界书';
      }
    } catch (e) {
      console.error('Migration error:', e);
    }
    localStorage.removeItem('sillytavern-worldinfo');
  }

  // ── 扩展程序状态 ──
  const defaultExtensionSettings: ExtensionSettings = {
    'regex': {},
    'memory': {},
    'summarize': { maxTokens: 500, triggerInterval: 10 },
    'tts': { provider: 'browser', voice: 'default', autoPlay: false },
    'caption': { provider: 'openai', model: 'gpt-4o-mini' },
    'translate': { provider: 'google', sourceLang: 'auto', targetLang: 'zh-CN' },
    'expressions': { spriteFolder: '', defaultExpression: 'neutral' },
    'quick-reply': {},
    'stable-diffusion': { provider: 'local', endpoint: '', model: '' },
    'token-counter': { backend: 'tiktoken' },
    'vectors': { provider: 'openai', model: 'text-embedding-3-small' },
    'connection-manager': {},
  };

  const loadedExtensionEnabled = loadFromStorage<Record<string, boolean>>('sillytavern-extensions-enabled', {});
  const loadedExtensionSettings = loadFromStorage<ExtensionSettings>('sillytavern-extensions-settings', defaultExtensionSettings);

  let state = {
    chats: loadFromStorage<Chat[]>('sillytavern-chats', initialChats),
    roles: loadFromStorage<Role[]>('sillytavern-roles', defaultRoles),
    settings: mergedSettings,
    worldBooks: loadedWorldBooks,
    activeWorldBook: loadedActiveWorldBook,
    worldInfoSettings: loadFromStorage<WorldInfoSettings>('sillytavern-worldinfo-settings', defaultWorldInfoSettings),
    extensionEnabled: loadedExtensionEnabled,
    extensionSettings: loadedExtensionSettings,
  };

  const subscribe = (fn: (state: any) => void) => {
    subscribers.add(fn);
    fn(state);
    return () => { subscribers.delete(fn); };
  };

  const notify = () => {
    // 传递新的 state 引用以确保 React 重新渲染
    // 关键：worldBooks 和 worldInfoSettings 需要新引用，否则 useMemo 依赖检测不到变化
    const newState = {
      ...state,
      worldBooks: state.worldBooks ? { ...state.worldBooks } : state.worldBooks,
      worldInfoSettings: { ...state.worldInfoSettings },
      extensionEnabled: { ...state.extensionEnabled },
      extensionSettings: { ...state.extensionSettings },
    };
    subscribers.forEach((fn) => fn(newState));
    // 自动保存到localStorage
    if (state.settings.storage.autoSave) {
      saveToStorage('sillytavern-chats', state.chats);
      saveToStorage('sillytavern-roles', state.roles);
      saveToStorage('sillytavern-settings', state.settings);
      saveToStorage('sillytavern-worldbooks', state.worldBooks);
      saveToStorage('sillytavern-active-worldbook', state.activeWorldBook);
      saveToStorage('sillytavern-worldinfo-settings', state.worldInfoSettings);
      saveToStorage('sillytavern-extensions-enabled', state.extensionEnabled);
      saveToStorage('sillytavern-extensions-settings', state.extensionSettings);
    }
  };

  const updateChat = (chatId: number, updates: Partial<Chat>) => {
    const chat = state.chats.find((c) => c.id === chatId);
    if (chat) {
      Object.assign(chat, updates, { updatedAt: new Date().toISOString() });
      notify();
    }
  };

  return {
    subscribe,
    getState: () => state,
    
    // Chat operations
    addChat: (chat: Omit<Chat, 'id' | 'createdAt' | 'updatedAt'>) => {
      const newChat: Chat = {
        ...chat,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.chats.push(newChat);
      notify();
      return newChat.id;
    },
    
    updateChat,
    
    deleteChat: (chatId: number) => {
      state.chats = state.chats.filter((c) => c.id !== chatId);
      notify();
    },
    
    addMessage: (chatId: number, content: string, isUser: boolean, attachments?: string[]) => {
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        const newMessage: Message = {
          id: Date.now(),
          content,
          isUser,
          timestamp: new Date().toLocaleTimeString(),
          attachments,
        };
        chat.msgs.push(newMessage);
        chat.lastMessage = content;
        chat.unread = isUser ? chat.unread : chat.unread + 1;
        chat.updatedAt = new Date().toISOString();
        notify();
        return newMessage.id;
      }
      return null;
    },

    updateMessage: (chatId: number, messageId: number, content: string) => {
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        const msg = chat.msgs.find(m => m.id === messageId);
        if (msg) {
          msg.content = content;
          // 更新 lastMessage（如果是最后一条消息）
          if (chat.msgs[chat.msgs.length - 1]?.id === messageId) {
            chat.lastMessage = content.substring(0, 100);
          }
          chat.updatedAt = new Date().toISOString();
          notify();
        }
      }
    },

    deleteMessage: (chatId: number, messageId: number) => {
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) {
        chat.msgs = chat.msgs.filter(m => m.id !== messageId);
        chat.updatedAt = new Date().toISOString();
        notify();
      }
    },
    
    markRead: (chatId: number) => {
      const chat = state.chats.find((c) => c.id === chatId);
      if (chat) { 
        chat.unread = 0; 
        notify(); 
      }
    },
    
    // Role operations
    addRole: (role: Omit<Role, 'id' | 'createdAt'>) => {
      const newRole: Role = {
        ...role,
        id: Date.now(),
        createdAt: new Date().toISOString(),
      };
      state.roles.push(newRole);
      notify();
      return newRole.id;
    },
    
    updateRole: (roleId: number, updates: Partial<Role>) => {
      const role = state.roles.find((r) => r.id === roleId);
      if (role) {
        Object.assign(role, updates);
        notify();
      }
    },
    
    deleteRole: (roleId: number) => {
      state.roles = state.roles.filter((r) => r.id !== roleId);
      notify();
    },
    
    // Settings operations
    updateSettings: (updates: Partial<Settings>) => {
      Object.assign(state.settings, updates);
      notify();
    },
    
    resetSettings: () => {
      state.settings = defaultSettings;
      notify();
    },
    
    // ── World Book Management ──
    getActiveWorldInfo: (): WorldInfoEntry[] => {
      const wb = state.worldBooks[state.activeWorldBook];
      return wb ? wb.entries : [];
    },

    createWorldBook: (name: string) => {
      if (!name.trim() || state.worldBooks[name.trim()]) return;
      state.worldBooks = { ...state.worldBooks, [name.trim()]: { name: name.trim(), entries: [] } };
      state.activeWorldBook = name.trim();
      notify();
    },

    deleteWorldBook: (name: string) => {
      const newWB = { ...state.worldBooks };
      delete newWB[name];
      state.worldBooks = newWB;
      if (state.activeWorldBook === name) {
        const names = Object.keys(state.worldBooks);
        state.activeWorldBook = names.length > 0 ? names[0] : '';
      }
      notify();
    },

    renameWorldBook: (oldName: string, newName: string) => {
      if (!newName.trim() || oldName === newName.trim()) return;
      if (state.worldBooks[newName.trim()]) return;
      const wb = state.worldBooks[oldName];
      if (!wb) return;
      const newWB = { ...state.worldBooks };
      delete newWB[oldName];
      newWB[newName.trim()] = { name: newName.trim(), entries: wb.entries };
      state.worldBooks = newWB;
      if (state.activeWorldBook === oldName) {
        state.activeWorldBook = newName.trim();
      }
      notify();
    },

    duplicateWorldBook: (name: string) => {
      const wb = state.worldBooks[name];
      if (!wb) return;
      let newName = `${name} (副本)`;
      let counter = 1;
      while (state.worldBooks[newName]) {
        newName = `${name} (副本 ${counter++})`;
      }
      state.worldBooks = {
        ...state.worldBooks,
        [newName]: {
          name: newName,
          entries: wb.entries.map(e => ({
            ...e,
            id: Date.now() + Math.random(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          })),
        },
      };
      state.activeWorldBook = newName;
      notify();
    },

    setActiveWorldBook: (name: string) => {
      if (state.worldBooks[name]) {
        state.activeWorldBook = name;
        notify();
      }
    },

    getWorldBookNames: (): string[] => {
      return Object.keys(state.worldBooks).sort();
    },

    importWorldBook: (name: string, entries: WorldInfoEntry[]) => {
      if (!name.trim()) return;
      // 清洗所有条目数据，确保 content/comment/name 等字段为有效字符串
      const sanitizedEntries = entries.map(e => ({
        ...e,
        content: sanitizeEntryField(e.content),
        comment: sanitizeEntryField(e.comment),
        name: sanitizeEntryField(e.name),
        keys: Array.isArray(e.keys) ? e.keys.filter(k => typeof k === 'string') : [],
        secondaryKeys: Array.isArray(e.secondaryKeys) ? e.secondaryKeys.filter(k => typeof k === 'string') : [],
      }));
      state.worldBooks = { ...state.worldBooks, [name.trim()]: { name: name.trim(), entries: sanitizedEntries } };
      state.activeWorldBook = name.trim();
      notify();
    },

    // ── Entry CRUD (operates on active world book) ──
    addWorldInfoEntry: (entry: Omit<WorldInfoEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
      const wb = state.worldBooks[state.activeWorldBook];
      if (!wb) return 0;
      const newEntry: WorldInfoEntry = {
        ...entry,
        content: sanitizeEntryField(entry.content),
        comment: sanitizeEntryField(entry.comment),
        name: sanitizeEntryField(entry.name),
        keys: Array.isArray(entry.keys) ? entry.keys.filter((k): k is string => typeof k === 'string') : [],
        secondaryKeys: Array.isArray(entry.secondaryKeys) ? entry.secondaryKeys.filter((k): k is string => typeof k === 'string') : [],
        id: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      wb.entries = [...wb.entries, newEntry];
      notify();
      return newEntry.id;
    },

    updateWorldInfoEntry: (entryId: number, updates: Partial<WorldInfoEntry>) => {
      const wb = state.worldBooks[state.activeWorldBook];
      if (!wb) return;
      const idx = wb.entries.findIndex((e) => e.id === entryId);
      if (idx !== -1) {
        // 清洗更新数据中的字符串字段
        const sanitizedUpdates: Partial<WorldInfoEntry> = { ...updates };
        if ('content' in sanitizedUpdates) sanitizedUpdates.content = sanitizeEntryField(sanitizedUpdates.content);
        if ('comment' in sanitizedUpdates) sanitizedUpdates.comment = sanitizeEntryField(sanitizedUpdates.comment);
        if ('name' in sanitizedUpdates) sanitizedUpdates.name = sanitizeEntryField(sanitizedUpdates.name);
        if ('keys' in sanitizedUpdates) sanitizedUpdates.keys = Array.isArray(sanitizedUpdates.keys) ? sanitizedUpdates.keys.filter((k): k is string => typeof k === 'string') : [];
        if ('secondaryKeys' in sanitizedUpdates) sanitizedUpdates.secondaryKeys = Array.isArray(sanitizedUpdates.secondaryKeys) ? sanitizedUpdates.secondaryKeys.filter((k): k is string => typeof k === 'string') : [];
        wb.entries = wb.entries.map((e, i) =>
          i === idx ? { ...e, ...sanitizedUpdates, updatedAt: new Date().toISOString() } : e
        );
        notify();
      }
    },

    deleteWorldInfoEntry: (entryId: number) => {
      const wb = state.worldBooks[state.activeWorldBook];
      if (!wb) return;
      wb.entries = wb.entries.filter((e) => e.id !== entryId);
      notify();
    },

    reorderWorldInfo: (orderedIds: number[]) => {
      const wb = state.worldBooks[state.activeWorldBook];
      if (!wb) return;
      const entryMap = new Map(wb.entries.map(e => [e.id, e]));
      const reordered = orderedIds.map((id, idx) => {
        const entry = entryMap.get(id);
        if (entry) return { ...entry, order: idx };
        return null;
      }).filter(Boolean) as WorldInfoEntry[];
      // 保留不在排序列表中的条目
      for (const entry of entryMap.values()) {
        if (!orderedIds.includes(entry.id)) {
          reordered.push({ ...entry });
        }
      }
      wb.entries = reordered;
      notify();
    },

    // WorldInfo settings operations
    updateWorldInfoSettings: (updates: Partial<WorldInfoSettings>) => {
      state.worldInfoSettings = { ...state.worldInfoSettings, ...updates };
      notify();
    },

    // Import/Export
    exportData: () => ({
      chats: state.chats,
      roles: state.roles,
      settings: state.settings,
      worldBooks: state.worldBooks,
      activeWorldBook: state.activeWorldBook,
      worldInfoSettings: state.worldInfoSettings,
      extensionEnabled: state.extensionEnabled,
      extensionSettings: state.extensionSettings,
    }),
    
    importData: (data: { chats?: Chat[]; roles?: Role[]; settings?: Settings; worldBooks?: Record<string, WorldBook>; activeWorldBook?: string; worldInfoSettings?: WorldInfoSettings; extensionEnabled?: Record<string, boolean>; extensionSettings?: ExtensionSettings }) => {
      if (data.chats) state.chats = data.chats;
      if (data.roles) state.roles = data.roles;
      if (data.settings) state.settings = data.settings;
      if (data.worldBooks) state.worldBooks = data.worldBooks;
      if (data.activeWorldBook !== undefined) state.activeWorldBook = data.activeWorldBook;
      if (data.worldInfoSettings) state.worldInfoSettings = data.worldInfoSettings;
      if (data.extensionEnabled) state.extensionEnabled = data.extensionEnabled;
      if (data.extensionSettings) state.extensionSettings = data.extensionSettings;
      notify();
    },

    // ── Extension Management ──
    setExtensionEnabled: (extId: string, enabled: boolean) => {
      state.extensionEnabled = { ...state.extensionEnabled, [extId]: enabled };
      notify();
    },

    updateExtensionSettings: (extId: string, updates: Record<string, any>) => {
      state.extensionSettings = {
        ...state.extensionSettings,
        [extId]: { ...(state.extensionSettings[extId] || {}), ...updates },
      };
      notify();
    },
  };
};

const store = createStore();
export const {
  subscribe, getState, addChat, updateChat, deleteChat, addMessage, updateMessage, deleteMessage, markRead,
  addRole, updateRole, deleteRole, updateSettings, resetSettings, exportData, importData,
  getActiveWorldInfo, createWorldBook, deleteWorldBook, renameWorldBook, duplicateWorldBook,
  setActiveWorldBook, getWorldBookNames, importWorldBook,
  addWorldInfoEntry, updateWorldInfoEntry, deleteWorldInfoEntry, reorderWorldInfo, updateWorldInfoSettings,
  setExtensionEnabled, updateExtensionSettings,
} = store;

// 兼容旧版API
export const messages = {
  addMessage: (chatId: number, content: string, isUser: boolean) => 
    store.addMessage(chatId, content, isUser),
  markRead: store.markRead,
};

export const sendMessage = (chatId: number, content: string) =>
  store.addMessage(chatId, content, true);

// React hook for subscribing to store state
export const useStoreState = () => {
  const [state, setState] = React.useState(getState());
  
  React.useEffect(() => {
    const unsubscribe = subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);
  
  return state;
};

export default store;

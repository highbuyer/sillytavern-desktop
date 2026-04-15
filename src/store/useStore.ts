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

export type Settings = {
  api: {
    openaiKey: string;
    openaiUrl: string;
    claudeKey: string;
    claudeUrl: string;
    ollamaUrl: string;
    openrouterKey: string;
    openrouterUrl: string;
  };
  generation: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
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
  api: {
    openaiKey: '',
    openaiUrl: 'https://api.openai.com/v1',
    claudeKey: '',
    claudeUrl: 'https://api.anthropic.com/v1',
    ollamaUrl: 'http://localhost:11434',
    openrouterKey: '',
    openrouterUrl: 'https://openrouter.ai/api/v1',
  },
  generation: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
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

const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving ${key} to storage:`, e);
  }
};

const createStore = () => {
  const subscribers = new Set<(state: any) => void>();
  
  let state = {
    chats: loadFromStorage<Chat[]>('sillytavern-chats', initialChats),
    roles: loadFromStorage<Role[]>('sillytavern-roles', defaultRoles),
    settings: loadFromStorage<Settings>('sillytavern-settings', defaultSettings),
  };

  const subscribe = (fn: (state: any) => void) => {
    subscribers.add(fn);
    fn(state);
    return () => subscribers.delete(fn);
  };

  const notify = () => {
    subscribers.forEach((fn) => fn(state));
    // 自动保存到localStorage
    if (state.settings.storage.autoSave) {
      saveToStorage('sillytavern-chats', state.chats);
      saveToStorage('sillytavern-roles', state.roles);
      saveToStorage('sillytavern-settings', state.settings);
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
    
    // Import/Export
    exportData: () => ({
      chats: state.chats,
      roles: state.roles,
      settings: state.settings,
    }),
    
    importData: (data: { chats?: Chat[]; roles?: Role[]; settings?: Settings }) => {
      if (data.chats) state.chats = data.chats;
      if (data.roles) state.roles = data.roles;
      if (data.settings) state.settings = data.settings;
      notify();
    },
  };
};

const store = createStore();
export const { subscribe, getState, addChat, updateChat, deleteChat, addMessage, markRead, addRole, updateRole, deleteRole, updateSettings, resetSettings, exportData, importData } = store;

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

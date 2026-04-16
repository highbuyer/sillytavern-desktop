import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStoreState, addChat, addMessage, updateChat, updateMessage, deleteMessage, updateSettings, getState, WorldInfoSettings, WorldInfoEntry } from '../store/useStore';
import { streamChat, abortGeneration, MODEL_LIST, AIServiceConfig, ChatMessage, LogprobData } from '../services/ai';
import { estimateTokens, estimateMessagesTokens, formatTokenCount, getContextUsage } from '../services/tokenCounter';
import { scanWorldInfo, injectWorldInfo, ScanContext, ScanResult } from '../services/worldInfo';
import { useHotkeys } from '../hooks/useHotkeys';
import MessageBubble from './MessageBubble';

import RoleSelector from './RoleSelector';

const ChatRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const endRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<number | null>(null);
  const [showHotkeys, setShowHotkeys] = useState(false);
  const [activeEntries, setActiveEntries] = useState<WorldInfoEntry[]>([]);
  const [activeTokenCount, setActiveTokenCount] = useState(0);
  const abortRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // ── 聊天选项菜单状态 ──
  const [showOptions, setShowOptions] = useState(false);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  // ── 作者注释状态 ──
  const [showAuthorsNote, setShowAuthorsNote] = useState(false);

  // ── 多选删除状态 ──
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMsgIds, setSelectedMsgIds] = useState<Set<number>>(new Set());

  // ── AI 帮答状态 ──
  const [impersonateMode, setImpersonateMode] = useState(false);
  const continuePrefixRef = useRef('');

  // ── CFG 缩放状态 ──
  const [showCfgScale, setShowCfgScale] = useState(false);

  // ── Token 概率状态 ──
  const [showLogprobsPanel, setShowLogprobsPanel] = useState(false);
  const [logprobData, setLogprobData] = useState<LogprobData[]>([]);
  const logprobDataRef = useRef<LogprobData[]>([]);

  // ── Toast 状态 ──
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── 检查点状态 ──
  const [checkpointName, setCheckpointName] = useState('');
  const [showCheckpointInput, setShowCheckpointInput] = useState(false);
  const [showCheckpointMenu, setShowCheckpointMenu] = useState(false);
  const [checkpoints, setCheckpoints] = useState<{ key: string; name: string; timestamp: number }[]>([]);

  const { chats, roles, settings, worldBooks, activeWorldBook, worldInfoSettings } = useStoreState();
  const chat = chats.find(c => String(c.id) === String(id));
  const role = roles.find(r => r.id === chat?.roleId) || roles[0];
  const worldInfo = useMemo(() => {
    const wb = (worldBooks || {})[activeWorldBook || ''];
    return wb ? wb.entries : [];
  }, [worldBooks, activeWorldBook]);

  // 触发历史 ref（跨渲染持久化）
  const triggerHistoryRef = React.useRef(new Map<number, { lastTriggeredTurn: number; triggerCount: number }>());
  // 当前对话轮数 ref
  const currentTurnRef = React.useRef(0);

  useEffect(() => {
    if (!chat && id) {
      navigate('/');
    }
  }, [chat, id, navigate]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.msgs]);

  // ── 点击外部关闭菜单 ──
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
    if (showOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showOptions]);

  // ── ESC 退出多选模式 ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && multiSelectMode) {
        setMultiSelectMode(false);
        setSelectedMsgIds(new Set());
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [multiSelectMode]);

  // ── Toast 自动消失 ──
  useEffect(() => {
    if (toast) {
      toastTimerRef.current = setTimeout(() => setToast(null), 3000);
      return () => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      };
    }
  }, [toast]);

  // ── 加载检查点列表 ──
  const loadCheckpoints = useCallback(() => {
    if (!chat) return;
    const cps: { key: string; name: string; timestamp: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`sillytavern-checkpoint-${chat.id}-`)) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const data = JSON.parse(raw);
            cps.push({ key, name: data.name || key, timestamp: data.timestamp || 0 });
          }
        } catch { /* ignore */ }
      }
    }
    cps.sort((a, b) => b.timestamp - a.timestamp);
    setCheckpoints(cps);
  }, [chat?.id]);

  useEffect(() => { loadCheckpoints(); }, [loadCheckpoints]);

  // 自动更新 handleStop 引用
  const handleStopStable = useCallback(() => {
    abortRef.current = true;
    abortGeneration();
  }, []);

  // 快捷键 - 延迟注册避免引用问题
  const [hotkeysReady, setHotkeysReady] = useState(false);
  useEffect(() => { setHotkeysReady(true); }, []);

  useHotkeys(hotkeysReady ? [
    { key: 'Escape', description: '停止生成', action: handleStopStable },
    { key: '/', description: '聚焦输入框', action: () => inputRef.current?.focus() },
    { key: '?', shift: true, description: '显示快捷键帮助', action: () => setShowHotkeys(prev => !prev) },
  ] : [], true);

  // 输入区域中的快捷键 (Ctrl+N 新建, Ctrl+, 设置) 
  useHotkeys(hotkeysReady ? [
    { key: 'n', ctrl: true, description: '新建聊天', action: () => {
      const newChatId = addChat({
        name: '新聊天',
        avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#4CAF50"/></svg>',
        lastMessage: '', unread: 0, msgs: [], starred: false, tags: [],
      });
      navigate(`/chat/${newChatId}`);
    }},
    { key: ',', ctrl: true, description: '打开设置', action: () => navigate('/settings') },
  ] : [], true);

  // Token 计数
  const tokenInfo = useMemo(() => {
    if (!chat) return null;
    const messages: { role: string; content: string }[] = [];
    if (role?.prompt) {
      messages.push({ role: 'system', content: role.prompt });
    }
    for (const msg of chat.msgs) {
      messages.push({ role: msg.isUser ? 'user' : 'assistant', content: msg.content });
    }
    const used = estimateMessagesTokens(messages);
    const model = MODEL_LIST.find(m => m.id === settings.api.activeModel);
    const maxCtx = model?.maxContext || 8000;
    return getContextUsage(used, maxCtx);
  }, [chat?.msgs, role?.prompt, settings.api.activeModel]);

  // 构建 AI 配置
  const buildAIConfig = useCallback((): AIServiceConfig | null => {
    const api = settings.api;
    const provider = api.activeProvider;

    const config: AIServiceConfig = {
      provider,
      model: api.activeModel,
      apiUrl: '',
      systemPrompt: role?.prompt || '',
      temperature: role?.temperature ?? settings.generation.temperature,
      maxTokens: role?.maxTokens ?? settings.generation.maxTokens,
      topP: role?.topP ?? settings.generation.topP,
      frequencyPenalty: role?.frequencyPenalty ?? settings.generation.frequencyPenalty,
      presencePenalty: role?.presencePenalty ?? settings.generation.presencePenalty,
      proxyUrl: api.proxyUrl,
      cfgScale: settings.generation.cfgScale ?? 1,
      enableLogprobs: settings.generation.showLogprobs ?? false,
    };

    switch (provider) {
      case 'openai':
        if (!api.openaiKey) return null;
        config.apiKey = api.openaiKey;
        config.apiUrl = api.openaiUrl;
        config.model = api.activeModel || api.openaiModel;
        break;
      case 'claude':
        if (!api.claudeKey) return null;
        config.apiKey = api.claudeKey;
        config.apiUrl = api.claudeUrl;
        config.model = api.activeModel || api.claudeModel;
        break;
      case 'ollama':
        config.apiUrl = api.ollamaUrl;
        config.model = api.activeModel || api.ollamaModel;
        break;
      case 'openrouter':
        if (!api.openrouterKey) return null;
        config.apiKey = api.openrouterKey;
        config.apiUrl = api.openrouterUrl;
        config.model = api.activeModel || api.openrouterModel;
        break;
    }

    return config;
  }, [settings, role]);

  // 构建消息列表（含角色卡字段和作者注释注入）
  const buildMessages = useCallback((chatMsgs: typeof chat.msgs): ChatMessage[] => {
    const messages: ChatMessage[] = [];

    // ── 构建系统提示词：使用角色专属 system_prompt 或全局 prompt ──
    let systemPrompt = role?.system_prompt || role?.prompt || '';
    if (systemPrompt) {
      // 替换 {{original}} 占位符（如果有全局 prompt）
      if (systemPrompt.includes('{{original}}') && role?.prompt) {
        systemPrompt = systemPrompt.replace(/\{\{original\}\}/g, role.prompt);
      }
      // 组装角色描述信息
      const charParts: string[] = [];
      if (role?.description) charParts.push(`[角色描述]: ${role.description}`);
      if (role?.personality) charParts.push(`[性格]: ${role.personality}`);
      if (role?.scenario) charParts.push(`[场景]: ${role.scenario}`);
      if (role?.mes_example) charParts.push(`[示例对话]:\n${role.mes_example}`);
      const charInfo = charParts.length > 0 ? charParts.join('\n\n') + '\n\n' : '';
      messages.push({ role: 'system', content: charInfo + systemPrompt });
    }

    const recentMsgs = chatMsgs.slice(-50);
    for (const msg of recentMsgs) {
      const safeContent = typeof msg.content === 'string' ? msg.content : '';
      if (!safeContent) continue;
      messages.push({
        role: msg.isUser ? 'user' : 'assistant',
        content: safeContent,
      });
    }

    // ── 注入后历史指令（post_history_instructions） ──
    const phi = role?.post_history_instructions?.trim();
    if (phi) {
      messages.push({ role: 'system', content: phi });
    }

    // ── 注入作者注释 ──
    const authorsNote = settings.generation.authorsNote?.trim();
    if (authorsNote) {
      const position = settings.generation.authorsNotePosition || 'before_last';
      const noteMsg: ChatMessage = { role: 'system', content: `[作者注释]: ${authorsNote}` };
      const lastNonSystemIdx = messages.map((m, i) => (m.role !== 'system' ? i : -1)).filter(i => i >= 0).pop();
      if (lastNonSystemIdx !== undefined) {
        if (position === 'before_last') {
          messages.splice(lastNonSystemIdx, 0, noteMsg);
        } else {
          messages.splice(lastNonSystemIdx + 1, 0, noteMsg);
        }
      } else {
        messages.push(noteMsg);
      }
    }

    return messages;
  }, [role, settings.generation.authorsNote, settings.generation.authorsNotePosition]);

  // 构建 WorldInfo 增强的消息列表
  const buildWorldInfoMessages = useCallback((chatMsgs: typeof chat.msgs): ChatMessage[] => {
    const baseMessages = buildMessages(chatMsgs);
    // 后向兼容：如果 worldInfoSettings 不存在则使用默认值
    const wiSettings: WorldInfoSettings = worldInfoSettings || {
      globalTokenBudget: 0,
      scanScope: {
        messages: true,
        charDescription: true,
        charPersonality: true,
        scenario: true,
        creatorNotes: false,
      },
    };
    const ctx: ScanContext = {
      role: role ? {
        description: role.description || '',
        personality: '', // Role type doesn't have personality field
        prompt: role.prompt || '',
        name: role.name || '',
      } : undefined,
      worldInfoSettings: wiSettings,
      triggerHistory: triggerHistoryRef.current,
      currentTurn: currentTurnRef.current,
    };
    const scanResult: ScanResult = scanWorldInfo(worldInfo, baseMessages, ctx);
    // 更新激活条目状态供 UI 显示
    setActiveEntries(scanResult.matched);
    setActiveTokenCount(scanResult.totalTokens);

    // 替换 SillyTavern 宏 ({{char}}, {{user}} 等) 为实际值
    const enhanced = injectWorldInfo(scanResult, baseMessages, ctx.role);
    const charName = role?.name || '角色';
    const userName = '用户';
    return enhanced.map(msg => ({
      ...msg,
      // 防御性处理：确保 content 始终为有效字符串再进行宏替换
      content: (typeof msg.content === 'string' ? msg.content : '')
        .replace(/\{\{char\}\}/gi, charName)
        .replace(/\{\{Char\}\}/g, charName)
        .replace(/\{\{user\}\}/gi, userName),
    }));
  }, [buildMessages, worldInfo, worldInfoSettings, role]);

  // 流式生成通用逻辑
  const doStreamGenerate = useCallback(async (chatId: number, messages: ChatMessage[], targetMsgId: number) => {
    const config = buildAIConfig();
    if (!config) {
      updateMessage(chatId, targetMsgId, '请先在设置中配置 API 密钥。点击右上角设置按钮进行配置。');
      setGenerating(false);
      setStreamingMsgId(null);
      return;
    }

    // 重置 logprobs 收集
    logprobDataRef.current = [];
    setLogprobData([]);

    await streamChat(config, messages, {
      onToken: (token) => {
        if (abortRef.current) {
          abortGeneration();
          return;
        }
        const currentChats = getState().chats;
        const currentMsg = currentChats.find(c => c.id === chatId)?.msgs.find(m => m.id === targetMsgId);
        if (currentMsg) {
          updateMessage(chatId, targetMsgId, currentMsg.content + token);
        }
      },
      onDone: (fullText) => {
        updateMessage(chatId, targetMsgId, fullText || '(已停止生成)');
        setGenerating(false);
        setStreamingMsgId(null);
        // 保存收集到的 logprobs
        setLogprobData([...logprobDataRef.current]);
      },
      onError: (error) => {
        updateMessage(chatId, targetMsgId, `错误: ${error.message}`);
        setGenerating(false);
        setStreamingMsgId(null);
      },
      onLogprob: (data) => {
        logprobDataRef.current.push(data);
      },
    });
  }, [buildAIConfig]);



  const handleSend = async () => {
    if (!chat || generating) return;

    // 正常发送模式
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput('');
    abortRef.current = false;

    // 如果处于帮答模式，发送后退出
    if (impersonateMode) {
      setImpersonateMode(false);
    }

    // 递增对话轮数
    currentTurnRef.current += 1;

    addMessage(chat.id, userMessage, true);
    setGenerating(true);

    const aiMsgId = addMessage(chat.id, '', false);
    if (aiMsgId === null) {
      setGenerating(false);
      return;
    }

    setStreamingMsgId(aiMsgId);

    const currentChats = getState().chats;
    const chatMsgs = currentChats.find(c => c.id === chat.id)?.msgs || [];
    const messages = buildWorldInfoMessages(chatMsgs.slice(0, -1));

    await doStreamGenerate(chat.id, messages, aiMsgId);
  };

  const handleStop = () => {
    abortRef.current = true;
    abortGeneration();
  };

  const handleRegenerate = async (messageId: number) => {
    if (!chat || generating) return;

    const messageIndex = chat.msgs.findIndex(m => m.id === messageId);
    if (messageIndex === -1 || chat.msgs[messageIndex].isUser) return;

    deleteMessage(chat.id, messageId);
    setGenerating(true);
    const newMsgId = addMessage(chat.id, '', false);

    if (newMsgId === null) {
      setGenerating(false);
      return;
    }

    setStreamingMsgId(newMsgId);
    abortRef.current = false;

    const currentChats = getState().chats;
    const chatMsgs = currentChats.find(c => c.id === chat.id)?.msgs || [];
    const messages = buildWorldInfoMessages(chatMsgs.slice(0, -1));

    await doStreamGenerate(chat.id, messages, newMsgId);
  };

  // ── 续写功能（仿 SillyTavern: 删最后助手消息→提取文本→续写→追加） ──
  const handleContinue = async () => {
    if (!chat || generating) return;
    setShowOptions(false);

    // 找到最后一条 assistant 消息
    const msgs = [...chat.msgs].reverse();
    const lastAssistantMsg = msgs.find(m => !m.isUser && m.content.trim());
    if (!lastAssistantMsg) return;

    // 保存原文作为续写前缀
    const originalContent = lastAssistantMsg.content;
    continuePrefixRef.current = originalContent;

    // 删除最后一条助手消息（原版逻辑）
    deleteMessage(chat.id, lastAssistantMsg.id);

    setGenerating(true);
    abortRef.current = false;

    // 重新添加空消息用于流式显示
    const newMsgId = addMessage(chat.id, originalContent, false);
    if (newMsgId === null) { setGenerating(false); return; }
    setStreamingMsgId(newMsgId);

    // 构建消息：不包含最后一条（已删除再添加的），加系统续写指令
    const currentChats = getState().chats;
    const chatMsgs = currentChats.find(c => c.id === chat.id)?.msgs || [];
    // 取倒数第二条之前的历史（不含刚添加的续写消息）
    const historyMsgs = chatMsgs.slice(0, -1);
    const messages = buildWorldInfoMessages(historyMsgs);
    // 在末尾添加续写指令
    messages.push({ role: 'system', content: '请继续上一条助手消息的内容，不要重复原文，直接接着写。' });

    const config = buildAIConfig();
    if (!config) {
      updateMessage(chat.id, newMsgId, '请先在设置中配置 API 密钥。');
      setGenerating(false);
      setStreamingMsgId(null);
      return;
    }

    // 重置 logprobs
    logprobDataRef.current = [];
    setLogprobData([]);

    let continuedText = '';
    await streamChat(config, messages, {
      onToken: (token) => {
        if (abortRef.current) { abortGeneration(); return; }
        continuedText += token;
        // 显示：原文 + 续写内容
        updateMessage(chat.id, newMsgId, originalContent + continuedText);
      },
      onDone: (fullText) => {
        // 追加：原文 + 续写文本
        updateMessage(chat.id, newMsgId, originalContent + (continuedText || ''));
        setGenerating(false);
        setStreamingMsgId(null);
        setLogprobData([...logprobDataRef.current]);
      },
      onError: (error) => {
        // 出错时保留原文
        updateMessage(chat.id, newMsgId, originalContent + `\n\n[续写错误: ${error.message}]`);
        setGenerating(false);
        setStreamingMsgId(null);
      },
      onLogprob: (data) => {
        logprobDataRef.current.push(data);
      },
    });
  };

  // ── AI 帮答（仿 SillyTavern: 直接生成→填入 textarea→不保存消息） ──
  const handleImpersonate = async () => {
    if (!chat || generating) return;
    setShowOptions(false);
    setImpersonateMode(true);
    setGenerating(true);
    abortRef.current = false;

    const charName = role?.name || '角色';
    const userName = '用户';

    // 构建消息：当前聊天历史 + impersonation system prompt
    const currentChats = getState().chats;
    const chatMsgs = currentChats.find(c => c.id === chat.id)?.msgs || [];
    const baseMessages = buildMessages(chatMsgs);

    // impersonation prompt（仿原版默认 prompt）
    const impersonationPrompt = `以${userName}的视角写下一条回复，参考上面的聊天历史来把握${userName}的写作风格。不要以${charName}或系统的身份写，也不要描述${charName}的动作。只写出${userName}要说的话。`;

    const impersonateMessages: ChatMessage[] = [
      ...baseMessages,
      { role: 'system', content: impersonationPrompt },
    ];

    const config = buildAIConfig();
    if (!config) {
      setImpersonateMode(false);
      setGenerating(false);
      return;
    }

    let impersonateText = '';
    await streamChat(config, impersonateMessages, {
      onToken: (token) => {
        if (abortRef.current) { abortGeneration(); return; }
        impersonateText += token;
        // 流式填入 textarea
        setInput(impersonateText);
      },
      onDone: (fullText) => {
        setInput(fullText || '');
        setImpersonateMode(true);
        setGenerating(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      },
      onError: (error) => {
        setImpersonateMode(false);
        setGenerating(false);
        setInput('');
      },
    });
  };

  // ── 新建聊天 ──
  const handleNewChat = () => {
    setShowOptions(false);
    const newChatId = addChat({
      name: '新聊天',
      avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#4CAF50"/></svg>',
      lastMessage: '', unread: 0, msgs: [], starred: false, tags: [],
    });
    navigate(`/chat/${newChatId}`);
  };

  // ── 关闭聊天 ──
  const handleCloseChat = () => {
    setShowOptions(false);
    navigate('/');
  };

  // ── 多选删除 ──
  const handleEnterMultiSelect = () => {
    setShowOptions(false);
    setMultiSelectMode(true);
    setSelectedMsgIds(new Set());
  };

  const handleToggleSelect = (msgId: number) => {
    setSelectedMsgIds(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  };

  const handleBatchDelete = () => {
    if (!chat) return;
    for (const msgId of selectedMsgIds) {
      deleteMessage(chat.id, msgId);
    }
    setMultiSelectMode(false);
    setSelectedMsgIds(new Set());
  };

  const handleCancelMultiSelect = () => {
    setMultiSelectMode(false);
    setSelectedMsgIds(new Set());
  };

  // ── 作者注释更新 ──
  const handleAuthorsNoteChange = (value: string) => {
    updateSettings({
      generation: {
        ...settings.generation,
        authorsNote: value,
      },
    } as any);
  };

  const handleAuthorsNotePositionChange = (value: 'before_last' | 'after_last') => {
    updateSettings({
      generation: {
        ...settings.generation,
        authorsNotePosition: value,
      },
    } as any);
  };

  // ── 重新生成（菜单调用） ──
  const handleMenuRegenerate = () => {
    if (!chat || generating) return;
    // 找到最后一条 assistant 消息
    const msgs = [...chat.msgs].reverse();
    const lastAssistantMsg = msgs.find(m => !m.isUser);
    if (lastAssistantMsg) {
      handleRegenerate(lastAssistantMsg.id);
    }
  };

  const handleEditMessage = async (messageId: number, newContent: string) => {
    if (!chat) return;

    updateMessage(chat.id, messageId, newContent);

    // 如果编辑的是用户消息，删除其后的所有消息并重新生成
    const msgIndex = chat.msgs.findIndex(m => m.id === messageId);
    if (msgIndex !== -1 && chat.msgs[msgIndex].isUser) {
      // 删除编辑消息之后的所有消息
      const msgsToDelete = chat.msgs.slice(msgIndex + 1).map(m => m.id);
      for (const delId of msgsToDelete) {
        deleteMessage(chat.id, delId);
      }

      // 重新生成 AI 回复
      if (!generating) {
        setGenerating(true);
        const newMsgId = addMessage(chat.id, '', false);
        if (newMsgId === null) {
          setGenerating(false);
          return;
        }

        setStreamingMsgId(newMsgId);
        abortRef.current = false;

        // 延迟一帧等待 state 更新
        setTimeout(async () => {
          const currentChats = getState().chats;
          const chatMsgs = currentChats.find(c => c.id === chat.id)?.msgs || [];
          const messages = buildWorldInfoMessages(chatMsgs.slice(0, -1));
          await doStreamGenerate(chat.id, messages, newMsgId);
        }, 50);
      }
    }
  };

  const handleRoleChange = (roleId: number) => {
    if (chat) {
      updateChat(chat.id, { roleId });
    }
  };

  const handleDelete = (messageId: number) => {
    if (chat) {
      deleteMessage(chat.id, messageId);
    }
  };

  // ── Toast 显示 ──
  const showToast = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  // ── CFG 缩放变更 ──
  const handleCfgScaleChange = (value: number) => {
    updateSettings({
      generation: {
        ...settings.generation,
        cfgScale: value,
      },
    } as any);
  };

  // ── Token 概率切换 ──
  const handleToggleLogprobs = () => {
    const newVal = !settings.generation.showLogprobs;
    updateSettings({
      generation: {
        ...settings.generation,
        showLogprobs: newVal,
      },
    } as any);
    if (newVal) {
      setShowLogprobsPanel(true);
    }
    setShowOptions(false);
  };

  // ── 保存检查点 ──
  const handleSaveCheckpoint = () => {
    if (!chat) return;
    const name = checkpointName.trim() || `检查点 ${new Date().toLocaleString('zh-CN')}`;
    const key = `sillytavern-checkpoint-${chat.id}-${Date.now()}`;
    try {
      localStorage.setItem(key, JSON.stringify({
        name,
        timestamp: Date.now(),
        chatId: chat.id,
        messages: chat.msgs,
      }));
      setCheckpointName('');
      setShowCheckpointInput(false);
      setShowOptions(false);
      loadCheckpoints();
      showToast(`检查点 "${name}" 已保存`);
    } catch (e: any) {
      showToast(`保存失败: ${e.message}`);
    }
  };

  // ── 加载检查点 ──
  const handleLoadCheckpoint = (key: string) => {
    if (!chat) return;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.messages && Array.isArray(data.messages)) {
        updateChat(chat.id, { msgs: data.messages, lastMessage: data.messages[data.messages.length - 1]?.content?.substring(0, 100) || '' });
        setShowCheckpointMenu(false);
        setShowOptions(false);
        setLogprobData([]);
        logprobDataRef.current = [];
        showToast(`检查点 "${data.name}" 已加载`);
      }
    } catch (e: any) {
      showToast(`加载失败: ${e.message}`);
    }
  };

  // ── 删除检查点 ──
  const handleDeleteCheckpoint = (key: string) => {
    try {
      localStorage.removeItem(key);
      loadCheckpoints();
      showToast('检查点已删除');
    } catch {
      showToast('删除失败');
    }
  };

  // ── 即将推出提示 ──
  const handleComingSoon = (featureName: string) => {
    setShowOptions(false);
    setShowCheckpointMenu(false);
    showToast(`"${featureName}" 功能正在开发中`);
  };

  if (!chat) {
    return <div className="chat-room empty">聊天不存在</div>;
  }

  return (
    <div className="chat-room">
      <div className="chat-header">
        <div className="chat-title">
          <h2>{chat.name}</h2>
          <span className="chat-subtitle">与 {role?.name || 'AI助手'} 的对话</span>
          {tokenInfo && (
            <div className="token-info" style={{ color: tokenInfo.color }}>
              上下文: {tokenInfo.percent}%
            </div>
          )}
        </div>
        <div className="chat-actions">
          <RoleSelector
            selectedRoleId={chat.roleId || roles[0].id}
            onRoleChange={handleRoleChange}
          />



          <button className="btn-icon" onClick={() => navigate(`/chat/${id}/settings`)}>
            设置
          </button>
          <button className="btn-icon" onClick={() => setShowHotkeys(prev => !prev)} title="快捷键 (?)">
            ⌨
          </button>
        </div>
      </div>

      {showHotkeys && (
        <div className="hotkeys-panel">
          <div className="hotkeys-header">
            <h3>快捷键</h3>
            <button className="btn-icon" onClick={() => setShowHotkeys(false)}>X</button>
          </div>
          <div className="hotkeys-grid">
            <div className="hotkey-item"><kbd>Enter</kbd><span>发送消息</span></div>
            <div className="hotkey-item"><kbd>Shift+Enter</kbd><span>换行</span></div>
            <div className="hotkey-item"><kbd>Esc</kbd><span>停止生成</span></div>
            <div className="hotkey-item"><kbd>Ctrl+N</kbd><span>新建聊天</span></div>
            <div className="hotkey-item"><kbd>Ctrl+,</kbd><span>打开设置</span></div>
            <div className="hotkey-item"><kbd>/</kbd><span>聚焦输入框</span></div>
            <div className="hotkey-item"><kbd>Shift+?</kbd><span>显示/隐藏快捷键</span></div>
          </div>
        </div>
      )}

      {/* ── Toast 通知 ── */}
      {toast && (
        <div className="toast-notification">
          <span>{toast}</span>
        </div>
      )}

      {/* ── CFG 缩放面板 ── */}
      {showCfgScale && (
        <div className="cfg-scale-panel">
          <div className="cfg-scale-header">
            <label>🎛️ CFG 缩放</label>
            <div className="cfg-scale-value">{settings.generation.cfgScale ?? 1}</div>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={settings.generation.cfgScale ?? 1}
            onChange={(e) => handleCfgScaleChange(parseFloat(e.target.value))}
          />
          <div className="cfg-scale-hint">
            <span>0</span>
            <span>1 (默认)</span>
            <span>2</span>
          </div>
        </div>
      )}

      {/* ── 检查点输入框 (inline) ── */}
      {showCheckpointInput && (
        <div className="checkpoint-input-area">
          <div className="checkpoint-input-row">
            <input
              type="text"
              className="checkpoint-name-input"
              placeholder="输入检查点名称（可选）"
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveCheckpoint(); if (e.key === 'Escape') { setShowCheckpointInput(false); setCheckpointName(''); } }}
              autoFocus
            />
            <button className="btn-sm btn-primary" onClick={handleSaveCheckpoint}>保存</button>
            <button className="btn-sm btn-secondary" onClick={() => { setShowCheckpointInput(false); setCheckpointName(''); }}>取消</button>
          </div>
        </div>
      )}

      {/* World Info 激活条目标签栏 */}
      {activeEntries.length > 0 && (
        <div className="world-info-active-bar">
          <span className="wi-bar-label">World Info ({activeTokenCount} tok)</span>
          {activeEntries.slice(0, 10).map(entry => (
            <span key={entry.id} className="wi-active-tag" title={entry.comment || entry.name}>
              {entry.name || entry.comment || entry.keys[0] || '未命名'}
            </span>
          ))}
          {activeEntries.length > 10 && (
            <span className="wi-active-tag more">+{activeEntries.length - 10}</span>
          )}
        </div>
      )}

      <div className="messages">
        {chat.msgs.map((message) => (
          <div key={message.id} style={{ position: 'relative' }}>
            {/* 多选模式 checkbox */}
            {multiSelectMode && (
              <input
                type="checkbox"
                className="message-checkbox"
                checked={selectedMsgIds.has(message.id)}
                onChange={() => handleToggleSelect(message.id)}
              />
            )}
            <MessageBubble
              message={message}
              isStreaming={message.id === streamingMsgId}
              onRegenerate={() => handleRegenerate(message.id)}
              onCopy={() => navigator.clipboard.writeText(message.content)}
              onDelete={() => handleDelete(message.id)}
              onEdit={(newContent) => handleEditMessage(message.id, newContent)}
            />
          </div>
        ))}
        {generating && !streamingMsgId && (
          <div className="message-bubble ai typing">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* ── Token 概率面板 ── */}
      {showLogprobsPanel && logprobData.length > 0 && (
        <div className="logprobs-panel">
          <div className="logprobs-header" onClick={() => setShowLogprobsPanel(false)}>
            <span>📊 Token 概率 ({logprobData.length} tokens)</span>
            <span className="logprobs-close">▼</span>
          </div>
          <div className="logprobs-content">
            {logprobData.map((lp, idx) => {
              // 概率颜色映射: logprob > 0 绿色, 0~-2 黄色, <-2 橙色, <-5 红色
              const prob = Math.exp(lp.logprob);
              const pct = Math.round(prob * 100);
              let color = '#4CAF50'; // 高概率 绿
              if (lp.logprob < -5) color = '#F44336'; // 很低 红
              else if (lp.logprob < -2) color = '#FF9800'; // 低 橙
              else if (lp.logprob < 0) color = '#FFEB3B'; // 中等 黄
              const displayToken = lp.token.replace(/\n/g, '↵').replace(/ /g, '␣') || '(empty)';
              return (
                <div
                  key={idx}
                  className="logprob-token"
                  style={{ color }}
                  title={`token: "${lp.token}"\nlogprob: ${lp.logprob.toFixed(3)}\nprobability: ${pct}%${lp.topLogprobs.length > 0 ? '\n\nTop alternatives:\n' + lp.topLogprobs.slice(0, 3).map((t, i) => `  ${i+1}. "${t.token}" (${(Math.exp(t.logprob)*100).toFixed(1)}%)`).join('\n') : ''}`}
                >
                  <span className="logprob-token-text">{displayToken}</span>
                  <span className="logprob-token-pct">{pct}%</span>
                </div>
              );
            })}
          </div>
          <div className="logprobs-legend">
            <span style={{ color: '#4CAF50' }}>高概率</span>
            <span style={{ color: '#FFEB3B' }}>中等</span>
            <span style={{ color: '#FF9800' }}>低概率</span>
            <span style={{ color: '#F44336' }}>很低</span>
          </div>
        </div>
      )}
      {showLogprobsPanel && logprobData.length === 0 && (
        <div className="logprobs-panel logprobs-empty">
          <div className="logprobs-header" onClick={() => setShowLogprobsPanel(false)}>
            <span>📊 Token 概率</span>
            <span className="logprobs-close">▼</span>
          </div>
          <div className="logprobs-empty-msg">
            {settings.generation.showLogprobs ? (generating ? '正在生成，等待数据...' : '当前 API 未返回概率数据，或需要重新发送消息以获取概率信息') : '请先在菜单中启用 Token 概率'}
          </div>
        </div>
      )}

      {/* ── 作者注释区域 ── */}
      {showAuthorsNote && (
        <div className="authors-note-area">
          <div className="authors-note-header">
            <label>📝 作者注释</label>
            <select
              value={settings.generation.authorsNotePosition || 'before_last'}
              onChange={(e) => handleAuthorsNotePositionChange(e.target.value as 'before_last' | 'after_last')}
            >
              <option value="before_last">在最后一条消息之前注入</option>
              <option value="after_last">在最后一条消息之后注入</option>
            </select>
          </div>
          <textarea
            value={settings.generation.authorsNote || ''}
            onChange={(e) => handleAuthorsNoteChange(e.target.value)}
            placeholder="输入作者注释内容，将在发送消息时注入到指定位置..."
          />
        </div>
      )}

      {/* ── 输入栏（仿 SillyTavern 原项目 #send_form 布局） ── */}
      <div className="input-area">
        <div className="send-form">
          {/* 左侧：选项按钮 */}
          <div className="left-send-form">
            <div className="chat-options-menu" ref={optionsMenuRef}>
              <button
                className="send-form-btn"
                onClick={() => setShowOptions(prev => !prev)}
                title="聊天选项"
              >
                ☰
              </button>
              {showOptions && (
                <div className="chat-options-panel">
                  <button onClick={handleNewChat}>
                    <span>✏️</span> 开始新聊天
                  </button>
                  <button onClick={() => { setShowCfgScale(prev => !prev); setShowOptions(false); }}>
                    <span>🎛️</span> {showCfgScale ? '隐藏 CFG 缩放' : 'CFG 缩放'}
                  </button>
                  <button onClick={() => { setShowAuthorsNote(prev => !prev); setShowOptions(false); }}>
                    <span>📝</span> {showAuthorsNote ? '隐藏作者注释' : '作者注释'}
                  </button>
                  <button onClick={handleToggleLogprobs}>
                    <span>📊</span> {settings.generation.showLogprobs ? '隐藏 Token 概率' : 'Token 概率'}
                  </button>
                  <hr />
                  <button
                    className="checkpoint-save-btn"
                    onClick={() => { setShowCheckpointInput(true); setShowOptions(false); }}
                  >
                    <span>💾</span> 保存检查点
                  </button>
                  <div className="checkpoint-load-wrapper">
                    <button
                      className="checkpoint-load-btn"
                      onClick={() => setShowCheckpointMenu(prev => !prev)}
                      disabled={checkpoints.length === 0}
                    >
                      <span>📂</span> 加载检查点 {checkpoints.length > 0 && `(${checkpoints.length})`}
                    </button>
                    {showCheckpointMenu && checkpoints.length > 0 && (
                      <div className="checkpoint-submenu">
                        {checkpoints.map(cp => (
                          <div key={cp.key} className="checkpoint-item">
                            <span
                              className="checkpoint-item-name"
                              onClick={() => handleLoadCheckpoint(cp.key)}
                              title={cp.name}
                            >
                              {cp.name}
                              <span className="checkpoint-item-time">
                                {new Date(cp.timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })}
                              </span>
                            </span>
                            <button
                              className="btn-icon checkpoint-delete-btn"
                              onClick={() => handleDeleteCheckpoint(cp.key)}
                              title="删除"
                            >✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <hr />
                  <button onClick={handleEnterMultiSelect}>
                    <span>🗑️</span> 删除消息
                  </button>
                  <hr />
                  <button onClick={() => handleComingSoon('返回到父级聊天')} disabled>
                    <span>⬆️</span> 返回到父级聊天 <span className="coming-soon-tag">(即将推出)</span>
                  </button>
                  <button onClick={() => handleComingSoon('转换为群聊')} disabled>
                    <span>👥</span> 转换为群聊 <span className="coming-soon-tag">(即将推出)</span>
                  </button>
                  <hr />
                  <button onClick={handleCloseChat}>
                    <span>❌</span> 关闭聊天
                  </button>
                  <hr />
                  <button onClick={() => { handleMenuRegenerate(); setShowOptions(false); }} disabled={generating || chat.msgs.filter(m => !m.isUser).length === 0}>
                    <span>🔄</span> 重新生成
                  </button>
                  <button onClick={() => { handleImpersonate(); setShowOptions(false); }} disabled={generating} title="让 AI 为您撰写消息">
                    <span>👤</span> AI 帮答
                  </button>
                  <button onClick={() => { handleContinue(); setShowOptions(false); }} disabled={generating || chat.msgs.filter(m => !m.isUser && m.content.trim()).length === 0} title="续写上一条消息">
                    <span>➤</span> 续写
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 中间：输入框 */}
          <textarea
            className="send-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !generating) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={impersonateMode ? 'AI 帮答已生成，编辑后按 Enter 发送...' : `发送消息给 ${role?.name || 'AI助手'}...`}
            disabled={generating && !impersonateMode}
            rows={1}
            ref={inputRef}
          />

          {/* 右侧：发送/停止按钮 */}
          <div className="right-send-form">
            {generating ? (
              <button className="send-form-btn btn-stop-inline" onClick={handleStop} title="停止生成">
                ⏹
              </button>
            ) : (
              <button
                className="send-form-btn btn-send-inline"
                onClick={handleSend}
                disabled={!input.trim()}
                title="发送"
              >
                ✈️
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── 多选操作栏 ── */}
      {multiSelectMode && (
        <div className="multi-select-bar">
          <span>已选择 {selectedMsgIds.size} 条消息</span>
          <button
            className="btn-sm btn-danger"
            onClick={handleBatchDelete}
            disabled={selectedMsgIds.size === 0}
          >
            删除选中({selectedMsgIds.size}条)
          </button>
          <button className="btn-sm btn-secondary" onClick={handleCancelMultiSelect}>
            取消
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatRoom;

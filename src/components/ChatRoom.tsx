import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStoreState, addChat, addMessage, updateChat, updateMessage, deleteMessage, updateSettings, getState, WorldInfoSettings, WorldInfoEntry } from '../store/useStore';
import { streamChat, abortGeneration, MODEL_LIST, AIServiceConfig, ChatMessage } from '../services/ai';
import { estimateTokens, estimateMessagesTokens, formatTokenCount, getContextUsage } from '../services/tokenCounter';
import { scanWorldInfo, injectWorldInfo, ScanContext, ScanResult } from '../services/worldInfo';
import { useHotkeys } from '../hooks/useHotkeys';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
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

  // 构建消息列表（含作者注释注入）
  const buildMessages = useCallback((chatMsgs: typeof chat.msgs): ChatMessage[] => {
    const messages: ChatMessage[] = [];
    if (role?.prompt) {
      messages.push({ role: 'system', content: role.prompt });
    }
    const recentMsgs = chatMsgs.slice(-50);
    for (const msg of recentMsgs) {
      // 防御性处理：确保 content 始终为有效字符串
      const safeContent = typeof msg.content === 'string' ? msg.content : '';
      if (!safeContent) continue; // 跳过空内容消息，避免 undefined/null 注入 prompt
      messages.push({
        role: msg.isUser ? 'user' : 'assistant',
        content: safeContent,
      });
    }

    // ── 注入作者注释 ──
    const authorsNote = settings.generation.authorsNote?.trim();
    if (authorsNote) {
      const position = settings.generation.authorsNotePosition || 'before_last';
      const noteMsg: ChatMessage = { role: 'system', content: `[作者注释]: ${authorsNote}` };
      // 找到最后一条非 system 消息的索引
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
      },
      onError: (error) => {
        updateMessage(chatId, targetMsgId, `错误: ${error.message}`);
        setGenerating(false);
        setStreamingMsgId(null);
      },
    });
  }, [buildAIConfig]);

  // ── 续写：流式追加到最后一条 assistant 消息 ──
  const doStreamContinue = useCallback(async (chatId: number, messages: ChatMessage[], targetMsgId: number, existingContent: string) => {
    const config = buildAIConfig();
    if (!config) {
      setGenerating(false);
      return;
    }

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
        // fullText 是 AI 生成的全部内容（不含前缀），追加到已有内容后
        const currentChats = getState().chats;
        const currentMsg = currentChats.find(c => c.id === chatId)?.msgs.find(m => m.id === targetMsgId);
        if (currentMsg) {
          // currentMsg.content 已经通过 onToken 逐步追加了，无需再次处理
        }
        setGenerating(false);
        setStreamingMsgId(null);
      },
      onError: (error) => {
        setGenerating(false);
        setStreamingMsgId(null);
      },
    });
  }, [buildAIConfig]);

  const handleSend = async () => {
    if (!chat || generating) return;

    // AI 帮答模式
    if (impersonateMode) {
      const impersonateInput = input.trim();
      if (!impersonateInput) return;
      setInput('');
      setImpersonateMode(false);
      setGenerating(true);
      abortRef.current = false;
      currentTurnRef.current += 1;

      // 创建一条用户消息，内容是 AI 生成的
      const userMsgId = addMessage(chat.id, '', true);
      if (userMsgId === null) { setGenerating(false); return; }
      setStreamingMsgId(userMsgId);

      // 构建特殊 system prompt：告诉 AI 扮演用户
      const charName = role?.name || '角色';
      const impersonateSystem = `你正在扮演"用户"这个角色，正在与名为"${charName}"的角色对话。\n\n当前的对话上下文：\n`;
      const currentChats = getState().chats;
      const chatMsgs = currentChats.find(c => c.id === chat.id)?.msgs || [];
      const baseMessages = buildMessages(chatMsgs);
      // 构建带帮答 system prompt 的消息列表
      const impersonateMessages: ChatMessage[] = [
        { role: 'system', content: impersonateSystem + `用户的指令：${impersonateInput}\n\n请以"用户"的口吻写一条消息（不要加引号，直接写内容，不要提及你是AI或你正在扮演）：` },
        ...baseMessages.filter(m => m.role !== 'system'),
      ];

      const config = buildAIConfig();
      if (!config) {
        updateMessage(chat.id, userMsgId, '请先在设置中配置 API 密钥。');
        setGenerating(false);
        setStreamingMsgId(null);
        return;
      }

      await streamChat(config, impersonateMessages, {
        onToken: (token) => {
          if (abortRef.current) { abortGeneration(); return; }
          const c = getState().chats.find(c => c.id === chat.id)?.msgs.find(m => m.id === userMsgId);
          if (c) updateMessage(chat.id, userMsgId, c.content + token);
        },
        onDone: (fullText) => {
          updateMessage(chat.id, userMsgId, fullText || '(已停止生成)');
          setGenerating(false);
          setStreamingMsgId(null);
        },
        onError: (error) => {
          updateMessage(chat.id, userMsgId, `错误: ${error.message}`);
          setGenerating(false);
          setStreamingMsgId(null);
        },
      });
      return;
    }

    // 正常发送模式
    if (!input.trim()) return;
    const userMessage = input.trim();
    setInput('');
    abortRef.current = false;

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

  // ── 续写功能 ──
  const handleContinue = async () => {
    if (!chat || generating) return;
    setShowOptions(false);

    // 找到最后一条 assistant 消息
    const msgs = [...chat.msgs].reverse();
    const lastAssistantMsg = msgs.find(m => !m.isUser && m.content.trim());
    if (!lastAssistantMsg) return;

    setGenerating(true);
    setStreamingMsgId(lastAssistantMsg.id);
    abortRef.current = false;

    const currentChats = getState().chats;
    const chatMsgs = currentChats.find(c => c.id === chat.id)?.msgs || [];
    // 发送当前所有消息（包含最后一条 assistant 消息作为已生成内容的上下文）
    const messages = buildWorldInfoMessages(chatMsgs);

    await doStreamContinue(chat.id, messages, lastAssistantMsg.id, lastAssistantMsg.content);
  };

  // ── AI 帮答 ──
  const handleImpersonate = () => {
    if (!chat || generating) return;
    setShowOptions(false);
    setImpersonateMode(true);
    setTimeout(() => inputRef.current?.focus(), 100);
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
    setShowOptions(false);
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

          {/* ── 聊天选项菜单 ── */}
          <div className="chat-options-menu" ref={optionsMenuRef}>
            <button
              className="btn-icon"
              onClick={() => setShowOptions(prev => !prev)}
              title="聊天选项"
              style={{ fontSize: '20px', lineHeight: 1 }}
            >
              ⋮
            </button>
            {showOptions && (
              <div className="chat-options-panel">
                <button onClick={handleNewChat}>
                  <span>✏️</span> 开始新聊天
                </button>
                <button onClick={() => { setShowAuthorsNote(prev => !prev); setShowOptions(false); }}>
                  <span>📝</span> {showAuthorsNote ? '隐藏作者注释' : '作者注释'}
                </button>
                <button onClick={handleMenuRegenerate} disabled={generating || chat.msgs.filter(m => !m.isUser).length === 0}>
                  <span>🔄</span> 重新生成
                </button>
                <button onClick={handleContinue} disabled={generating || chat.msgs.filter(m => !m.isUser && m.content.trim()).length === 0}>
                  <span>➡️</span> 续写
                </button>
                <button onClick={handleImpersonate} disabled={generating}>
                  <span>🎭</span> AI 帮答
                </button>
                <hr />
                <button onClick={handleEnterMultiSelect}>
                  <span>🗑️</span> 删除消息
                </button>
                <hr />
                <button onClick={handleCloseChat}>
                  <span>❌</span> 关闭聊天
                </button>
              </div>
            )}
          </div>

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

      <div className="input-area">
        {/* AI 帮答提示 */}
        {impersonateMode && (
          <div className="impersonate-banner">
            <span>🎭 AI 帮答模式 — 输入指令让 AI 代写用户消息</span>
            <button className="btn-sm btn-secondary" onClick={() => setImpersonateMode(false)}>取消</button>
          </div>
        )}
        {generating && !impersonateMode && (
          <button className="btn-stop" onClick={handleStop}>
            停止生成
          </button>
        )}
        {generating && impersonateMode && (
          <button className="btn-stop" onClick={handleStop}>
            停止生成
          </button>
        )}
        <MessageInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={generating}
          placeholder={impersonateMode ? '输入指令，让 AI 代替你写消息...' : `发送消息给 ${role?.name || 'AI助手'}...`}
        />
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

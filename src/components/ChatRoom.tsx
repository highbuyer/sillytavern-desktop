import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStoreState, addChat, addMessage, updateChat, updateMessage, deleteMessage, getState, WorldInfoSettings, WorldInfoEntry } from '../store/useStore';
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

  const { chats, roles, settings, worldInfo, worldInfoSettings } = useStoreState();
  const chat = chats.find(c => String(c.id) === String(id));
  const role = roles.find(r => r.id === chat?.roleId) || roles[0];

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

  // 构建消息列表
  const buildMessages = useCallback((chatMsgs: typeof chat.msgs): ChatMessage[] => {
    const messages: ChatMessage[] = [];
    if (role?.prompt) {
      messages.push({ role: 'system', content: role.prompt });
    }
    const recentMsgs = chatMsgs.slice(-50);
    for (const msg of recentMsgs) {
      messages.push({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content,
      });
    }
    return messages;
  }, [role]);

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
    return injectWorldInfo(scanResult, baseMessages, ctx.role);
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

  const handleSend = async () => {
    if (!input.trim() || !chat || generating) return;

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
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={message.id === streamingMsgId}
            onRegenerate={() => handleRegenerate(message.id)}
            onCopy={() => navigator.clipboard.writeText(message.content)}
            onDelete={() => handleDelete(message.id)}
            onEdit={(newContent) => handleEditMessage(message.id, newContent)}
          />
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

      <div className="input-area">
        {generating && (
          <button className="btn-stop" onClick={handleStop}>
            停止生成
          </button>
        )}
        <MessageInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={generating}
          placeholder={`发送消息给 ${role?.name || 'AI助手'}...`}
        />
      </div>
    </div>
  );
};

export default ChatRoom;

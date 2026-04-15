import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStoreState, addMessage, updateChat, updateMessage, deleteMessage, AIProvider, getState } from '../store/useStore';
import { streamChat, abortGeneration, MODEL_LIST, getModelsByProvider, AIServiceConfig, ChatMessage } from '../services/ai';
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
  const abortRef = useRef(false);

  const { chats, roles, settings } = useStoreState();
  const chat = chats.find(c => String(c.id) === String(id));
  const role = roles.find(r => r.id === chat?.roleId) || roles[0];

  useEffect(() => {
    if (!chat && id) {
      navigate('/');
    }
  }, [chat, id, navigate]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.msgs]);

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

    // 添加系统提示词
    if (role?.prompt) {
      messages.push({ role: 'system', content: role.prompt });
    }

    // 添加历史消息（限制最近50条避免超出上下文）
    const recentMsgs = chatMsgs.slice(-50);
    for (const msg of recentMsgs) {
      messages.push({
        role: msg.isUser ? 'user' : 'assistant',
        content: msg.content,
      });
    }

    return messages;
  }, [role]);

  const handleSend = async () => {
    if (!input.trim() || !chat || generating) return;

    const userMessage = input.trim();
    setInput('');
    abortRef.current = false;

    // 添加用户消息
    addMessage(chat.id, userMessage, true);

    // 构建 AI 配置
    const config = buildAIConfig();
    if (!config) {
      addMessage(chat.id, '请先在设置中配置 API 密钥。点击右上角设置按钮进行配置。', false);
      return;
    }

    setGenerating(true);

    // 添加占位的 AI 消息
    const aiMsgId = addMessage(chat.id, '', false);

    if (aiMsgId === null) {
      setGenerating(false);
      return;
    }

    setStreamingMsgId(aiMsgId);

    // 获取当前消息列表（包含刚添加的用户消息和空的AI消息）
    const currentChat = getChats();
    const chatMsgs = currentChat.find(c => c.id === chat.id)?.msgs || [];

    // 构建消息（不包含最后一条空的AI消息）
    const messages = buildMessages(chatMsgs.slice(0, -1));

    await streamChat(config, messages, {
      onToken: (token) => {
        if (abortRef.current) {
          abortGeneration();
          return;
        }
        // 更新流式消息内容
        const currentState = getChats();
        const currentMsg = currentState.find(c => c.id === chat.id)?.msgs.find(m => m.id === aiMsgId);
        if (currentMsg) {
          updateMessage(chat.id, aiMsgId, currentMsg.content + token);
        }
      },
      onDone: (fullText) => {
        // 确保最终内容完整
        updateMessage(chat.id, aiMsgId, fullText || '(已停止生成)');
        setGenerating(false);
        setStreamingMsgId(null);
      },
      onError: (error) => {
        updateMessage(chat.id, aiMsgId, `错误: ${error.message}`);
        setGenerating(false);
        setStreamingMsgId(null);
      },
    });
  };

  // 辅助函数获取当前state
  const getChats = () => getState().chats;

  const handleStop = () => {
    abortRef.current = true;
    abortGeneration();
  };

  const handleRegenerate = async (messageId: number) => {
    if (!chat || generating) return;

    const messageIndex = chat.msgs.findIndex(m => m.id === messageId);
    if (messageIndex === -1 || chat.msgs[messageIndex].isUser) return;

    // 删除原AI消息
    deleteMessage(chat.id, messageId);

    // 获取前一条用户消息
    const prevUserMessage = chat.msgs[messageIndex - 1]?.content || '';

    // 重新生成
    const config = buildAIConfig();
    if (!config) {
      addMessage(chat.id, '请先在设置中配置 API 密钥。', false);
      return;
    }

    setGenerating(true);
    const newMsgId = addMessage(chat.id, '', false);

    if (newMsgId === null) {
      setGenerating(false);
      return;
    }

    setStreamingMsgId(newMsgId);
    abortRef.current = false;

    const currentState = getChats();
    const chatMsgs = currentState.find(c => c.id === chat.id)?.msgs || [];
    const messages = buildMessages(chatMsgs.slice(0, -1));

    await streamChat(config, messages, {
      onToken: (token) => {
        if (abortRef.current) {
          abortGeneration();
          return;
        }
        const currentState2 = getChats();
        const currentMsg = currentState2.find(c => c.id === chat.id)?.msgs.find(m => m.id === newMsgId);
        if (currentMsg) {
          updateMessage(chat.id, newMsgId, currentMsg.content + token);
        }
      },
      onDone: (fullText) => {
        updateMessage(chat.id, newMsgId, fullText || '(已停止生成)');
        setGenerating(false);
        setStreamingMsgId(null);
      },
      onError: (error) => {
        updateMessage(chat.id, newMsgId, `错误: ${error.message}`);
        setGenerating(false);
        setStreamingMsgId(null);
      },
    });
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
        </div>
        <div className="chat-actions">
          <RoleSelector
            selectedRoleId={chat.roleId || roles[0].id}
            onRoleChange={handleRoleChange}
          />
          <button className="btn-icon" onClick={() => navigate(`/chat/${id}/settings`)}>
            ⚙️
          </button>
        </div>
      </div>

      <div className="messages">
        {chat.msgs.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={message.id === streamingMsgId}
            onRegenerate={() => handleRegenerate(message.id)}
            onCopy={() => navigator.clipboard.writeText(message.content)}
            onDelete={() => handleDelete(message.id)}
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
            ■ 停止生成
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

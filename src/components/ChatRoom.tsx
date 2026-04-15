import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStoreState, addMessage, updateChat } from '../store/useStore';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import RoleSelector from './RoleSelector';

const ChatRoom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const endRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  
  const { chats, roles, settings } = useStoreState();
  const chat = chats.find(c => String(c.id) === String(id));
  const role = roles.find(r => r.id === chat?.roleId) || roles[0];

  useEffect(() => {
    if (!chat && id) {
      // 如果聊天不存在，重定向到主页
      navigate('/');
    }
  }, [chat, id, navigate]);

  useEffect(() => { 
    endRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [chat?.msgs]);

  const handleSend = async () => { 
    if (!input.trim() || !chat || generating) return;
    
    const userMessage = input.trim();
    setInput('');
    
    // 添加用户消息
    addMessage(chat.id, userMessage, true);
    
    // 生成AI回复
    setGenerating(true);
    try {
      const aiResponse = await generateAIResponse(userMessage, role, settings);
      addMessage(chat.id, aiResponse, false);
    } catch (error) {
      console.error('生成回复失败:', error);
      addMessage(chat.id, '抱歉，生成回复时出错了。', false);
    } finally {
      setGenerating(false);
    }
  };

  const generateAIResponse = async (
    userMessage: string, 
    role: typeof roles[0], 
    settings: typeof settings
  ): Promise<string> => {
    // 模拟AI回复生成
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const responses = [
      `这是根据你的消息"${userMessage}"生成的回复。`,
      `我理解你说的是：${userMessage}`,
      `作为一个${role.name}，我对"${userMessage}"的回应是...`,
      `根据我的角色设定：${role.prompt.substring(0, 50)}...`,
      `这是一个测试回复。在实际应用中，这里会调用真正的AI API。`,
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleRegenerate = (messageId: number) => {
    if (!chat) return;
    
    const messageIndex = chat.msgs.findIndex(m => m.id === messageId);
    if (messageIndex === -1 || chat.msgs[messageIndex].isUser) return;
    
    // 删除原消息并重新生成
    const prevUserMessage = chat.msgs[messageIndex - 1]?.content || '';
    chat.msgs.splice(messageIndex, 1);
    setGenerating(true);
    
    setTimeout(() => {
      const newResponse = `重新生成的回复：${prevUserMessage}`;
      addMessage(chat.id, newResponse, false);
      setGenerating(false);
    }, 1000);
  };

  const handleRoleChange = (roleId: number) => {
    if (chat) {
      updateChat(chat.id, { roleId });
      setSelectedRole(roleId);
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
            onRegenerate={() => handleRegenerate(message.id)}
            onCopy={() => navigator.clipboard.writeText(message.content)}
          />
        ))}
        {generating && (
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

      <MessageInput 
        value={input} 
        onChange={setInput} 
        onSend={handleSend}
        disabled={generating}
        placeholder={`发送消息给 ${role?.name || 'AI助手'}...`}
      />
    </div>
  );
};

export default ChatRoom;

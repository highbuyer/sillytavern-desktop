import React, { useState } from 'react';

interface Message {
  id: number;
  content: string;
  isUser: boolean;
  timestamp: string;
  attachments?: string[];
}

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  onRegenerate, 
  onCopy, 
  onDelete 
}) => {
  const [showActions, setShowActions] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      console.log('消息已复制');
    });
    onCopy?.();
  };

  const renderContent = () => {
    // 简单Markdown渲染（后续可以集成marked库）
    const content = message.content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');
    
    return { __html: content };
  };

  return (
    <div 
      className={`message-bubble ${message.isUser ? 'user' : 'ai'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="message-header">
        <span className="message-sender">
          {message.isUser ? '你' : 'AI'}
        </span>
        <span className="message-time">{message.timestamp}</span>
      </div>
      
      <div 
        className="message-content" 
        dangerouslySetInnerHTML={renderContent()}
      />
      
      {message.attachments && message.attachments.length > 0 && (
        <div className="message-attachments">
          {message.attachments.map((att, idx) => (
            <div key={idx} className="attachment">
              📎 附件 {idx + 1}
            </div>
          ))}
        </div>
      )}
      
      <div className="message-footer">
        <div className="message-actions">
          {showActions && (
            <>
              <button 
                className="message-action-btn" 
                onClick={handleCopy}
                title="复制消息"
              >
                📋
              </button>
              {!message.isUser && onRegenerate && (
                <button 
                  className="message-action-btn"
                  onClick={onRegenerate}
                  title="重新生成"
                >
                  🔄
                </button>
              )}
              {onDelete && (
                <button 
                  className="message-action-btn delete"
                  onClick={onDelete}
                  title="删除消息"
                >
                  🗑️
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;

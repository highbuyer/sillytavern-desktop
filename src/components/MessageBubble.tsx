import React, { useState, useRef, useEffect } from 'react';

interface Message {
  id: number;
  content: string;
  isUser: boolean;
  timestamp: string;
  attachments?: string[];
}

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onEdit?: (newContent: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isStreaming = false,
  onRegenerate,
  onCopy,
  onDelete,
  onEdit,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const contentRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到流式消息底部
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [message.content, isStreaming]);

  // 编辑时自动聚焦
  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.selectionStart = editRef.current.value.length;
    }
  }, [editing]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      console.log('消息已复制');
    });
    onCopy?.();
  };

  const handleEditStart = () => {
    setEditContent(message.content);
    setEditing(true);
    setShowActions(false);
  };

  const handleEditSave = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit?.(editContent.trim());
    }
    setEditing(false);
  };

  const handleEditCancel = () => {
    setEditing(false);
  };

  const renderContent = () => {
    const content = message.content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/\n/g, '<br/>');

    return { __html: content };
  };

  return (
    <div
      className={`message-bubble ${message.isUser ? 'user' : 'ai'} ${isStreaming ? 'streaming' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => !editing && setShowActions(false)}
    >
      <div className="message-header">
        <span className="message-sender">
          {message.isUser ? '你' : 'AI'}
        </span>
        <span className="message-time">{message.timestamp}</span>
        {isStreaming && <span className="streaming-badge">生成中...</span>}
      </div>

      {editing ? (
        <div className="message-edit-area">
          <textarea
            ref={editRef}
            className="message-edit-input"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) handleEditSave();
              if (e.key === 'Escape') handleEditCancel();
            }}
          />
          <div className="message-edit-actions">
            <button className="btn-primary btn-sm" onClick={handleEditSave}>保存 (Ctrl+Enter)</button>
            <button className="btn-secondary btn-sm" onClick={handleEditCancel}>取消 (Esc)</button>
          </div>
        </div>
      ) : (
        <div
          ref={contentRef}
          className="message-content"
          dangerouslySetInnerHTML={renderContent()}
        />
      )}

      {message.attachments && message.attachments.length > 0 && (
        <div className="message-attachments">
          {message.attachments.map((att, idx) => (
            <div key={idx} className="attachment">
              📎 附件 {idx + 1}
            </div>
          ))}
        </div>
      )}

      {!editing && (
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
                {message.isUser && onEdit && (
                  <button
                    className="message-action-btn"
                    onClick={handleEditStart}
                    title="编辑消息"
                  >
                    ✏️
                  </button>
                )}
                {!message.isUser && !isStreaming && onRegenerate && (
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
      )}
    </div>
  );
};

export default MessageBubble;

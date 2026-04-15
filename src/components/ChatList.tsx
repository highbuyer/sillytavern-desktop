import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreState, addChat, updateChat, deleteChat } from '../store/useStore';

interface ContextMenu {
  x: number;
  y: number;
  chatId: number | null;
}

const ChatList: React.FC = () => {
  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenu>({ x: 0, y: 0, chatId: null });
  const [editingChat, setEditingChat] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const navigate = useNavigate();
  const { chats } = useStoreState();
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(search.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(search.toLowerCase()) ||
    chat.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
  );

  const handleContextMenu = (e: React.MouseEvent, chatId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, chatId });
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
      setContextMenu({ x: 0, y: 0, chatId: null });
    }
  };

  const handleRename = () => {
    if (contextMenu.chatId && editName.trim()) {
      updateChat(contextMenu.chatId, { name: editName.trim() });
      setEditingChat(null);
      setEditName('');
    }
    setContextMenu({ x: 0, y: 0, chatId: null });
  };

  const handleDelete = () => {
    if (contextMenu.chatId) {
      if (window.confirm('确定要删除这个聊天吗？此操作无法撤销。')) {
        deleteChat(contextMenu.chatId);
      }
    }
    setContextMenu({ x: 0, y: 0, chatId: null });
  };

  const handleStar = () => {
    if (contextMenu.chatId) {
      const chat = chats.find(c => c.id === contextMenu.chatId);
      if (chat) {
        updateChat(contextMenu.chatId, { starred: !chat.starred });
      }
    }
    setContextMenu({ x: 0, y: 0, chatId: null });
  };

  const handleNewChat = () => {
    const newChatId = addChat({
      name: '新聊天',
      avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#4CAF50"/></svg>',
      lastMessage: '',
      unread: 0,
      msgs: [],
      starred: false,
      tags: [],
    });
    navigate(`/chat/${newChatId}`);
  };

  useEffect(() => {
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="chat-list">
      <input 
        className="search-input" 
        placeholder="搜索聊天..." 
        value={search} 
        onChange={(e) => setSearch(e.target.value)} 
      />
      
      <div className="chat-toolbar">
        <button className="btn-primary" onClick={handleNewChat}>
          <span>+</span> 新建聊天
        </button>
        <button className="btn-secondary" onClick={() => navigate('/roles')}>
          <span>👤</span> 角色管理
        </button>
      </div>

      {filteredChats.map((chat) => (
        <div 
          key={chat.id} 
          className={`chat-item ${chat.starred ? 'starred' : ''}`}
          onClick={() => navigate(`/chat/${chat.id}`)}
          onContextMenu={(e) => handleContextMenu(e, chat.id)}
        >
          <div className="chat-item-header">
            <img src={chat.avatar} alt={chat.name} />
            <div className="chat-info">
              <div className="chat-name-row">
                {editingChat === chat.id ? (
                  <input
                    className="edit-name-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                    autoFocus
                  />
                ) : (
                  <div className="chat-name">{chat.name}</div>
                )}
                {chat.starred && <span className="star-icon">⭐</span>}
              </div>
              <div className="chat-lastmsg">{chat.lastMessage || '暂无消息'}</div>
              <div className="chat-meta">
                <span className="chat-time">{new Date(chat.updatedAt).toLocaleDateString()}</span>
                {chat.tags?.map(tag => (
                  <span key={tag} className="chat-tag">{tag}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="chat-item-footer">
            {chat.unread > 0 && <span className="unread-badge">{chat.unread}</span>}
          </div>
        </div>
      ))}

      {contextMenu.chatId && (
        <div
          ref={contextMenuRef}
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="context-menu-item" onClick={() => {
            const chat = chats.find(c => c.id === contextMenu.chatId);
            setEditName(chat?.name || '');
            setEditingChat(contextMenu.chatId);
          }}>
            ✏️ 重命名
          </div>
          <div className="context-menu-item" onClick={handleStar}>
            {chats.find(c => c.id === contextMenu.chatId)?.starred ? '★ 取消星标' : '☆ 标记星标'}
          </div>
          <div className="context-menu-item" onClick={() => navigate(`/chat/${contextMenu.chatId}/settings`)}>
            ⚙️ 聊天设置
          </div>
          <div className="context-menu-divider" />
          <div className="context-menu-item delete" onClick={handleDelete}>
            🗑️ 删除聊天
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatList;

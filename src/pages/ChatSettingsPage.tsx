import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStoreState, updateChat, deleteChat } from '../store/useStore';

const ChatSettingsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { chats, roles } = useStoreState();
  const chat = chats.find(c => String(c.id) === String(id));

  const [form, setForm] = useState({
    name: '',
    avatar: '',
    roleId: 0,
    tags: [] as string[],
    starred: false,
  });

  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (chat) {
      setForm({
        name: chat.name,
        avatar: chat.avatar,
        roleId: chat.roleId || roles[0]?.id || 0,
        tags: chat.tags || [],
        starred: chat.starred || false,
      });
    } else {
      navigate('/');
    }
  }, [chat, roles, navigate]);

  const handleSave = () => {
    if (chat) {
      updateChat(chat.id, form);
      navigate(`/chat/${chat.id}`);
    }
  };

  const handleDelete = () => {
    if (chat && window.confirm('确定要删除这个聊天吗？所有消息将永久丢失。')) {
      deleteChat(chat.id);
      navigate('/');
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      setForm(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  if (!chat) {
    return <div className="chat-settings">聊天不存在</div>;
  }

  return (
    <div className="chat-settings">
      <div className="page-header">
        <h1>聊天设置</h1>
        <div className="page-actions">
          <button className="btn-secondary" onClick={() => navigate(`/chat/${id}`)}>
            ← 返回聊天
          </button>
        </div>
      </div>

      <div className="settings-form">
        <div className="form-section">
          <h3>基本信息</h3>
          <div className="form-group">
            <label>聊天名称</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="输入聊天名称"
            />
          </div>

          <div className="form-group">
            <label>聊天头像</label>
            <input
              type="text"
              value={form.avatar}
              onChange={(e) => setForm(prev => ({ ...prev, avatar: e.target.value }))}
              placeholder="输入头像URL或SVG"
            />
            <div className="avatar-preview">
              <img src={form.avatar || chat.avatar} alt="头像预览" />
            </div>
          </div>

          <div className="form-group">
            <label>角色</label>
            <select
              value={form.roleId}
              onChange={(e) => setForm(prev => ({ ...prev, roleId: parseInt(e.target.value) }))}
            >
              <option value={0}>无角色</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={form.starred}
                onChange={(e) => setForm(prev => ({ ...prev, starred: e.target.checked }))}
              />
              <span className="checkbox-label">星标聊天</span>
            </label>
          </div>
        </div>

        <div className="form-section">
          <h3>标签</h3>
          <div className="form-group">
            <div className="tag-input">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="输入标签并按Enter添加"
              />
              <button type="button" onClick={handleAddTag}>
                添加
              </button>
            </div>
            <div className="tags-container">
              {form.tags.map(tag => (
                <span key={tag} className="tag">
                  {tag}
                  <button
                    type="button"
                    className="tag-remove"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    ×
                  </button>
                </span>
              ))}
              {form.tags.length === 0 && (
                <p className="hint">暂无标签</p>
              )}
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>聊天信息</h3>
          <div className="info-grid">
            <div className="info-item">
              <strong>创建时间:</strong>
              <span>{new Date(chat.createdAt).toLocaleString()}</span>
            </div>
            <div className="info-item">
              <strong>最后更新:</strong>
              <span>{new Date(chat.updatedAt).toLocaleString()}</span>
            </div>
            <div className="info-item">
              <strong>消息数量:</strong>
              <span>{chat.msgs.length}</span>
            </div>
            <div className="info-item">
              <strong>未读消息:</strong>
              <span>{chat.unread}</span>
            </div>
          </div>
        </div>

        <div className="form-section danger">
          <h3>危险操作</h3>
          <div className="danger-actions">
            <button className="btn-danger" onClick={handleDelete}>
              🗑️ 删除聊天
            </button>
            <button className="btn-secondary" onClick={() => {
              const data = JSON.stringify(chat, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `sillytavern-chat-${chat.id}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}>
              💾 导出聊天记录
            </button>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate(`/chat/${id}`)}>
            取消
          </button>
          <button type="button" className="btn-primary" onClick={handleSave}>
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatSettingsPage;
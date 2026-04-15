import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreState, addRole, updateRole, deleteRole } from '../store/useStore';
import RoleEditor from '../components/RoleEditor';

const RolesPage: React.FC = () => {
  const navigate = useNavigate();
  const { roles } = useStoreState();
  const [editingRole, setEditingRole] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(search.toLowerCase()) ||
    role.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateRole = () => {
    const newRoleId = addRole({
      name: '新角色',
      description: '角色描述',
      avatar: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#2196F3"/></svg>',
      prompt: '你是一个新角色。',
      temperature: 0.7,
      maxTokens: 2000,
      topP: 0.9,
      frequencyPenalty: 0.0,
      presencePenalty: 0.0,
    });
    setEditingRole(newRoleId);
  };

  const handleSaveRole = (roleId: number, updates: any) => {
    updateRole(roleId, updates);
    setEditingRole(null);
  };

  const handleDeleteRole = (roleId: number) => {
    if (window.confirm('确定要删除这个角色吗？此操作无法撤销。')) {
      deleteRole(roleId);
    }
  };

  const handleImport = () => {
    // 导入角色功能（占位）
    alert('导入功能开发中...');
  };

  const handleExport = () => {
    const data = JSON.stringify(roles, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sillytavern-roles.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="roles-page">
      <div className="page-header">
        <h1>角色管理</h1>
        <div className="page-actions">
          <button className="btn-primary" onClick={handleCreateRole}>
            + 创建角色
          </button>
          <button className="btn-secondary" onClick={handleImport}>
            📥 导入
          </button>
          <button className="btn-secondary" onClick={handleExport}>
            📤 导出
          </button>
          <button className="btn-back" onClick={() => navigate('/')}>
            ← 返回
          </button>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="搜索角色..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {editingRole ? (
        <div className="role-editor-container">
          <h2>编辑角色</h2>
          <RoleEditor
            role={roles.find(r => r.id === editingRole)}
            onSave={(updates) => handleSaveRole(editingRole, updates)}
            onCancel={() => setEditingRole(null)}
          />
        </div>
      ) : (
        <div className="roles-grid">
          {filteredRoles.map(role => (
            <div key={role.id} className="role-card">
              <div className="role-card-header">
                <img src={role.avatar} alt={role.name} className="role-avatar" />
                <div className="role-card-info">
                  <h3>{role.name}</h3>
                  <p className="role-description">{role.description}</p>
                </div>
                <div className="role-card-actions">
                  <button 
                    className="btn-icon" 
                    onClick={() => setEditingRole(role.id)}
                    title="编辑"
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn-icon delete"
                    onClick={() => handleDeleteRole(role.id)}
                    title="删除"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div className="role-card-body">
                <div className="role-prompt-preview">
                  {role.prompt.length > 100 
                    ? `${role.prompt.substring(0, 100)}...` 
                    : role.prompt}
                </div>
                
                <div className="role-params">
                  <span className="param">
                    <strong>温度:</strong> {role.temperature}
                  </span>
                  <span className="param">
                    <strong>最大令牌:</strong> {role.maxTokens}
                  </span>
                  <span className="param">
                    <strong>Top-P:</strong> {role.topP}
                  </span>
                  <span className="param">
                    <strong>创建时间:</strong> {new Date(role.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              <div className="role-card-footer">
                <button 
                  className="btn-small"
                  onClick={() => {
                    // 使用此角色创建新聊天
                    const chatId = Date.now();
                    // 这里需要实现创建聊天逻辑
                    navigate(`/chat/${chatId}`);
                  }}
                >
                  使用此角色聊天
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredRoles.length === 0 && (
        <div className="empty-state">
          <p>没有找到匹配的角色</p>
          <button className="btn-primary" onClick={handleCreateRole}>
            创建第一个角色
          </button>
        </div>
      )}
    </div>
  );
};

export default RolesPage;
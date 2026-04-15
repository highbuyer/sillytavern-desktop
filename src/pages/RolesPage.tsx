import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreState, addRole, updateRole, deleteRole, addChat, importWorldBook } from '../store/useStore';
import RoleEditor from '../components/RoleEditor';
import { importRoleCardFromFile, exportRoleCard, importRolesFromFile, exportAllRoles, parsedCardToRole, extractWorldBookFromCharacterBook } from '../services/characterCard';

const RolesPage: React.FC = () => {
  const navigate = useNavigate();
  const { roles } = useStoreState();
  const [editingRole, setEditingRole] = useState<number | null>(null);
  const [creatingRole, setCreatingRole] = useState(false);
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);

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
    setCreatingRole(true);
    setEditingRole(newRoleId);
  };

  const handleCancelEdit = () => {
    // 如果是新建的角色，取消时删除
    if (creatingRole && editingRole !== null) {
      deleteRole(editingRole);
    }
    setEditingRole(null);
    setCreatingRole(false);
  };

  const handleSaveRole = (roleId: number, updates: any) => {
    updateRole(roleId, updates);
    setEditingRole(null);
    setCreatingRole(false);
  };

  const handleDeleteRole = (roleId: number) => {
    if (window.confirm('确定要删除这个角色吗？此操作无法撤销。')) {
      deleteRole(roleId);
      if (editingRole === roleId) setEditingRole(null);
    }
  };

  const handleImportSingle = async () => {
    try {
      const card = await importRoleCardFromFile();
      const roleData = parsedCardToRole(card);
      const newRoleId = addRole(roleData);

      // 解析角色卡中嵌入的世界书
      if (card.character_book) {
        const worldBook = extractWorldBookFromCharacterBook(card.character_book, card.name);
        if (worldBook && worldBook.entries.length > 0) {
          importWorldBook(worldBook.name, worldBook.entries);
          alert(`成功导入角色: ${card.name}\n同时导入了世界书「${worldBook.name}」（${worldBook.entries.length} 条）`);
        } else {
          alert(`成功导入角色: ${card.name}`);
        }
      } else {
        alert(`成功导入角色: ${card.name}`);
      }

      setEditingRole(newRoleId);
    } catch (error: any) {
      if (error.message?.includes('quota') || error.message?.includes('QuotaExceededError') || error.message?.includes('exceeded the quota')) {
        alert('导入失败：头像图片太大，超出了浏览器存储限制。请尝试使用较小的角色卡图片。');
      } else {
        alert(error.message);
      }
    }
  };

  const handleImportBatch = async () => {
    setImporting(true);
    try {
      const importedRoles = await importRolesFromFile();
      for (const roleData of importedRoles) {
        addRole(roleData);
      }
      alert(`成功导入 ${importedRoles.length} 个角色`);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setImporting(false);
    }
  };

  const handleExportSingle = (roleId: number) => {
    const role = roles.find(r => r.id === roleId);
    if (role) {
      exportRoleCard(role);
    }
  };

  const handleExportAll = () => {
    exportAllRoles(roles);
  };

  const handleUseRole = (roleId: number) => {
    const role = roles.find(r => r.id === roleId);
    const newChatId = addChat({
      name: role?.name || '新聊天',
      avatar: role?.avatar || '',
      lastMessage: '',
      unread: 0,
      msgs: [],
      starred: false,
      tags: [],
      roleId: roleId,
    });
    navigate(`/chat/${newChatId}`);
  };

  return (
    <div className="roles-page">
      <div className="page-header">
        <h1>角色管理</h1>
        <div className="page-actions">
          <button className="btn-primary" onClick={handleCreateRole}>
            + 创建角色
          </button>
          <button className="btn-secondary" onClick={handleImportSingle} disabled={importing}>
            导入角色卡
          </button>
          <button className="btn-secondary" onClick={handleImportBatch} disabled={importing}>
            {importing ? '导入中...' : '批量导入'}
          </button>
          <button className="btn-secondary" onClick={handleExportAll}>
            导出全部
          </button>
          <button className="btn-secondary" onClick={() => navigate('/')}>
            返回
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
            onCancel={handleCancelEdit}
          />
        </div>
      ) : (
        <div className="roles-grid">
          {filteredRoles.map(role => (
            <div key={role.id} className="role-card">
              <div className="role-card-header">
                <img
                  src={role.avatar}
                  alt={role.name}
                  className="role-card-avatar"
                  onError={(e) => {
                    const el = e.currentTarget;
                    el.style.display = 'none';
                    const fallback = el.parentElement?.querySelector('.role-card-avatar-fallback') as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
                <div className="role-card-avatar-fallback" style={{ display: 'none' }}>
                  {(role.name || '?').charAt(0).toUpperCase()}
                </div>
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
                    编辑
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleExportSingle(role.id)}
                    title="导出角色卡"
                  >
                    导出
                  </button>
                  <button
                    className="btn-icon delete"
                    onClick={() => handleDeleteRole(role.id)}
                    title="删除"
                  >
                    删除
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
                </div>
              </div>

              <div className="role-card-footer">
                <button
                  className="btn-small btn-primary"
                  onClick={() => handleUseRole(role.id)}
                >
                  使用此角色聊天
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredRoles.length === 0 && !editingRole && (
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

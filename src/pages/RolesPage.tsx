import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreState, addRole, updateRole, deleteRole, duplicateRole, toggleRoleFav, addChat, importWorldBook } from '../store/useStore';
import RoleEditor from '../components/RoleEditor';
import { importRoleCardFromFile, exportRoleCard, importRolesFromFile, exportAllRoles, parsedCardToRole, extractWorldBookFromCharacterBook } from '../services/characterCard';

type SortMode = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'fav';

const RolesPage: React.FC = () => {
  const navigate = useNavigate();
  const { roles } = useStoreState();
  const [editingRole, setEditingRole] = useState<number | null>(null);
  const [creatingRole, setCreatingRole] = useState(false);
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [showFavOnly, setShowFavOnly] = useState(false);

  const filteredAndSortedRoles = useMemo(() => {
    let result = roles.filter(role => {
      if (showFavOnly && !role.fav) return false;
      if (search) {
        const q = search.toLowerCase();
        return role.name.toLowerCase().includes(q) ||
          role.description.toLowerCase().includes(q) ||
          (role.tags || []).some(t => t.toLowerCase().includes(q)) ||
          (role.creator || '').toLowerCase().includes(q);
      }
      return true;
    });

    switch (sortMode) {
      case 'newest': result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
      case 'oldest': result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); break;
      case 'name-asc': result.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')); break;
      case 'name-desc': result.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN')); break;
      case 'fav': result.sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); break;
    }
    return result;
  }, [roles, search, sortMode, showFavOnly]);

  const handleCreateRole = () => {
    const newRoleId = addRole({
      name: '新角色', description: '', avatar: '',
      prompt: '你是一个新角色。',
      tags: [], fav: false, talkativeness: 50,
    });
    setCreatingRole(true);
    setEditingRole(newRoleId);
  };

  const handleCancelEdit = () => {
    if (creatingRole && editingRole !== null) deleteRole(editingRole);
    setEditingRole(null);
    setCreatingRole(false);
  };

  const handleSaveRole = (roleId: number, updates: any) => {
    updateRole(roleId, { ...updates, updatedAt: new Date().toISOString() });
    setEditingRole(null);
    setCreatingRole(false);
  };

  const handleDeleteRole = (roleId: number) => {
    if (window.confirm('确定要删除这个角色吗？此操作无法撤销。')) {
      deleteRole(roleId);
      if (editingRole === roleId) setEditingRole(null);
    }
  };

  const handleDuplicateRole = (roleId: number) => {
    duplicateRole(roleId);
  };

  const handleImportSingle = async () => {
    try {
      const card = await importRoleCardFromFile();
      const roleData = parsedCardToRole(card);
      const newRoleId = addRole(roleData);
      if (card.character_book) {
        const worldBook = extractWorldBookFromCharacterBook(card.character_book, card.name);
        if (worldBook && worldBook.entries.length > 0) {
          importWorldBook(worldBook.name, worldBook.entries);
          alert(`成功导入角色: ${card.name}\n同时导入了世界书「${worldBook.name}」（${worldBook.entries.length} 条）`);
        } else { alert(`成功导入角色: ${card.name}`); }
      } else { alert(`成功导入角色: ${card.name}`); }
      setEditingRole(newRoleId);
    } catch (error: any) {
      if (error.message?.includes('quota') || error.message?.includes('QuotaExceededError')) {
        alert('导入失败：头像图片太大，超出浏览器存储限制。');
      } else { alert(error.message); }
    }
  };

  const handleImportBatch = async () => {
    setImporting(true);
    try {
      const importedRoles = await importRolesFromFile();
      for (const roleData of importedRoles) addRole(roleData);
      alert(`成功导入 ${importedRoles.length} 个角色`);
    } catch (error: any) { alert(error.message); }
    finally { setImporting(false); }
  };

  const handleExportSingle = (roleId: number) => {
    const role = roles.find(r => r.id === roleId);
    if (role) exportRoleCard(role);
  };

  const handleExportAll = () => exportAllRoles(roles);

  const handleUseRole = (roleId: number) => {
    const role = roles.find(r => r.id === roleId);
    const msgs = role?.first_mes ? [{ id: Date.now(), content: role.first_mes, isUser: false, timestamp: new Date().toISOString() }] : [];
    const newChatId = addChat({
      name: role?.name || '新聊天', avatar: role?.avatar || '',
      lastMessage: role?.first_mes || '', unread: 0, msgs, starred: false, tags: [],
      roleId,
    });
    navigate(`/chat/${newChatId}`);
  };

  return (
    <div className="roles-page">
      <div className="page-header">
        <h1>角色管理 ({roles.length})</h1>
        <div className="page-actions">
          <button className="btn-primary" onClick={handleCreateRole}>+ 创建角色</button>
          <button className="btn-secondary" onClick={handleImportSingle} disabled={importing}>导入角色卡</button>
          <button className="btn-secondary" onClick={handleImportBatch} disabled={importing}>{importing ? '导入中...' : '批量导入'}</button>
          <button className="btn-secondary" onClick={handleExportAll}>导出全部</button>
          <button className="btn-secondary" onClick={() => navigate('/')}>返回</button>
        </div>
      </div>

      <div className="roles-toolbar">
        <div className="search-bar">
          <input type="text" placeholder="搜索角色（名称、描述、标签、创作者）..." value={search} onChange={(e) => setSearch(e.target.value)} className="search-input" />
        </div>
        <div className="roles-toolbar-right">
          <label className="filter-toggle">
            <input type="checkbox" checked={showFavOnly} onChange={(e) => setShowFavOnly(e.target.checked)} />
            <span>只看收藏</span>
          </label>
          <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} className="sort-select">
            <option value="newest">最新创建</option>
            <option value="oldest">最早创建</option>
            <option value="name-asc">名称 A-Z</option>
            <option value="name-desc">名称 Z-A</option>
            <option value="fav">收藏优先</option>
          </select>
        </div>
      </div>

      {editingRole ? (
        <div className="role-editor-container">
          <h2>{creatingRole ? '创建角色' : '编辑角色'}</h2>
          <RoleEditor
            role={roles.find(r => r.id === editingRole)}
            onSave={(updates) => handleSaveRole(editingRole, updates)}
            onCancel={handleCancelEdit}
          />
        </div>
      ) : (
        <div className="roles-grid">
          {filteredAndSortedRoles.map(role => (
            <div key={role.id} className={`role-card ${role.fav ? 'role-card-fav' : ''}`}>
              <div className="role-card-header">
                <div className="role-card-avatar-wrap" onClick={() => toggleRoleFav(role.id)} title={role.fav ? '取消收藏' : '收藏'}>
                  <img src={role.avatar} alt={role.name} className="role-card-avatar"
                    onError={(e) => { e.currentTarget.style.display = 'none'; const fb = e.currentTarget.parentElement?.querySelector('.role-card-avatar-fallback') as HTMLElement; if (fb) fb.style.display = 'flex'; }}
                  />
                  <div className="role-card-avatar-fallback" style={{ display: 'none' }}>{(role.name || '?').charAt(0).toUpperCase()}</div>
                  {role.fav && <span className="fav-star">★</span>}
                </div>
                <div className="role-card-info">
                  <h3>{role.name}</h3>
                  <p className="role-description">{role.description || '暂无描述'}</p>
                  {(role.tags || []).length > 0 && (
                    <div className="role-tags">{role.tags!.map(t => <span key={t} className="role-tag">{t}</span>)}</div>
                  )}
                </div>
                <div className="role-card-actions">
                  <button className="btn-icon" onClick={() => setEditingRole(role.id)} title="编辑">编辑</button>
                  <button className="btn-icon" onClick={() => handleDuplicateRole(role.id)} title="复制">复制</button>
                  <button className="btn-icon" onClick={() => handleExportSingle(role.id)} title="导出">导出</button>
                  <button className="btn-icon delete" onClick={() => handleDeleteRole(role.id)} title="删除">删除</button>
                </div>
              </div>

              <div className="role-card-body">
                <div className="role-prompt-preview">
                  {(role.personality || role.description || role.prompt).length > 100
                    ? `${(role.personality || role.description || role.prompt).substring(0, 100)}...`
                    : role.personality || role.description || role.prompt}
                </div>
                <div className="role-params">
                  <span className="param"><strong>温度:</strong> {role.temperature}</span>
                  <span className="param"><strong>令牌:</strong> {role.maxTokens}</span>
                  {role.creator && <span className="param"><strong>作者:</strong> {role.creator}</span>}
                  {role.first_mes && <span className="param"><strong>有问候语</strong></span>}
                </div>
              </div>

              <div className="role-card-footer">
                <button className="btn-small btn-primary" onClick={() => handleUseRole(role.id)}>
                  使用此角色聊天
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredAndSortedRoles.length === 0 && !editingRole && (
        <div className="empty-state">
          <p>{search || showFavOnly ? '没有找到匹配的角色' : '还没有角色'}</p>
          <button className="btn-primary" onClick={handleCreateRole}>创建第一个角色</button>
        </div>
      )}
    </div>
  );
};

export default RolesPage;

import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreState, addRole, updateRole, deleteRole, duplicateRole, toggleRoleFav, addChat, importWorldBook } from '../store/useStore';
import RoleEditor from '../components/RoleEditor';
import { importRoleCardFromFile, exportRoleCard, exportRoleCardAsPNG, importRolesFromFile, exportAllRoles, parsedCardToRole, extractWorldBookFromCharacterBook, normalizeCharacterCard } from '../services/characterCard';

type SortMode = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'fav';
type ViewMode = 'grid' | 'list';

// ── Toast 通知系统 ──
type Toast = { id: number; message: string; type: 'success' | 'error' | 'info' };

let toastId = 0;
const toastListeners = new Set<(toasts: Toast[]) => void>();
let toastList: Toast[] = [];

function addToast(message: string, type: Toast['type'] = 'success') {
  const t: Toast = { id: ++toastId, message, type };
  toastList = [...toastList, t];
  toastListeners.forEach(fn => fn(toastList));
  setTimeout(() => {
    toastList = toastList.filter(x => x.id !== t.id);
    toastListeners.forEach(fn => fn(toastList));
  }, 3000);
}

// ── 右键菜单类型 ──
type ContextMenuState = {
  visible: boolean;
  x: number;
  y: number;
  roleId: number | null;
};

const RolesPage: React.FC = () => {
  const navigate = useNavigate();
  const { roles } = useStoreState();
  const [editingRole, setEditingRole] = useState<number | null>(null);
  const [creatingRole, setCreatingRole] = useState(false);
  const [search, setSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, roleId: null });
  const [importConflict, setImportConflict] = useState<{ card: any; existing: any } | null>(null);

  // 订阅 toast
  useEffect(() => {
    const fn = (t: Toast[]) => setToasts([...t]);
    toastListeners.add(fn);
    return () => { toastListeners.delete(fn); };
  }, []);

  // 点击其他地方关闭右键菜单
  useEffect(() => {
    const handler = () => setContextMenu(prev => ({ ...prev, visible: false }));
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const filteredAndSortedRoles = useMemo(() => {
    let result = roles.filter(role => {
      if (showFavOnly && !role.fav) return false;
      if (search) {
        const q = search.toLowerCase();
        return role.name.toLowerCase().includes(q) ||
          (role.nickname || '').toLowerCase().includes(q) ||
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

  // 统计每个角色关联的聊天数
  const chatCounts = useMemo(() => {
    const { chats } = useStoreState() as any;
    if (!chats) return {};
    const counts: Record<number, number> = {};
    for (const chat of chats) {
      if (chat.roleId) counts[chat.roleId] = (counts[chat.roleId] || 0) + 1;
    }
    return counts;
  }, [roles]);

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
    addToast('角色已保存');
  };

  const handleDeleteRole = (roleId: number) => {
    const role = roles.find(r => r.id === roleId);
    if (window.confirm(`确定要删除角色「${role?.name}」吗？此操作无法撤销。`)) {
      deleteRole(roleId);
      if (editingRole === roleId) setEditingRole(null);
      addToast('角色已删除', 'info');
    }
  };

  const handleDuplicateRole = (roleId: number) => {
    duplicateRole(roleId);
    addToast('角色已复制');
  };

  // ── 导入处理（带冲突检测） ──
  const processImportCard = (card: any, forceCreate = false) => {
    const roleData = parsedCardToRole(card);
    // 检查重名
    const existing = roles.find(r => r.name === card.name);
    if (existing && !forceCreate) {
      setImportConflict({ card, existing });
      return;
    }
    // 如果存在且 forceCreate，覆盖
    if (existing && forceCreate) {
      updateRole(existing.id, { ...roleData, updatedAt: new Date().toISOString() });
      if (card.character_book) {
        const worldBook = extractWorldBookFromCharacterBook(card.character_book, card.name);
        if (worldBook && worldBook.entries.length > 0) {
          importWorldBook(worldBook.name, worldBook.entries);
        }
      }
      addToast(`角色「${card.name}」已覆盖更新`);
    } else {
      const newRoleId = addRole(roleData);
      if (card.character_book) {
        const worldBook = extractWorldBookFromCharacterBook(card.character_book, card.name);
        if (worldBook && worldBook.entries.length > 0) {
          importWorldBook(worldBook.name, worldBook.entries);
          addToast(`成功导入角色「${card.name}」，附带世界书「${worldBook.name}」(${worldBook.entries.length}条)`);
        } else {
          addToast(`成功导入角色「${card.name}」`);
        }
      } else {
        addToast(`成功导入角色「${card.name}」`);
      }
      setEditingRole(newRoleId);
    }
  };

  const handleImportSingle = async () => {
    try {
      const card = await importRoleCardFromFile();
      processImportCard(card);
    } catch (error: any) {
      if (error.message?.includes('quota') || error.message?.includes('QuotaExceededError')) {
        addToast('导入失败：头像图片太大，超出浏览器存储限制', 'error');
      } else {
        addToast(error.message || '导入失败', 'error');
      }
    }
  };

  const handleImportBatch = async () => {
    setImporting(true);
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '.json,.png';
      
      const files = await new Promise<File[]>((resolve, reject) => {
        input.onchange = (e: Event) => {
          const fileList = (e.target as HTMLInputElement).files;
          resolve(fileList ? Array.from(fileList) : []);
        };
        input.click();
      });

      if (files.length === 0) { setImporting(false); return; }

      let successCount = 0;
      let failCount = 0;
      for (const file of files) {
        try {
          let card: any = null;
          
          if (file.name.toLowerCase().endsWith('.png')) {
            const buffer = await file.arrayBuffer();
            // 使用内部 PNG 解析
            const chunks = new Map<string, string>();
            const view = new DataView(buffer);
            let offset = 8;
            while (offset < buffer.byteLength) {
              const length = view.getUint32(offset);
              offset += 4;
              const typeBytes = new Uint8Array(buffer, offset, 4);
              const type = String.fromCharCode(...typeBytes);
              offset += 4;
              const data = new Uint8Array(buffer, offset, length);
              offset += length + 4;
              if (type === 'tEXt') {
                const nullIdx = data.indexOf(0);
                if (nullIdx !== -1) {
                  const keyword = new TextDecoder('latin1').decode(data.slice(0, nullIdx));
                  const text = new TextDecoder('latin1').decode(data.slice(nullIdx + 1));
                  chunks.set(keyword, text);
                }
              } else if (type === 'IEND') break;
            }
            const rawText = chunks.get('chara');
            if (rawText) {
              const binaryStr = atob(rawText);
              const bytes = new Uint8Array(binaryStr.length);
              for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
              const jsonStr = new TextDecoder('utf-8').decode(bytes);
              card = normalizeCharacterCard(JSON.parse(jsonStr));
            }
          } else {
            const text = await file.text();
            card = normalizeCharacterCard(JSON.parse(text));
          }
          
          if (card) {
            processImportCard(card, true);
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }
      addToast(`批量导入完成：成功 ${successCount} 个${failCount > 0 ? `，失败 ${failCount} 个` : ''}`);
    } catch (error: any) {
      addToast(error.message || '批量导入失败', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleExportSingle = (roleId: number, asPNG = false) => {
    const role = roles.find(r => r.id === roleId);
    if (!role) return;
    try {
      if (asPNG) {
        exportRoleCardAsPNG(role);
        addToast(`已导出 PNG: ${role.name}`);
      } else {
        exportRoleCard(role);
        addToast(`已导出 JSON: ${role.name}`);
      }
    } catch (error: any) {
      addToast(error.message || '导出失败', 'error');
    }
  };

  const handleExportAll = () => {
    try {
      exportAllRoles(roles);
      addToast(`已导出全部 ${roles.length} 个角色`);
    } catch (error: any) {
      addToast(error.message || '导出失败', 'error');
    }
  };

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

  // ── 右键菜单处理 ──
  const handleContextMenu = (e: React.MouseEvent, roleId: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, roleId });
  };

  const handleContextAction = (action: string) => {
    const roleId = contextMenu.roleId;
    if (roleId === null) return;
    setContextMenu(prev => ({ ...prev, visible: false }));
    switch (action) {
      case 'edit': setEditingRole(roleId); break;
      case 'chat': handleUseRole(roleId); break;
      case 'duplicate': handleDuplicateRole(roleId); break;
      case 'export-png': handleExportSingle(roleId, true); break;
      case 'export-json': handleExportSingle(roleId, false); break;
      case 'fav': toggleRoleFav(roleId); break;
      case 'delete': handleDeleteRole(roleId); break;
    }
  };

  return (
    <div className="roles-page">
      {/* ── 页头 ── */}
      <div className="page-header">
        <h1>角色管理 ({roles.length})</h1>
        <div className="page-actions">
          <button className="btn-primary" onClick={handleCreateRole}>+ 创建角色</button>
          <button className="btn-secondary" onClick={handleImportSingle} disabled={importing}>导入角色卡</button>
          <button className="btn-secondary" onClick={handleImportBatch} disabled={importing}>
            {importing ? '导入中...' : '批量导入'}
          </button>
          <button className="btn-secondary" onClick={handleExportAll}>导出全部</button>
          <button className="btn-secondary" onClick={() => navigate('/')}>返回</button>
        </div>
      </div>

      {/* ── 工具栏 ── */}
      <div className="roles-toolbar">
        <div className="search-bar">
          <input type="text" placeholder="搜索角色（名称、昵称、描述、标签、创作者）..." value={search}
            onChange={(e) => setSearch(e.target.value)} className="search-input" />
        </div>
        <div className="roles-toolbar-right">
          {/* 视图切换 */}
          <div className="view-toggle">
            <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')} title="网格视图">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
            </button>
            <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="列表视图">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="2" width="14" height="3" rx="1"/><rect x="1" y="7" width="14" height="3" rx="1"/><rect x="1" y="12" width="14" height="3" rx="1"/></svg>
            </button>
          </div>
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

      {/* ── 角色列表（网格 / 列表） ── */}
      {!editingRole && (
        <>
          {viewMode === 'grid' ? (
            <div className="roles-grid">
              {filteredAndSortedRoles.map(role => (
                <div
                  key={role.id}
                  className={`role-card-grid ${role.fav ? 'role-card-fav' : ''}`}
                  onContextMenu={(e) => handleContextMenu(e, role.id)}
                  onDoubleClick={() => handleUseRole(role.id)}
                >
                  <div className="role-card-grid-avatar" onClick={() => toggleRoleFav(role.id)}>
                    <img src={role.avatar} alt={role.name}
                      onError={(e) => { e.currentTarget.style.display = 'none'; const fb = e.currentTarget.parentElement?.querySelector('.role-card-grid-fallback') as HTMLElement; if (fb) fb.style.display = 'flex'; }}
                    />
                    <div className="role-card-grid-fallback" style={{ display: 'none' }}>
                      {(role.name || '?').charAt(0).toUpperCase()}
                    </div>
                    {role.fav && <span className="fav-star">★</span>}
                  </div>
                  <div className="role-card-grid-info">
                    <h3>{role.nickname || role.name}</h3>
                    {role.nickname && role.nickname !== role.name && (
                      <div className="role-card-grid-subname">{role.name}</div>
                    )}
                    <p className="role-card-grid-desc">{role.description ? (role.description.length > 60 ? role.description.substring(0, 60) + '...' : role.description) : '暂无描述'}</p>
                    {(role.tags || []).length > 0 && (
                      <div className="role-tags">{role.tags!.slice(0, 3).map(t => <span key={t} className="role-tag">{t}</span>)}{role.tags!.length > 3 && <span className="role-tag">+{role.tags!.length - 3}</span>}</div>
                    )}
                  </div>
                  <div className="role-card-grid-footer">
                    <span className="role-card-grid-meta">
                      {role.creator && <span>{role.creator}</span>}
                      {chatCounts[role.id] !== undefined && <span>{chatCounts[role.id]} 聊天</span>}
                    </span>
                    <div className="role-card-grid-actions">
                      <button className="btn-icon btn-tiny" onClick={() => setEditingRole(role.id)} title="编辑">✏</button>
                      <button className="btn-icon btn-tiny" onClick={() => handleDuplicateRole(role.id)} title="复制">📋</button>
                      <button className="btn-icon btn-tiny" onClick={() => handleUseRole(role.id)} title="聊天">💬</button>
                      <button className="btn-icon btn-tiny delete" onClick={() => handleDeleteRole(role.id)} title="删除">🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="roles-list">
              {filteredAndSortedRoles.map(role => (
                <div
                  key={role.id}
                  className={`role-card-list ${role.fav ? 'role-card-fav' : ''}`}
                  onContextMenu={(e) => handleContextMenu(e, role.id)}
                  onDoubleClick={() => handleUseRole(role.id)}
                >
                  <div className="role-card-list-avatar" onClick={() => toggleRoleFav(role.id)}>
                    <img src={role.avatar} alt={role.name}
                      onError={(e) => { e.currentTarget.style.display = 'none'; const fb = e.currentTarget.parentElement?.querySelector('.role-card-list-fallback') as HTMLElement; if (fb) fb.style.display = 'flex'; }}
                    />
                    <div className="role-card-list-fallback" style={{ display: 'none' }}>
                      {(role.name || '?').charAt(0).toUpperCase()}
                    </div>
                    {role.fav && <span className="fav-star">★</span>}
                  </div>
                  <div className="role-card-list-info" onClick={() => setEditingRole(role.id)}>
                    <div className="role-card-list-name">{role.nickname || role.name}</div>
                    <div className="role-card-list-desc">{role.description || '暂无描述'}</div>
                    <div className="role-card-list-meta">
                      {role.creator && <span>{role.creator}</span>}
                      {role.character_version && <span>v{role.character_version}</span>}
                      {chatCounts[role.id] !== undefined && <span>{chatCounts[role.id]} 聊天</span>}
                      {(role.tags || []).slice(0, 4).map(t => <span key={t} className="role-tag">{t}</span>)}
                    </div>
                  </div>
                  <div className="role-card-list-actions">
                    <button className="btn-icon" onClick={() => setEditingRole(role.id)} title="编辑">✏️</button>
                    <button className="btn-icon" onClick={() => handleDuplicateRole(role.id)} title="复制">📋</button>
                    <button className="btn-icon" onClick={() => handleUseRole(role.id)} title="聊天">💬</button>
                    <button className="btn-icon delete" onClick={() => handleDeleteRole(role.id)} title="删除">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {filteredAndSortedRoles.length === 0 && !editingRole && (
        <div className="empty-state">
          <p>{search || showFavOnly ? '没有找到匹配的角色' : '还没有角色'}</p>
          <button className="btn-primary" onClick={handleCreateRole}>创建第一个角色</button>
        </div>
      )}

      {/* ── 角色编辑弹窗 ── */}
      {editingRole && (
        <RoleEditor
          role={roles.find(r => r.id === editingRole)}
          onSave={(updates) => handleSaveRole(editingRole, updates)}
          onCancel={handleCancelEdit}
        />
      )}

      {/* ── 导入冲突对话框 ── */}
      {importConflict && (
        <div className="modal-overlay" onClick={() => setImportConflict(null)}>
          <div className="conflict-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>角色名称冲突</h3>
            <p>已存在同名角色「{importConflict.card.name}」，请选择操作：</p>
            <div className="conflict-actions">
              <button className="btn-primary" onClick={() => {
                processImportCard(importConflict.card, true);
                setImportConflict(null);
              }}>覆盖现有角色</button>
              <button className="btn-secondary" onClick={() => {
                // 新建：修改名称
                const card = { ...importConflict.card, name: importConflict.card.name + ' (2)' };
                processImportCard(card);
                setImportConflict(null);
              }}>创建为新角色</button>
              <button className="btn-secondary" onClick={() => setImportConflict(null)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 右键上下文菜单 ── */}
      {contextMenu.visible && contextMenu.roleId !== null && (
        <div className="context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
          <div className="context-menu-item" onClick={() => handleContextAction('chat')}>💬 开始聊天</div>
          <div className="context-menu-item" onClick={() => handleContextAction('edit')}>✏️ 编辑角色</div>
          <div className="context-menu-item" onClick={() => handleContextAction('duplicate')}>📋 复制角色</div>
          <div className="context-menu-sep" />
          <div className="context-menu-item" onClick={() => handleContextAction('export-png')}>🖼️ 导出为 PNG</div>
          <div className="context-menu-item" onClick={() => handleContextAction('export-json')}>📄 导出为 JSON</div>
          <div className="context-menu-sep" />
          <div className="context-menu-item" onClick={() => handleContextAction('fav')}>
            {roles.find(r => r.id === contextMenu.roleId)?.fav ? '💔 取消收藏' : '⭐ 收藏角色'}
          </div>
          <div className="context-menu-sep" />
          <div className="context-menu-item danger" onClick={() => handleContextAction('delete')}>🗑️ 删除角色</div>
        </div>
      )}

      {/* ── Toast 通知 ── */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>
        ))}
      </div>
    </div>
  );
};

export default RolesPage;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useStoreState,
  addWorldInfoEntry,
  updateWorldInfoEntry,
  deleteWorldInfoEntry,
  WorldInfoEntry,
  WIPosition,
  WorldInfoSettings,
  updateWorldInfoSettings,
} from '../store/useStore';

const positionLabels: Record<WIPosition, string> = {
  before_char: 'System 之后',
  after_char: '角色定义之后',
  before_example: '示例消息之前',
  after_example: '示例消息之后',
  before_last: '最后消息之前',
  after_last: '消息末尾',
};

const WorldInfoPage: React.FC = () => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEntry, setEditingEntry] = useState<WorldInfoEntry | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const { worldInfo, worldInfoSettings } = useStoreState();

  // 新建条目表单
  const [newForm, setNewForm] = useState({
    keys: '',
    content: '',
    comment: '',
    name: '',
    enabled: true,
    constant: false,
    position: 'before_char' as WIPosition,
    caseSensitive: false,
    scanDepth: 10,
    secondaryKeys: '',
    selectiveLogic: 'OR' as 'AND' | 'OR',
    depth: 0,
    useProbability: false,
    probability: 100,
    preventRecursion: false,
    excludeRecursion: false,
    cooldown: 0,
    delay: 0,
    group: '',
    groupOverride: false,
    groupWeight: 100,
    scanRole: '' as string,
    role: '' as string,
    tokenBudget: 0,
  });

  // 编辑条目表单
  const [editForm, setEditForm] = useState({
    keys: '',
    content: '',
    comment: '',
    name: '',
    enabled: true,
    constant: false,
    position: 'before_char' as WIPosition,
    caseSensitive: false,
    scanDepth: 10,
    secondaryKeys: '',
    selectiveLogic: 'OR' as 'AND' | 'OR',
    depth: 0,
    useProbability: false,
    probability: 100,
    preventRecursion: false,
    excludeRecursion: false,
    cooldown: 0,
    delay: 0,
    group: '',
    groupOverride: false,
    groupWeight: 100,
    scanRole: '' as string,
    role: '' as string,
    tokenBudget: 0,
  });

  const sortedEntries = [...worldInfo]
    .filter(entry => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        entry.keys.some(k => k.toLowerCase().includes(q)) ||
        entry.content.toLowerCase().includes(q) ||
        entry.comment.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.order - b.order);

  const handleCreate = () => {
    if (!newForm.content.trim()) return;
    const keys = newForm.keys
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
    const secondaryKeys = newForm.secondaryKeys
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
    addWorldInfoEntry({
      keys,
      secondaryKeys,
      selectiveLogic: newForm.selectiveLogic,
      content: newForm.content.trim(),
      comment: newForm.comment.trim(),
      name: newForm.name.trim(),
      enabled: newForm.enabled,
      constant: newForm.constant,
      position: newForm.position,
      caseSensitive: newForm.caseSensitive,
      scanDepth: newForm.scanDepth,
      order: worldInfo.length,
      depth: newForm.depth,
      useProbability: newForm.useProbability,
      probability: newForm.probability,
      preventRecursion: newForm.preventRecursion,
      excludeRecursion: newForm.excludeRecursion,
      cooldown: newForm.cooldown,
      delay: newForm.delay,
      group: newForm.group.trim(),
      groupOverride: newForm.groupOverride,
      groupWeight: newForm.groupWeight,
      scanRole: newForm.scanRole ? parseInt(newForm.scanRole) || null : null,
      role: newForm.role ? parseInt(newForm.role) || null : null,
      tokenBudget: newForm.tokenBudget,
    });
    setNewForm({
      keys: '', content: '', comment: '', name: '', enabled: true, constant: false,
      position: 'before_char', caseSensitive: false, scanDepth: 10,
      secondaryKeys: '', selectiveLogic: 'OR', depth: 0,
      useProbability: false, probability: 100,
      preventRecursion: false, excludeRecursion: false,
      cooldown: 0, delay: 0, group: '', groupOverride: false, groupWeight: 100,
      scanRole: '', role: '', tokenBudget: 0,
    });
    setShowNewForm(false);
  };

  const handleStartEdit = (entry: WorldInfoEntry) => {
    setEditingEntry(entry);
    // 兼容旧数据：归一化 position（旧数据可能是 'before' 或 'after'）
    let pos: WIPosition = entry.position as WIPosition;
    const rawPos = entry.position as string;
    if (rawPos === 'before' || rawPos === 'after') {
      pos = rawPos === 'before' ? 'before_char' : 'after_last';
    }
    setEditForm({
      keys: (entry.keys || []).join(', '),
      content: entry.content || '',
      comment: entry.comment || '',
      name: entry.name || '',
      enabled: entry.enabled !== false,
      constant: entry.constant || false,
      position: pos as WIPosition,
      caseSensitive: entry.caseSensitive || false,
      scanDepth: entry.scanDepth || 10,
      secondaryKeys: (entry.secondaryKeys || []).join(', '),
      selectiveLogic: entry.selectiveLogic === 'AND' ? 'AND' : 'OR',
      depth: entry.depth || 0,
      useProbability: entry.useProbability || false,
      probability: entry.probability || 100,
      preventRecursion: entry.preventRecursion || false,
      excludeRecursion: entry.excludeRecursion || false,
      cooldown: entry.cooldown || 0,
      delay: entry.delay || 0,
      group: entry.group || '',
      groupOverride: entry.groupOverride || false,
      groupWeight: entry.groupWeight || 100,
      scanRole: entry.scanRole != null ? String(entry.scanRole) : '',
      role: entry.role != null ? String(entry.role) : '',
      tokenBudget: entry.tokenBudget || 0,
    });
  };

  const handleSaveEdit = () => {
    if (!editingEntry || !editForm.content.trim()) return;
    const keys = editForm.keys
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
    const secondaryKeys = editForm.secondaryKeys
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);
    updateWorldInfoEntry(editingEntry.id, {
      keys,
      secondaryKeys,
      selectiveLogic: editForm.selectiveLogic,
      content: editForm.content.trim(),
      comment: editForm.comment.trim(),
      name: editForm.name.trim(),
      enabled: editForm.enabled,
      constant: editForm.constant,
      position: editForm.position,
      caseSensitive: editForm.caseSensitive,
      scanDepth: editForm.scanDepth,
      depth: editForm.depth,
      useProbability: editForm.useProbability,
      probability: editForm.probability,
      preventRecursion: editForm.preventRecursion,
      excludeRecursion: editForm.excludeRecursion,
      cooldown: editForm.cooldown,
      delay: editForm.delay,
      group: editForm.group.trim(),
      groupOverride: editForm.groupOverride,
      groupWeight: editForm.groupWeight,
      scanRole: editForm.scanRole ? parseInt(editForm.scanRole) || null : null,
      role: editForm.role ? parseInt(editForm.role) || null : null,
      tokenBudget: editForm.tokenBudget,
    });
    setEditingEntry(null);
  };

  const handleToggle = (entry: WorldInfoEntry) => {
    updateWorldInfoEntry(entry.id, { enabled: !entry.enabled });
  };

  const handleDelete = (entryId: number) => {
    if (window.confirm('确定要删除这个 World Info 条目吗？')) {
      deleteWorldInfoEntry(entryId);
      if (expandedId === entryId) setExpandedId(null);
    }
  };

  const handleExport = () => {
    const data = JSON.stringify(worldInfo, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sillytavern-worldinfo.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          let imported: any[] = [];

          if (Array.isArray(data)) {
            // 格式1：纯数组（自己导出的）
            imported = data;
          } else if (data && data.entries) {
            // 格式2：SillyTavern 世界书 { entries: { "0": {...}, "1": {...} } }
            const entries = data.entries;
            if (Array.isArray(entries)) {
              imported = entries;
            } else if (typeof entries === 'object') {
              imported = Object.values(entries);
            }
          } else if (typeof data === 'object') {
            // 格式3：其他对象格式，尝试作为单条目或 entries 直接取值
            if (data.key || data.keys || data.content) {
              imported = [data];
            } else {
              imported = Object.values(data).filter((e: any) => e && typeof e === 'object' && e.content);
            }
          }

          if (imported.length === 0) {
            alert('文件中没有找到有效的 World Info 条目');
            return;
          }

          let count = 0;
          for (const entry of imported) {
            // SillyTavern 格式字段映射
            const keys = entry.key || entry.keys || [];
            const keyArray = Array.isArray(keys) ? keys : (typeof keys === 'string' ? keys.split(',').map((k: string) => k.trim()).filter(Boolean) : []);

            addWorldInfoEntry({
              keys: keyArray,
              secondaryKeys: entry.secondary_keys ?
                (Array.isArray(entry.secondary_keys) ? entry.secondary_keys : String(entry.secondary_keys).split(',').map((k: string) => k.trim()).filter(Boolean)) :
                [],
              selectiveLogic: entry.selectiveLogic === 'AND' ? 'AND' : 'OR',
              content: entry.content || '',
              comment: entry.comment || entry.name || '',
              name: entry.name || '',
              enabled: entry.disable === true ? false : (entry.enabled !== false),
              constant: entry.constant || false,
              position: mapPosition(entry.position),
              caseSensitive: entry.caseSensitive || false,
              scanDepth: entry.scanDepth || entry.depth || 10,
              order: entry.order ?? entry.displayIndex ?? worldInfo.length,
              depth: entry.depth || 0,
              useProbability: entry.useProbability || false,
              probability: entry.probability || 100,
              preventRecursion: entry.preventRecursion || false,
              excludeRecursion: entry.excludeRecursion || false,
              cooldown: entry.cooldown || 0,
              delay: entry.delay || 0,
              group: entry.group || '',
              groupOverride: entry.groupOverride || false,
              groupWeight: entry.groupWeight || 100,
              scanRole: null,
              role: null,
              tokenBudget: entry.tokenBudget || 0,
            });
            count++;
          }
          alert(`成功导入 ${count} 条 World Info`);
        } catch (err: any) {
          alert('导入失败：无法解析文件\n' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // SillyTavern position 数字映射到新的 WIPosition
  const mapPosition = (pos: any): WIPosition => {
    if (!pos) return 'before_char';
    const newPositions: WIPosition[] = [
      'before_char', 'after_char', 'before_example',
      'after_example', 'before_last', 'after_last',
    ];
    if (typeof pos === 'string') {
      if (newPositions.includes(pos as WIPosition)) return pos as WIPosition;
      if (pos === 'before') return 'before_char';
      if (pos === 'after') return 'after_last';
      return 'before_char';
    }
    // SillyTavern 数字: 0=before_char, 1=after_char, 2=before_example, 3=after_example, 4=AN
    if (typeof pos === 'number') {
      switch (pos) {
        case 0: return 'before_char';
        case 1: return 'after_char';
        case 2: return 'before_example';
        case 3: return 'after_example';
        case 4: return 'after_last';
        default: return 'before_char';
      }
    }
    return 'before_char';
  };

  return (
    <div className="worldinfo-page">
      <div className="page-header">
        <h1>World Info / Lorebook</h1>
        <div className="page-actions">
          <button className="btn-secondary" onClick={handleExport} disabled={worldInfo.length === 0}>
            导出
          </button>
          <button className="btn-secondary" onClick={handleImport}>
            导入
          </button>
          <button className="btn-primary" onClick={() => setShowNewForm(true)}>
            + 新建条目
          </button>
          <button className="btn-secondary" onClick={() => navigate('/')}>
            返回
          </button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="worldinfo-toolbar">
        <input
          className="search-input"
          placeholder="搜索关键词、内容或备注..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="worldinfo-stats">
          共 {worldInfo.length} 条
          {worldInfo.filter(e => e.enabled).length > 0 && (
            <span className="stat-enabled"> ({worldInfo.filter(e => e.enabled).length} 启用)</span>
          )}
          {worldInfo.filter(e => e.constant).length > 0 && (
            <span className="stat-constant"> ({worldInfo.filter(e => e.constant).length} 常驻)</span>
          )}
        </div>
      </div>

      {/* 新建条目表单 */}
      {showNewForm && (
        <div className="worldinfo-form">
          <div className="form-section">
            <h3>新建 World Info 条目</h3>
            <div className="form-group">
              <label>触发关键词（逗号分隔）</label>
              <input
                type="text"
                value={newForm.keys}
                onChange={(e) => setNewForm(prev => ({ ...prev, keys: e.target.value }))}
                placeholder="例如: 魔法, spell, magic"
              />
              <div className="hint">当聊天消息中出现这些关键词时，条目内容将被注入到 AI 上下文中</div>
            </div>
            <div className="form-group">
              <label>内容（注入到 AI 上下文中的文本）</label>
              <textarea
                value={newForm.content}
                onChange={(e) => setNewForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="输入要注入的内容..."
                rows={5}
              />
            </div>
            <div className="form-group">
              <label>备注（仅用于自己查看，不注入）</label>
              <input
                type="text"
                value={newForm.comment}
                onChange={(e) => setNewForm(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="例如: 关于魔法系统的设定"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>注入位置</label>
                <select
                  value={newForm.position}
                  onChange={(e) => setNewForm(prev => ({ ...prev, position: e.target.value as WIPosition }))}
                >
                  <option value="before_char">System 之后</option>
                  <option value="after_char">角色定义之后</option>
                  <option value="before_example">示例消息之前</option>
                  <option value="after_example">示例消息之后</option>
                  <option value="before_last">最后消息之前</option>
                  <option value="after_last">消息末尾</option>
                </select>
              </div>
              <div className="form-group">
                <label>扫描深度（最近 N 条消息）</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newForm.scanDepth}
                  onChange={(e) => setNewForm(prev => ({ ...prev, scanDepth: parseInt(e.target.value) || 10 }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={newForm.constant}
                  onChange={(e) => setNewForm(prev => ({ ...prev, constant: e.target.checked }))}
                />
                <span className="checkbox-label">常驻注入（无论是否匹配关键词都注入）</span>
              </label>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={newForm.caseSensitive}
                  onChange={(e) => setNewForm(prev => ({ ...prev, caseSensitive: e.target.checked }))}
                />
                <span className="checkbox-label">关键词区分大小写</span>
              </label>
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setShowNewForm(false)}>取消</button>
              <button className="btn-primary" onClick={handleCreate} disabled={!newForm.content.trim()}>创建条目</button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑条目表单 */}
      {editingEntry && (
        <div className="worldinfo-form">
          <div className="form-section">
            <h3>编辑 World Info 条目</h3>
            <div className="form-group">
              <label>触发关键词（逗号分隔）</label>
              <input
                type="text"
                value={editForm.keys}
                onChange={(e) => setEditForm(prev => ({ ...prev, keys: e.target.value }))}
                placeholder="例如: 魔法, spell, magic"
              />
            </div>
            <div className="form-group">
              <label>内容</label>
              <textarea
                value={editForm.content}
                onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                placeholder="输入要注入的内容..."
                rows={5}
              />
            </div>
            <div className="form-group">
              <label>备注</label>
              <input
                type="text"
                value={editForm.comment}
                onChange={(e) => setEditForm(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="备注信息"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>注入位置</label>
                <select
                  value={editForm.position}
                  onChange={(e) => setEditForm(prev => ({ ...prev, position: e.target.value as WIPosition }))}
                >
                  <option value="before_char">System 之后</option>
                  <option value="after_char">角色定义之后</option>
                  <option value="before_example">示例消息之前</option>
                  <option value="after_example">示例消息之后</option>
                  <option value="before_last">最后消息之前</option>
                  <option value="after_last">消息末尾</option>
                </select>
              </div>
              <div className="form-group">
                <label>扫描深度</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={editForm.scanDepth}
                  onChange={(e) => setEditForm(prev => ({ ...prev, scanDepth: parseInt(e.target.value) || 10 }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={editForm.constant}
                  onChange={(e) => setEditForm(prev => ({ ...prev, constant: e.target.checked }))}
                />
                <span className="checkbox-label">常驻注入</span>
              </label>
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={editForm.caseSensitive}
                  onChange={(e) => setEditForm(prev => ({ ...prev, caseSensitive: e.target.checked }))}
                />
                <span className="checkbox-label">区分大小写</span>
              </label>
            </div>
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setEditingEntry(null)}>取消</button>
              <button className="btn-primary" onClick={handleSaveEdit}>保存修改</button>
            </div>
          </div>
        </div>
      )}

      {/* 条目列表 */}
      <div className="worldinfo-list">
        {sortedEntries.length === 0 && !showNewForm && (
          <div className="empty-state">
            <h2>还没有 World Info 条目</h2>
            <p>World Info 可以在特定关键词出现时自动注入设定信息到 AI 上下文中，非常适合角色扮演和长篇故事创作。</p>
            <button className="btn-primary" onClick={() => setShowNewForm(true)}>
              创建第一个条目
            </button>
          </div>
        )}

        {sortedEntries.map((entry) => (
          <div
            key={entry.id}
            className={`worldinfo-entry ${!entry.enabled ? 'disabled' : ''} ${expandedId === entry.id ? 'expanded' : ''}`}
          >
            <div
              className="worldinfo-entry-header"
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            >
              <div className="entry-toggle-area">
                <span className="entry-expand-icon">{expandedId === entry.id ? '▼' : '▶'}</span>
                <div className="entry-key-badges">
                  {entry.keys.slice(0, 5).map((key, i) => (
                    <span key={i} className="entry-key-badge">{key}</span>
                  ))}
                  {entry.keys.length > 5 && (
                    <span className="entry-key-badge more">+{entry.keys.length - 5}</span>
                  )}
                </div>
              </div>
              <div className="entry-meta">
                {entry.constant && <span className="entry-badge constant">常驻</span>}
                <span className="entry-badge position">{positionLabels[entry.position] || entry.position}</span>
                <span className="entry-comment">{entry.comment || '无备注'}</span>
              </div>
              <div className="entry-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`btn-icon ${entry.enabled ? 'enabled' : ''}`}
                  onClick={() => handleToggle(entry)}
                  title={entry.enabled ? '禁用' : '启用'}
                >
                  {entry.enabled ? 'ON' : 'OFF'}
                </button>
                <button className="btn-icon" onClick={() => handleStartEdit(entry)} title="编辑">✏️</button>
                <button className="btn-icon delete" onClick={() => handleDelete(entry.id)} title="删除">🗑️</button>
              </div>
            </div>

            {expandedId === entry.id && (
              <div className="worldinfo-entry-body">
                <div className="entry-section">
                  <span className="entry-label">内容:</span>
                  <pre className="entry-content-preview">{entry.content}</pre>
                </div>
                <div className="entry-section">
                  <span className="entry-label">关键词:</span>
                  <div className="entry-keys-list">
                    {entry.keys.map((key, i) => (
                      <span key={i} className="entry-key-badge">{key}</span>
                    ))}
                    {entry.keys.length === 0 && <span className="hint">无关键词（仅常驻模式有效）</span>}
                  </div>
                </div>
                <div className="entry-details-grid">
                  <div><span className="entry-label">位置:</span> {positionLabels[entry.position] || entry.position}</div>
                  <div><span className="entry-label">扫描深度:</span> 最近 {entry.scanDepth} 条消息</div>
                  <div><span className="entry-label">大小写:</span> {entry.caseSensitive ? '区分' : '不区分'}</div>
                  <div><span className="entry-label">更新时间:</span> {new Date(entry.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorldInfoPage;

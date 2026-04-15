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
  before_char: '角色定义之前',
  after_char: '角色定义之后',
  before_example: '示例消息之前',
  after_example: '示例消息之后',
  before_last: '最后消息之前',
  after_last: '最后消息之后 (Author\'s Note)',
};

/** 高级设置表单字段子组件（新建和编辑共用） */
const AdvancedSettingsSection = ({
  form,
  setForm,
}: {
  form: {
    name: string;
    secondaryKeys: string;
    selectiveLogic: 'AND' | 'OR';
    position: WIPosition;
    depth: number;
    useProbability: boolean;
    probability: number;
    preventRecursion: boolean;
    excludeRecursion: boolean;
    cooldown: number;
    delay: number;
    group: string;
    groupOverride: boolean;
    tokenBudget: number;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
}) => (
  <details className="wi-advanced-details">
    <summary>🔧 高级设置</summary>
    <div className="wi-advanced-content">
      {/* 条目名称 */}
      <div className="form-group">
        <label>条目名称</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))}
          placeholder="为条目起个名字，方便识别"
        />
      </div>

      {/* 次关键词 + 组合逻辑 */}
      <div className="form-group">
        <label>次关键词（逗号分隔）</label>
        <input
          type="text"
          value={form.secondaryKeys}
          onChange={(e) => setForm((prev: any) => ({ ...prev, secondaryKeys: e.target.value }))}
          placeholder="与主关键词组合匹配"
        />
      </div>
      {form.secondaryKeys.trim() && (
        <div className="form-group">
          <label>组合逻辑</label>
          <select
            value={form.selectiveLogic}
            onChange={(e) => setForm((prev: any) => ({ ...prev, selectiveLogic: e.target.value as 'AND' | 'OR' }))}
          >
            <option value="OR">OR (任一匹配)</option>
            <option value="AND">AND (全部匹配)</option>
          </select>
        </div>
      )}

      {/* 注入位置 + 注入深度 */}
      <div className="form-row">
        <div className="form-group">
          <label>注入位置</label>
          <select
            value={form.position}
            onChange={(e) => setForm((prev: any) => ({ ...prev, position: e.target.value as WIPosition }))}
          >
            <option value="before_char">角色定义之前</option>
            <option value="after_char">角色定义之后</option>
            <option value="before_example">示例消息之前</option>
            <option value="after_example">示例消息之后</option>
            <option value="before_last">最后消息之前</option>
            <option value="after_last">最后消息之后 (Author's Note)</option>
          </select>
        </div>
        <div className="form-group">
          <label>注入深度</label>
          <input
            type="number"
            min="0"
            max="999"
            value={form.depth}
            onChange={(e) => setForm((prev: any) => ({ ...prev, depth: parseInt(e.target.value) || 0 }))}
          />
          <div className="hint">0=按位置规则</div>
        </div>
      </div>

      {/* 触发概率 */}
      <div className="form-group">
        <label>
          <input
            type="checkbox"
            checked={form.useProbability}
            onChange={(e) => setForm((prev: any) => ({ ...prev, useProbability: e.target.checked }))}
          />
          <span className="checkbox-label">启用概率触发</span>
        </label>
      </div>
      {form.useProbability && (
        <div className="form-group">
          <label>触发概率 (0-100)</label>
          <input
            type="number"
            min="0"
            max="100"
            value={form.probability}
            onChange={(e) => setForm((prev: any) => ({ ...prev, probability: parseInt(e.target.value) || 100 }))}
          />
          <div className="hint">匹配时以该百分比概率决定是否触发</div>
        </div>
      )}

      {/* 防递归 + 排除递归 */}
      <div className="form-row">
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={form.preventRecursion}
              onChange={(e) => setForm((prev: any) => ({ ...prev, preventRecursion: e.target.checked }))}
            />
            <span className="checkbox-label">防递归</span>
          </label>
        </div>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={form.excludeRecursion}
              onChange={(e) => setForm((prev: any) => ({ ...prev, excludeRecursion: e.target.checked }))}
            />
            <span className="checkbox-label">排除递归</span>
          </label>
        </div>
      </div>

      {/* 冷却 + 延迟 */}
      <div className="form-row">
        <div className="form-group">
          <label>冷却轮数</label>
          <input
            type="number"
            min="0"
            max="999"
            value={form.cooldown}
            onChange={(e) => setForm((prev: any) => ({ ...prev, cooldown: parseInt(e.target.value) || 0 }))}
          />
          <div className="hint">触发后的冷却轮数</div>
        </div>
        <div className="form-group">
          <label>延迟触发</label>
          <input
            type="number"
            min="0"
            max="999"
            value={form.delay}
            onChange={(e) => setForm((prev: any) => ({ ...prev, delay: parseInt(e.target.value) || 0 }))}
          />
          <div className="hint">匹配后延迟几轮才触发</div>
        </div>
      </div>

      {/* 分组 + 分组覆盖 */}
      <div className="form-row">
        <div className="form-group">
          <label>分组</label>
          <input
            type="text"
            value={form.group}
            onChange={(e) => setForm((prev: any) => ({ ...prev, group: e.target.value }))}
            placeholder="分组名称"
          />
        </div>
        <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '6px' }}>
          <label>
            <input
              type="checkbox"
              checked={form.groupOverride}
              onChange={(e) => setForm((prev: any) => ({ ...prev, groupOverride: e.target.checked }))}
            />
            <span className="checkbox-label">分组覆盖</span>
          </label>
        </div>
      </div>

      {/* Token 上限 */}
      <div className="form-group">
        <label>Token 上限</label>
        <input
          type="number"
          min="0"
          max="99999"
          value={form.tokenBudget}
          onChange={(e) => setForm((prev: any) => ({ ...prev, tokenBudget: parseInt(e.target.value) || 0 }))}
        />
        <div className="hint">0=不限</div>
      </div>
    </div>
  </details>
);

const WorldInfoPage: React.FC = () => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEntry, setEditingEntry] = useState<WorldInfoEntry | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  // 分组管理状态
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>('__all__');

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

  // 收集所有分组名称（用于筛选标签）
  const allGroups = React.useMemo(() => {
    const groupSet = new Set<string>();
    worldInfo.forEach(entry => {
      if (entry.group && entry.group.trim()) groupSet.add(entry.group.trim());
    });
    return Array.from(groupSet).sort();
  }, [worldInfo]);

  // 过滤后的条目
  const sortedEntries = React.useMemo(() => {
    let entries = [...worldInfo].filter(entry => {
      // 分组筛选
      if (activeGroupFilter === '__ungrouped__') {
        if (entry.group && entry.group.trim()) return false;
      } else if (activeGroupFilter !== '__all__') {
        if (!entry.group || entry.group.trim() !== activeGroupFilter) return false;
      }
      // 搜索过滤
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        entry.keys.some(k => k.toLowerCase().includes(q)) ||
        entry.content.toLowerCase().includes(q) ||
        entry.comment.toLowerCase().includes(q)
      );
    });
    return entries.sort((a, b) => a.order - b.order);
  }, [worldInfo, activeGroupFilter, searchQuery]);

  // 按分组组织条目
  const groupedEntries = React.useMemo(() => {
    const groups: { [groupName: string]: WorldInfoEntry[] } = {};
    sortedEntries.forEach(entry => {
      const groupName = entry.group && entry.group.trim() ? entry.group.trim() : '__ungrouped__';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(entry);
    });
    return groups;
  }, [sortedEntries]);

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  const handleQuickAssignGroup = (entry: WorldInfoEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentGroup = entry.group || '';
    const newGroup = window.prompt(
      `设置条目分组\n当前分组: ${currentGroup || '（无）'}\n输入新分组名称（留空则移除分组）:`,
      currentGroup
    );
    if (newGroup === null) return; // 用户取消
    updateWorldInfoEntry(entry.id, { group: newGroup.trim() });
  };

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

  // SillyTavern position 数字映射到新的 WIPosition
  const mapPositionToST = (pos: string): number => {
    const map: Record<string, number> = {
      'before_char': 0,
      'after_char': 1,
      'before_example': 2,
      'after_example': 3,
      'before_last': 4,
      'after_last': 4, // ST uses 4 for AN position too
      'before': 0,  // backward compat
      'after': 4,
    };
    return map[pos] ?? 0;
  };

  const handleExport = () => {
    // Export in SillyTavern world book format
    const entriesObj: Record<string, any> = {};
    worldInfo.forEach((entry, index) => {
      entriesObj[String(index)] = {
        uid: entry.id,
        displayIndex: entry.order,
        name: entry.name || '',
        comment: entry.comment || '',
        keys: entry.keys,
        keysecondary: entry.secondaryKeys || [],
        selectiveLogic: entry.selectiveLogic === 'AND' ? 1 : 0,
        content: entry.content,
        constant: entry.constant,
        selective: (entry.secondaryKeys || []).length > 0,
        disable: !entry.enabled,
        position: mapPositionToST(entry.position),
        depth: entry.depth || entry.scanDepth || 4,
        order: entry.order,
        caseSensitive: entry.caseSensitive || null,
        scanDepth: entry.scanDepth || null,
        useProbability: entry.useProbability,
        probability: entry.probability,
        preventRecursion: entry.preventRecursion,
        excludeRecursion: entry.excludeRecursion,
        delay: entry.delay || null,
        cooldown: entry.cooldown || null,
        group: entry.group || '',
        groupOverride: entry.groupOverride || false,
        groupWeight: entry.groupWeight || 100,
        tokenBudget: entry.tokenBudget || null,
        characterFilter: entry.role ? { isExclude: false, names: [], tags: [] } : undefined,
      };
    });

    const exportData = { entries: entriesObj };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
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

            const secKeys = entry.keysecondary || entry.secondary_keys || entry.secondaryKeys || [];
            const secondaryKeyArray = Array.isArray(secKeys)
              ? secKeys
              : (typeof secKeys === 'string' ? secKeys.split(',').map((k: string) => k.trim()).filter(Boolean) : []);

            addWorldInfoEntry({
              keys: keyArray,
              secondaryKeys: secondaryKeyArray,
              selectiveLogic: entry.selectiveLogic === 1 || entry.selectiveLogic === 'AND' ? 'AND' : 'OR',
              content: entry.content || '',
              comment: entry.comment || '',
              name: entry.name || entry.comment || '',
              enabled: entry.disable === true ? false : (entry.enabled !== false),
              constant: entry.constant || false,
              position: mapPosition(entry.position),
              order: entry.order ?? entry.displayIndex ?? worldInfo.length,
              depth: entry.depth || 0,
              caseSensitive: entry.caseSensitive || false,
              scanDepth: entry.scanDepth || entry.depth || 10,
              useProbability: entry.useProbability || false,
              probability: entry.probability ?? 100,
              preventRecursion: entry.preventRecursion || false,
              excludeRecursion: entry.excludeRecursion || false,
              cooldown: entry.cooldown || 0,
              delay: entry.delay || 0,
              group: entry.group || entry.extra?.group || '',
              groupOverride: entry.groupOverride || entry.extra?.groupOverride || false,
              groupWeight: entry.groupWeight || entry.extra?.groupWeight || 100,
              scanRole: null,  // Can't map from ST format
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
    if (!pos && pos !== 0) return 'before_char';
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
          <button className="btn-secondary" onClick={() => setShowSettingsModal(true)}>
            ⚙️ 设置
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

      {/* 分组筛选标签 */}
      <div className="worldinfo-group-tabs">
        <button
          className={`wi-group-tab ${activeGroupFilter === '__all__' ? 'active' : ''}`}
          onClick={() => setActiveGroupFilter('__all__')}
        >
          全部
        </button>
        <button
          className={`wi-group-tab ${activeGroupFilter === '__ungrouped__' ? 'active' : ''}`}
          onClick={() => setActiveGroupFilter('__ungrouped__')}
        >
          未分组
        </button>
        {allGroups.map(group => (
          <button
            key={group}
            className={`wi-group-tab ${activeGroupFilter === group ? 'active' : ''}`}
            onClick={() => setActiveGroupFilter(group)}
          >
            {group}
          </button>
        ))}
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
                  <option value="before_char">角色定义之前</option>
                  <option value="after_char">角色定义之后</option>
                  <option value="before_example">示例消息之前</option>
                  <option value="after_example">示例消息之后</option>
                  <option value="before_last">最后消息之前</option>
                  <option value="after_last">最后消息之后 (Author's Note)</option>
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
            <AdvancedSettingsSection
              form={newForm}
              setForm={setNewForm}
            />
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
                  <option value="before_char">角色定义之前</option>
                  <option value="after_char">角色定义之后</option>
                  <option value="before_example">示例消息之前</option>
                  <option value="after_example">示例消息之后</option>
                  <option value="before_last">最后消息之前</option>
                  <option value="after_last">最后消息之后 (Author's Note)</option>
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
            <AdvancedSettingsSection
              form={editForm}
              setForm={setEditForm}
            />
            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setEditingEntry(null)}>取消</button>
              <button className="btn-primary" onClick={handleSaveEdit}>保存修改</button>
            </div>
          </div>
        </div>
      )}

      {/* 条目列表（按分组显示） */}
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

        {/* 按分组渲染条目 */}
        {Object.entries(groupedEntries)
          .sort(([a], [b]) => {
            // 未分组排最后
            if (a === '__ungrouped__') return 1;
            if (b === '__ungrouped__') return -1;
            return a.localeCompare(b);
          })
          .map(([groupName, entries]) => {
            const isUngrouped = groupName === '__ungrouped__';
            const displayName = isUngrouped ? '未分组' : groupName;
            const isCollapsed = collapsedGroups.has(groupName);

            return (
              <div key={groupName} className="wi-group-section">
                {/* 分组头 */}
                <div
                  className="wi-group-header"
                  onClick={() => toggleGroupCollapse(groupName)}
                >
                  <span className="wi-group-collapse-icon">{isCollapsed ? '▶' : '▼'}</span>
                  <span className="wi-group-name">{displayName}</span>
                  <span className="wi-group-count">{entries.length} 条</span>
                </div>

                {/* 分组内条目 */}
                {!isCollapsed && (
                  <div className="wi-group-entries">
                    {entries.map((entry) => (
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
                            {/* 快速分组标签 */}
                            <span
                              className={`entry-group-tag ${entry.group ? 'has-group' : ''}`}
                              onClick={(e) => handleQuickAssignGroup(entry, e)}
                              title={entry.group ? `分组: ${entry.group}（点击修改）` : '点击设置分组'}
                            >
                              {entry.group || '无分组'}
                            </span>
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
                            {/* 次关键词 */}
                            {entry.secondaryKeys && entry.secondaryKeys.length > 0 && (
                              <div className="entry-section">
                                <span className="entry-label">次关键词:</span>
                                <div className="entry-keys-list">
                                  {entry.secondaryKeys.map((key, i) => (
                                    <span key={i} className="entry-key-badge" style={{ background: 'rgba(255, 152, 0, 0.15)', color: '#FF9800' }}>{key}</span>
                                  ))}
                                </div>
                                <span className="hint" style={{ marginLeft: '8px' }}>逻辑: {entry.selectiveLogic === 'AND' ? 'AND (全部匹配)' : 'OR (任一匹配)'}</span>
                              </div>
                            )}
                            {/* 概率设置 */}
                            {entry.useProbability && (
                              <div className="entry-section">
                                <span className="entry-label">概率:</span> {entry.probability}%
                              </div>
                            )}
                            {/* 冷却/延迟 */}
                            {(entry.cooldown > 0 || entry.delay > 0) && (
                              <div className="entry-section">
                                <span className="entry-label">时序:</span>
                                {entry.cooldown > 0 && <span className="hint">冷却 {entry.cooldown} 轮</span>}
                                {entry.cooldown > 0 && entry.delay > 0 && <span className="hint"> / </span>}
                                {entry.delay > 0 && <span className="hint">延迟 {entry.delay} 轮</span>}
                              </div>
                            )}
                            {/* 分组 */}
                            <div className="entry-section">
                              <span className="entry-label">分组:</span>{' '}
                              <span
                                className="entry-group-tag edit-inline"
                                onClick={() => handleQuickAssignGroup(entry, { stopPropagation: () => {} } as any)}
                                title="点击修改分组"
                              >
                                {entry.group || '（无）'}
                              </span>
                              {entry.groupOverride && <span className="entry-badge" style={{ marginLeft: '6px' }}>覆盖</span>}
                              {entry.groupWeight !== 100 && (
                                <span className="hint" style={{ marginLeft: '6px' }}>权重: {entry.groupWeight}</span>
                              )}
                            </div>
                            {/* 注入深度 */}
                            {entry.depth > 0 && (
                              <div className="entry-section">
                                <span className="entry-label">注入深度:</span> {entry.depth}
                              </div>
                            )}
                            {/* Token 上限 */}
                            {entry.tokenBudget > 0 && (
                              <div className="entry-section">
                                <span className="entry-label">Token 上限:</span> {entry.tokenBudget}
                              </div>
                            )}
                            <div className="entry-details-grid">
                              <div><span className="entry-label">位置:</span> {positionLabels[entry.position] || entry.position}</div>
                              <div><span className="entry-label">扫描深度:</span> 最近 {entry.scanDepth} 条消息</div>
                              <div><span className="entry-label">大小写:</span> {entry.caseSensitive ? '区分' : '不区分'}</div>
                              <div><span className="entry-label">更新时间:</span> {new Date(entry.updatedAt).toLocaleString()}</div>
                              {entry.preventRecursion && <div><span className="entry-label">防递归:</span> 是</div>}
                              {entry.excludeRecursion && <div><span className="entry-label">排除递归:</span> 是</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* World Info 全局设置弹窗 */}
      {showSettingsModal && (
        <WorldInfoSettingsModal
          settings={worldInfoSettings}
          onSave={(newSettings) => {
            updateWorldInfoSettings(newSettings);
            setShowSettingsModal(false);
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}
    </div>
  );
};

/** World Info 全局设置弹窗 */
const WorldInfoSettingsModal = ({
  settings,
  onSave,
  onClose,
}: {
  settings: WorldInfoSettings;
  onSave: (s: WorldInfoSettings) => void;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<WorldInfoSettings>(settings);
  return (
    <div className="wi-settings-overlay" onClick={onClose}>
      <div className="wi-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wi-settings-header">
          <h3>⚙️ World Info 全局设置</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="wi-settings-body">
          <div className="form-group">
            <label>全局 Token 预算</label>
            <input
              type="number"
              min="0"
              max="99999"
              value={form.globalTokenBudget}
              onChange={(e) => setForm(prev => ({ ...prev, globalTokenBudget: parseInt(e.target.value) || 0 }))}
            />
            <div className="hint">0=不限</div>
          </div>
          <div className="form-group">
            <label>扫描范围</label>
            <div className="wi-scope-grid">
              {([
                ['messages', '聊天消息'],
                ['charDescription', '角色描述'],
                ['charPersonality', '角色人设'],
                ['scenario', '场景'],
                ['creatorNotes', '作者备注'],
              ] as const).map(([key, label]) => (
                <label key={key} className="wi-scope-item">
                  <input
                    type="checkbox"
                    checked={form.scanScope[key]}
                    onChange={(e) => setForm(prev => ({
                      ...prev,
                      scanScope: { ...prev.scanScope, [key]: e.target.checked },
                    }))}
                  />
                  <span className="checkbox-label">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="form-actions" style={{ borderTop: '1px solid var(--border)' }}>
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={() => onSave(form)}>保存设置</button>
        </div>
      </div>
    </div>
  );
};

export default WorldInfoPage;

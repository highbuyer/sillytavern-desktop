import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useStoreState,
  addWorldInfoEntry,
  updateWorldInfoEntry,
  deleteWorldInfoEntry,
  WorldInfoEntry,
  WIPosition,
  updateWorldInfoSettings,
} from '../store/useStore';

const positionLabels: Record<WIPosition, string> = {
  before_char: '角色定义之前',
  after_char: '角色定义之后',
  before_example: '示例消息之前',
  after_example: '示例消息之后',
  before_last: '最后消息之前',
  after_last: "最后消息之后 (AN)",
};

const positionShortLabels: Record<WIPosition, string> = {
  before_char: 'BChar',
  after_char: 'AChar',
  before_example: 'BEx',
  after_example: 'AEx',
  before_last: 'BLast',
  after_last: 'ALast',
};

type SortMode = 'order' | 'name' | 'updated';

/* ─── Toggle Switch ─── */
const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}> = ({ checked, onChange, label }) => (
  <label className="wi-toggle-switch" title={label}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="wi-toggle-track"><span className="wi-toggle-thumb" /></span>
  </label>
);

/* ─── Entry Inline Drawer (编辑面板) ─── */
const EntryDrawer: React.FC<{
  entry: WorldInfoEntry;
  onSave: (id: number, updates: Partial<WorldInfoEntry>) => void;
  onClose: () => void;
}> = ({ entry, onSave, onClose }) => {
  const [form, setForm] = useState({
    keys: (entry.keys || []).join(', '),
    secondaryKeys: (entry.secondaryKeys || []).join(', '),
    selectiveLogic: entry.selectiveLogic === 'AND' ? 'AND' as const : 'OR' as const,
    content: entry.content || '',
    comment: entry.comment || '',
    name: entry.name || '',
    enabled: entry.enabled !== false,
    constant: entry.constant || false,
    position: (entry.position || 'before_char') as WIPosition,
    caseSensitive: entry.caseSensitive || false,
    scanDepth: entry.scanDepth || 10,
    depth: entry.depth || 0,
    order: entry.order || 0,
    useProbability: entry.useProbability || false,
    probability: entry.probability || 100,
    preventRecursion: entry.preventRecursion || false,
    excludeRecursion: entry.excludeRecursion || false,
    cooldown: entry.cooldown || 0,
    delay: entry.delay || 0,
    group: entry.group || '',
    groupOverride: entry.groupOverride || false,
    groupWeight: entry.groupWeight || 100,
    tokenBudget: entry.tokenBudget || 0,
  });

  const handleSave = () => {
    if (!form.content.trim()) return;
    const keys = form.keys.split(',').map(k => k.trim()).filter(Boolean);
    const secondaryKeys = form.secondaryKeys.split(',').map(k => k.trim()).filter(Boolean);
    onSave(entry.id, {
      keys, secondaryKeys,
      selectiveLogic: form.selectiveLogic,
      content: form.content.trim(),
      comment: form.comment.trim(),
      name: form.name.trim(),
      enabled: form.enabled,
      constant: form.constant,
      position: form.position,
      caseSensitive: form.caseSensitive,
      scanDepth: form.scanDepth,
      depth: form.depth,
      order: form.order,
      useProbability: form.useProbability,
      probability: form.probability,
      preventRecursion: form.preventRecursion,
      excludeRecursion: form.excludeRecursion,
      cooldown: form.cooldown,
      delay: form.delay,
      group: form.group.trim(),
      groupOverride: form.groupOverride,
      groupWeight: form.groupWeight,
      tokenBudget: form.tokenBudget,
    });
    onClose();
  };

  const set = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  return (
    <div className="wi-drawer">
      {/* 主关键词 */}
      <div className="wi-drawer-row">
        <label className="wi-drawer-label">主关键词</label>
        <textarea
          className="wi-drawer-textarea wi-keys-textarea"
          value={form.keys}
          onChange={e => set({ keys: e.target.value })}
          placeholder="用逗号分隔，支持多行"
          rows={2}
        />
      </div>

      {/* 次关键词 + 组合逻辑 */}
      <div className="wi-drawer-row">
        <label className="wi-drawer-label">次关键词</label>
        <textarea
          className="wi-drawer-textarea wi-keys-textarea"
          value={form.secondaryKeys}
          onChange={e => set({ secondaryKeys: e.target.value })}
          placeholder="用逗号分隔"
          rows={2}
        />
      </div>
      {form.secondaryKeys.trim() && (
        <div className="wi-drawer-row">
          <label className="wi-drawer-label">组合逻辑</label>
          <select value={form.selectiveLogic} onChange={e => set({ selectiveLogic: e.target.value as 'AND' | 'OR' })}>
            <option value="OR">OR — 任一匹配</option>
            <option value="AND">AND — 全部匹配</option>
          </select>
        </div>
      )}

      {/* 内容 */}
      <div className="wi-drawer-row">
        <label className="wi-drawer-label">内容 <span className="wi-drawer-label-hint">(注入到 AI 上下文)</span></label>
        <textarea
          className="wi-drawer-textarea wi-content-textarea"
          value={form.content}
          onChange={e => set({ content: e.target.value })}
          placeholder="输入要注入的内容..."
          rows={5}
        />
      </div>

      {/* 备注/名称 */}
      <div className="wi-drawer-row">
        <label className="wi-drawer-label">备注 / 名称</label>
        <input
          type="text"
          value={form.comment || form.name}
          onChange={e => set({ comment: e.target.value, name: e.target.value })}
          placeholder="仅供查看，不注入"
        />
      </div>

      {/* 配置行 */}
      <div className="wi-drawer-config-row">
        <div className="wi-drawer-config-item">
          <label>注入位置</label>
          <select value={form.position} onChange={e => set({ position: e.target.value as WIPosition })}>
            <option value="before_char">角色定义之前</option>
            <option value="after_char">角色定义之后</option>
            <option value="before_example">示例消息之前</option>
            <option value="after_example">示例消息之后</option>
            <option value="before_last">最后消息之前</option>
            <option value="after_last">最后消息之后</option>
          </select>
        </div>
        <div className="wi-drawer-config-item">
          <label>深度</label>
          <input type="number" min={0} max={999} value={form.depth} onChange={e => set({ depth: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="wi-drawer-config-item">
          <label>顺序</label>
          <input type="number" min={0} max={999} value={form.order} onChange={e => set({ order: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="wi-drawer-config-item">
          <label>触发概率 %</label>
          <input type="number" min={0} max={100} value={form.probability} onChange={e => set({ probability: parseInt(e.target.value) || 100 })} />
        </div>
        <div className="wi-drawer-config-item">
          <label>扫描深度</label>
          <input type="number" min={0} max={999} value={form.scanDepth} onChange={e => set({ scanDepth: parseInt(e.target.value) || 10 })} />
        </div>
      </div>

      {/* 开关区域 */}
      <div className="wi-drawer-toggles">
        <ToggleSwitch checked={form.constant} onChange={v => set({ constant: v })} label="常驻注入" />
        <span className="wi-toggle-label">常驻注入</span>

        <ToggleSwitch checked={form.caseSensitive} onChange={v => set({ caseSensitive: v })} label="区分大小写" />
        <span className="wi-toggle-label">区分大小写</span>

        <ToggleSwitch checked={form.enabled} onChange={v => set({ enabled: v })} label="启用" />
        <span className="wi-toggle-label">启用</span>
      </div>

      {/* 高级设置折叠 */}
      <details className="wi-advanced-details">
        <summary>高级设置</summary>
        <div className="wi-advanced-content">
          <div className="wi-drawer-row">
            <label className="wi-drawer-label">分组名称</label>
            <input type="text" value={form.group} onChange={e => set({ group: e.target.value })} placeholder="分组名称" />
          </div>
          <div className="wi-drawer-config-row">
            <div className="wi-drawer-config-item">
              <label>分组覆盖</label>
              <ToggleSwitch checked={form.groupOverride} onChange={v => set({ groupOverride: v })} />
            </div>
            <div className="wi-drawer-config-item">
              <label>组权重</label>
              <input type="number" min={0} max={999} value={form.groupWeight} onChange={e => set({ groupWeight: parseInt(e.target.value) || 100 })} />
            </div>
            <div className="wi-drawer-config-item">
              <label>Token 上限</label>
              <input type="number" min={0} max={99999} value={form.tokenBudget} onChange={e => set({ tokenBudget: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="wi-drawer-config-row">
            <div className="wi-drawer-config-item">
              <label>冷却轮数</label>
              <input type="number" min={0} max={999} value={form.cooldown} onChange={e => set({ cooldown: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="wi-drawer-config-item">
              <label>延迟触发</label>
              <input type="number" min={0} max={999} value={form.delay} onChange={e => set({ delay: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="wi-drawer-toggles">
            <ToggleSwitch checked={form.preventRecursion} onChange={v => set({ preventRecursion: v })} />
            <span className="wi-toggle-label">防递归</span>
            <ToggleSwitch checked={form.excludeRecursion} onChange={v => set({ excludeRecursion: v })} />
            <span className="wi-toggle-label">排除递归</span>
          </div>
        </div>
      </details>

      {/* 操作按钮 */}
      <div className="wi-drawer-actions">
        <button className="btn-secondary" onClick={onClose}>取消</button>
        <button className="btn-primary" onClick={handleSave} disabled={!form.content.trim()}>保存</button>
      </div>
    </div>
  );
};

/* ─── New Entry Drawer ─── */
const NewEntryDrawer: React.FC<{
  onCreate: (entry: Omit<WorldInfoEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onClose: () => void;
  order: number;
}> = ({ onCreate, onClose, order }) => {
  const [form, setForm] = useState({
    keys: '',
    secondaryKeys: '',
    selectiveLogic: 'OR' as 'AND' | 'OR',
    content: '',
    comment: '',
    name: '',
    enabled: true,
    constant: false,
    position: 'before_char' as WIPosition,
    caseSensitive: false,
    scanDepth: 10,
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
    tokenBudget: 0,
  });

  const set = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  const handleCreate = () => {
    if (!form.content.trim()) return;
    const keys = form.keys.split(',').map(k => k.trim()).filter(Boolean);
    const secondaryKeys = form.secondaryKeys.split(',').map(k => k.trim()).filter(Boolean);
    onCreate({
      keys, secondaryKeys,
      selectiveLogic: form.selectiveLogic,
      content: form.content.trim(),
      comment: form.comment.trim(),
      name: form.name.trim(),
      enabled: form.enabled,
      constant: form.constant,
      position: form.position,
      caseSensitive: form.caseSensitive,
      scanDepth: form.scanDepth,
      depth: form.depth,
      order,
      useProbability: form.useProbability,
      probability: form.probability,
      preventRecursion: form.preventRecursion,
      excludeRecursion: form.excludeRecursion,
      cooldown: form.cooldown,
      delay: form.delay,
      group: form.group.trim(),
      groupOverride: form.groupOverride,
      groupWeight: form.groupWeight,
      scanRole: null,
      role: null,
      tokenBudget: form.tokenBudget,
    });
    onClose();
  };

  return (
    <div className="wi-drawer wi-drawer-new">
      <div className="wi-drawer-title">新建条目</div>
      {/* 主关键词 */}
      <div className="wi-drawer-row">
        <label className="wi-drawer-label">主关键词</label>
        <textarea
          className="wi-drawer-textarea wi-keys-textarea"
          value={form.keys}
          onChange={e => set({ keys: e.target.value })}
          placeholder="用逗号分隔，支持多行"
          rows={2}
        />
      </div>
      {/* 次关键词 */}
      <div className="wi-drawer-row">
        <label className="wi-drawer-label">次关键词</label>
        <textarea
          className="wi-drawer-textarea wi-keys-textarea"
          value={form.secondaryKeys}
          onChange={e => set({ secondaryKeys: e.target.value })}
          placeholder="用逗号分隔"
          rows={2}
        />
      </div>
      {form.secondaryKeys.trim() && (
        <div className="wi-drawer-row">
          <label className="wi-drawer-label">组合逻辑</label>
          <select value={form.selectiveLogic} onChange={e => set({ selectiveLogic: e.target.value as 'AND' | 'OR' })}>
            <option value="OR">OR — 任一匹配</option>
            <option value="AND">AND — 全部匹配</option>
          </select>
        </div>
      )}
      {/* 内容 */}
      <div className="wi-drawer-row">
        <label className="wi-drawer-label">内容 <span className="wi-drawer-label-hint">(注入到 AI 上下文)</span></label>
        <textarea
          className="wi-drawer-textarea wi-content-textarea"
          value={form.content}
          onChange={e => set({ content: e.target.value })}
          placeholder="输入要注入的内容..."
          rows={5}
        />
      </div>
      {/* 备注 */}
      <div className="wi-drawer-row">
        <label className="wi-drawer-label">备注 / 名称</label>
        <input type="text" value={form.comment} onChange={e => set({ comment: e.target.value })} placeholder="仅供查看" />
      </div>
      {/* 配置行 */}
      <div className="wi-drawer-config-row">
        <div className="wi-drawer-config-item">
          <label>注入位置</label>
          <select value={form.position} onChange={e => set({ position: e.target.value as WIPosition })}>
            <option value="before_char">角色定义之前</option>
            <option value="after_char">角色定义之后</option>
            <option value="before_example">示例消息之前</option>
            <option value="after_example">示例消息之后</option>
            <option value="before_last">最后消息之前</option>
            <option value="after_last">最后消息之后</option>
          </select>
        </div>
        <div className="wi-drawer-config-item">
          <label>深度</label>
          <input type="number" min={0} max={999} value={form.depth} onChange={e => set({ depth: parseInt(e.target.value) || 0 })} />
        </div>
        <div className="wi-drawer-config-item">
          <label>触发概率 %</label>
          <input type="number" min={0} max={100} value={form.probability} onChange={e => set({ probability: parseInt(e.target.value) || 100 })} />
        </div>
        <div className="wi-drawer-config-item">
          <label>扫描深度</label>
          <input type="number" min={0} max={999} value={form.scanDepth} onChange={e => set({ scanDepth: parseInt(e.target.value) || 10 })} />
        </div>
      </div>
      {/* 开关 */}
      <div className="wi-drawer-toggles">
        <ToggleSwitch checked={form.constant} onChange={v => set({ constant: v })} />
        <span className="wi-toggle-label">常驻注入</span>
        <ToggleSwitch checked={form.caseSensitive} onChange={v => set({ caseSensitive: v })} />
        <span className="wi-toggle-label">区分大小写</span>
      </div>
      {/* 高级设置 */}
      <details className="wi-advanced-details">
        <summary>高级设置</summary>
        <div className="wi-advanced-content">
          <div className="wi-drawer-row">
            <label className="wi-drawer-label">分组名称</label>
            <input type="text" value={form.group} onChange={e => set({ group: e.target.value })} placeholder="分组名称" />
          </div>
          <div className="wi-drawer-config-row">
            <div className="wi-drawer-config-item">
              <label>分组覆盖</label>
              <ToggleSwitch checked={form.groupOverride} onChange={v => set({ groupOverride: v })} />
            </div>
            <div className="wi-drawer-config-item">
              <label>组权重</label>
              <input type="number" min={0} max={999} value={form.groupWeight} onChange={e => set({ groupWeight: parseInt(e.target.value) || 100 })} />
            </div>
            <div className="wi-drawer-config-item">
              <label>Token 上限</label>
              <input type="number" min={0} max={99999} value={form.tokenBudget} onChange={e => set({ tokenBudget: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="wi-drawer-config-row">
            <div className="wi-drawer-config-item">
              <label>冷却轮数</label>
              <input type="number" min={0} max={999} value={form.cooldown} onChange={e => set({ cooldown: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="wi-drawer-config-item">
              <label>延迟触发</label>
              <input type="number" min={0} max={999} value={form.delay} onChange={e => set({ delay: parseInt(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="wi-drawer-toggles">
            <ToggleSwitch checked={form.preventRecursion} onChange={v => set({ preventRecursion: v })} />
            <span className="wi-toggle-label">防递归</span>
            <ToggleSwitch checked={form.excludeRecursion} onChange={v => set({ excludeRecursion: v })} />
            <span className="wi-toggle-label">排除递归</span>
          </div>
        </div>
      </details>
      {/* 操作按钮 */}
      <div className="wi-drawer-actions">
        <button className="btn-secondary" onClick={onClose}>取消</button>
        <button className="btn-primary" onClick={handleCreate} disabled={!form.content.trim()}>创建条目</button>
      </div>
    </div>
  );
};

/* ─── Settings Modal ─── */
const SettingsModal: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const { worldInfoSettings } = useStoreState();
  const [form, setForm] = useState({
    globalTokenBudget: worldInfoSettings.globalTokenBudget || 0,
    scanScope: { ...worldInfoSettings.scanScope },
  });

  const setScope = (key: keyof typeof form.scanScope, value: boolean) =>
    setForm(prev => ({ ...prev, scanScope: { ...prev.scanScope, [key]: value } }));

  const handleSave = () => {
    updateWorldInfoSettings({
      globalTokenBudget: form.globalTokenBudget,
      scanScope: form.scanScope,
    });
    onClose();
  };

  return (
    <div className="wi-modal-overlay" onClick={onClose}>
      <div className="wi-modal" onClick={e => e.stopPropagation()}>
        <div className="wi-modal-header">
          <h3>World Info 设置</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="wi-modal-body">
          <div className="wi-drawer-row">
            <label className="wi-drawer-label">Token 预算（全局上限）</label>
            <input type="number" min={0} max={999999} value={form.globalTokenBudget} onChange={e => setForm(prev => ({ ...prev, globalTokenBudget: parseInt(e.target.value) || 0 }))} />
            <div className="hint">0 = 不限</div>
          </div>

          <div className="wi-settings-section-title">扫描范围</div>
          <div className="wi-drawer-toggles">
            <ToggleSwitch checked={form.scanScope.messages} onChange={v => setScope('messages', v)} />
            <span className="wi-toggle-label">聊天消息</span>
            <ToggleSwitch checked={form.scanScope.charDescription} onChange={v => setScope('charDescription', v)} />
            <span className="wi-toggle-label">角色描述</span>
            <ToggleSwitch checked={form.scanScope.charPersonality} onChange={v => setScope('charPersonality', v)} />
            <span className="wi-toggle-label">角色人设</span>
          </div>
          <div className="wi-drawer-toggles">
            <ToggleSwitch checked={form.scanScope.scenario} onChange={v => setScope('scenario', v)} />
            <span className="wi-toggle-label">场景</span>
            <ToggleSwitch checked={form.scanScope.creatorNotes} onChange={v => setScope('creatorNotes', v)} />
            <span className="wi-toggle-label">作者备注</span>
          </div>
        </div>
        <div className="wi-modal-footer">
          <button className="btn-secondary" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
const WorldInfoPage: React.FC = () => {
  const navigate = useNavigate();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('order');
  const [activeGroupFilter, setActiveGroupFilter] = useState<string>('__all__');

  const { worldInfo, worldInfoSettings } = useStoreState();

  const allGroups = useMemo(() => {
    const s = new Set<string>();
    worldInfo.forEach(e => { if (e.group?.trim()) s.add(e.group.trim()); });
    return Array.from(s).sort();
  }, [worldInfo]);

  const filteredEntries = useMemo(() => {
    let entries = [...worldInfo].filter(entry => {
      if (activeGroupFilter === '__ungrouped__') {
        if (entry.group?.trim()) return false;
      } else if (activeGroupFilter !== '__all__') {
        if (!entry.group || entry.group.trim() !== activeGroupFilter) return false;
      }
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        entry.keys.some(k => k.toLowerCase().includes(q)) ||
        entry.content.toLowerCase().includes(q) ||
        entry.comment.toLowerCase().includes(q) ||
        entry.name.toLowerCase().includes(q)
      );
    });
    switch (sortMode) {
      case 'name': entries.sort((a, b) => (a.name || a.comment || '').localeCompare(b.name || b.comment || '')); break;
      case 'updated': entries.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()); break;
      default: entries.sort((a, b) => a.order - b.order);
    }
    return entries;
  }, [worldInfo, activeGroupFilter, searchQuery, sortMode]);

  const groupedEntries = useMemo(() => {
    const groups: { [k: string]: WorldInfoEntry[] } = {};
    filteredEntries.forEach(entry => {
      const g = entry.group?.trim() || '__ungrouped__';
      if (!groups[g]) groups[g] = [];
      groups[g].push(entry);
    });
    return groups;
  }, [filteredEntries]);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveEdit = (id: number, updates: Partial<WorldInfoEntry>) => {
    updateWorldInfoEntry(id, updates);
    setEditingId(null);
  };

  const handleDuplicate = (entry: WorldInfoEntry) => {
    const { id, createdAt, updatedAt, ...rest } = entry;
    addWorldInfoEntry({
      ...rest,
      keys: [...rest.keys],
      secondaryKeys: [...(rest.secondaryKeys || [])],
      order: worldInfo.length,
    });
  };

  // Export
  const mapPositionToST = (pos: string): number => {
    const map: Record<string, number> = {
      'before_char': 0, 'after_char': 1, 'before_example': 2, 'after_example': 3, 'before_last': 4, 'after_last': 4, 'before': 0, 'after': 4,
    };
    return map[pos] ?? 0;
  };

  const handleExport = () => {
    const entriesObj: Record<string, any> = {};
    worldInfo.forEach((entry, index) => {
      entriesObj[String(index)] = {
        uid: entry.id, displayIndex: entry.order, name: entry.name || '', comment: entry.comment || '',
        keys: entry.keys, keysecondary: entry.secondaryKeys || [],
        selectiveLogic: entry.selectiveLogic === 'AND' ? 1 : 0,
        content: entry.content, constant: entry.constant,
        selective: (entry.secondaryKeys || []).length > 0, disable: !entry.enabled,
        position: mapPositionToST(entry.position), depth: entry.depth || entry.scanDepth || 4,
        order: entry.order, caseSensitive: entry.caseSensitive || null, scanDepth: entry.scanDepth || null,
        useProbability: entry.useProbability, probability: entry.probability,
        preventRecursion: entry.preventRecursion, excludeRecursion: entry.excludeRecursion,
        delay: entry.delay || null, cooldown: entry.cooldown || null,
        group: entry.group || '', groupOverride: entry.groupOverride || false,
        groupWeight: entry.groupWeight || 100, tokenBudget: entry.tokenBudget || null,
        characterFilter: entry.role ? { isExclude: false, names: [], tags: [] } : undefined,
      };
    });
    const json = JSON.stringify({ entries: entriesObj }, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sillytavern-worldinfo.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const mapPosition = (pos: any): WIPosition => {
    if (!pos && pos !== 0) return 'before_char';
    const newPositions: WIPosition[] = ['before_char', 'after_char', 'before_example', 'after_example', 'before_last', 'after_last'];
    if (typeof pos === 'string') {
      if (newPositions.includes(pos as WIPosition)) return pos as WIPosition;
      if (pos === 'before') return 'before_char';
      if (pos === 'after') return 'after_last';
      return 'before_char';
    }
    if (typeof pos === 'number') {
      switch (pos) { case 0: return 'before_char'; case 1: return 'after_char'; case 2: return 'before_example'; case 3: return 'after_example'; case 4: return 'after_last'; default: return 'before_char'; }
    }
    return 'before_char';
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          let imported: any[] = [];
          if (Array.isArray(data)) { imported = data; }
          else if (data?.entries) { const en = data.entries; imported = Array.isArray(en) ? en : typeof en === 'object' ? Object.values(en) : []; }
          else if (typeof data === 'object') { if (data.key || data.keys || data.content) imported = [data]; else imported = Object.values(data).filter((e: any) => e?.content); }
          if (!imported.length) { alert('未找到有效条目'); return; }
          let count = 0;
          for (const entry of imported) {
            const keys = entry.key || entry.keys || [];
            const keyArray = Array.isArray(keys) ? keys : typeof keys === 'string' ? keys.split(',').map((k: string) => k.trim()).filter(Boolean) : [];
            const secKeys = entry.keysecondary || entry.secondary_keys || entry.secondaryKeys || [];
            const secondaryKeyArray = Array.isArray(secKeys) ? secKeys : typeof secKeys === 'string' ? secKeys.split(',').map((k: string) => k.trim()).filter(Boolean) : [];
            addWorldInfoEntry({
              keys: keyArray, secondaryKeys: secondaryKeyArray,
              selectiveLogic: entry.selectiveLogic === 1 || entry.selectiveLogic === 'AND' ? 'AND' : 'OR',
              content: entry.content || '', comment: entry.comment || '', name: entry.name || entry.comment || '',
              enabled: entry.disable === true ? false : (entry.enabled !== false),
              constant: entry.constant || false, position: mapPosition(entry.position),
              order: entry.order ?? entry.displayIndex ?? worldInfo.length,
              depth: entry.depth || 0, caseSensitive: entry.caseSensitive || false,
              scanDepth: entry.scanDepth || entry.depth || 10,
              useProbability: entry.useProbability || false, probability: entry.probability ?? 100,
              preventRecursion: entry.preventRecursion || false, excludeRecursion: entry.excludeRecursion || false,
              cooldown: entry.cooldown || 0, delay: entry.delay || 0,
              group: entry.group || '', groupOverride: entry.groupOverride || false,
              groupWeight: entry.groupWeight || 100, scanRole: null, role: null, tokenBudget: entry.tokenBudget || 0,
            });
            count++;
          }
          alert(`成功导入 ${count} 条 World Info`);
        } catch (err: any) { alert('导入失败：' + err.message); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const totalEnabled = worldInfo.filter(e => e.enabled).length;
  const totalConstant = worldInfo.filter(e => e.constant).length;

  return (
    <div className="wi-page">
      {/* ─── 顶部工具栏 ─── */}
      <div className="wi-top-bar">
        <div className="wi-top-bar-left">
          <h1 className="wi-page-title">World Info</h1>
          <span className="wi-page-subtitle">Lorebook</span>
        </div>
        <div className="wi-top-bar-right">
          <button className="btn-secondary btn-sm" onClick={() => navigate('/')}>← 返回</button>
          <button className="btn-secondary btn-sm" onClick={handleExport} disabled={!worldInfo.length}>导出</button>
          <button className="btn-secondary btn-sm" onClick={handleImport}>导入</button>
          <button className="btn-secondary btn-sm" onClick={() => setShowSettingsModal(true)}>⚙ 设置</button>
          <button className="btn-primary btn-sm" onClick={() => setShowNewForm(true)}>+ 新建条目</button>
        </div>
      </div>

      {/* ─── 搜索与排序工具栏 ─── */}
      <div className="wi-toolbar">
        <div className="wi-toolbar-left">
          <span className="wi-search-icon">🔍</span>
          <input
            className="wi-search-input"
            placeholder="搜索关键词、内容或备注..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="wi-toolbar-right">
          <select className="wi-sort-select" value={sortMode} onChange={e => setSortMode(e.target.value as SortMode)}>
            <option value="order">按顺序</option>
            <option value="name">按名称</option>
            <option value="updated">按更新时间</option>
          </select>
        </div>
      </div>

      {/* ─── 分组筛选标签 ─── */}
      <div className="wi-group-tabs">
        <button className={`wi-group-tab ${activeGroupFilter === '__all__' ? 'active' : ''}`} onClick={() => setActiveGroupFilter('__all__')}>全部</button>
        <button className={`wi-group-tab ${activeGroupFilter === '__ungrouped__' ? 'active' : ''}`} onClick={() => setActiveGroupFilter('__ungrouped__')}>未分组</button>
        {allGroups.map(g => (
          <button key={g} className={`wi-group-tab ${activeGroupFilter === g ? 'active' : ''}`} onClick={() => setActiveGroupFilter(g)}>{g}</button>
        ))}
      </div>

      {/* ─── 列标题 ─── */}
      <div className="wi-column-headers">
        <div className="wi-col wi-col-expand"></div>
        <div className="wi-col wi-col-toggle"></div>
        <div className="wi-col wi-col-title">Title / Memo</div>
        <div className="wi-col wi-col-keys">Keys</div>
        <div className="wi-col wi-col-group">Group</div>
        <div className="wi-col wi-col-meta">Strategy</div>
        <div className="wi-col wi-col-meta">Position</div>
        <div className="wi-col wi-col-meta">Depth</div>
        <div className="wi-col wi-col-meta">Order</div>
        <div className="wi-col wi-col-meta">Trigger%</div>
        <div className="wi-col wi-col-actions"></div>
      </div>

      {/* ─── 条目列表 ─── */}
      <div className="wi-entries-list">
        {filteredEntries.length === 0 && !showNewForm && (
          <div className="wi-empty">
            <div className="wi-empty-icon">📖</div>
            <h2>还没有 World Info 条目</h2>
            <p>World Info 可以在特定关键词出现时自动注入设定信息到 AI 上下文中，非常适合角色扮演和长篇故事创作。</p>
            <button className="btn-primary" onClick={() => setShowNewForm(true)}>创建第一个条目</button>
          </div>
        )}

        {/* 新建条目面板 */}
        {showNewForm && (
          <NewEntryDrawer
            key="new-entry"
            onCreate={(entry) => addWorldInfoEntry(entry)}
            onClose={() => setShowNewForm(false)}
            order={worldInfo.length}
          />
        )}

        {/* 按分组渲染 */}
        {Object.entries(groupedEntries)
          .sort(([a], [b]) => {
            if (a === '__ungrouped__') return 1;
            if (b === '__ungrouped__') return -1;
            return a.localeCompare(b);
          })
          .map(([groupName, entries]) => {
            const isUngrouped = groupName === '__ungrouped__';
            const displayName = isUngrouped ? '未分组' : groupName;

            return (
              <div key={groupName} className="wi-group-section">
                <div className="wi-group-section-header">
                  <span className="wi-group-section-name">{displayName}</span>
                  <span className="wi-group-section-count">{entries.length}</span>
                </div>
                {entries.map(entry => {
                  const isExpanded = expandedIds.has(entry.id);
                  const isEditing = editingId === entry.id;
                  const displayName = entry.name || entry.comment || (entry.keys[0] || '(无名称)');
                  const strategy = entry.constant ? '常驻' : (entry.selectiveLogic === 'AND' ? 'AND' : 'ANY');

                  return (
                    <div
                      key={entry.id}
                      className={`wi-entry-card ${!entry.enabled ? 'wi-entry-disabled' : ''} ${isExpanded ? 'wi-entry-expanded' : ''} ${entry.constant ? 'wi-entry-constant' : ''}`}
                    >
                      {/* 头部 */}
                      <div className="wi-entry-header" onClick={() => !isEditing && toggleExpand(entry.id)}>
                        <div className="wi-col wi-col-expand">
                          <span className="wi-expand-arrow">{isExpanded ? '▼' : '▶'}</span>
                        </div>
                        <div className="wi-col wi-col-toggle" onClick={e => e.stopPropagation()}>
                          <ToggleSwitch
                            checked={entry.enabled}
                            onChange={() => updateWorldInfoEntry(entry.id, { enabled: !entry.enabled })}
                          />
                        </div>
                        <div className="wi-col wi-col-title">
                          <span className="wi-entry-title">{displayName}</span>
                        </div>
                        <div className="wi-col wi-col-keys">
                          <div className="wi-key-tags">
                            {entry.keys.slice(0, 3).map((key, i) => (
                              <span key={i} className="wi-key-tag">{key}</span>
                            ))}
                            {entry.keys.length > 3 && <span className="wi-key-tag wi-key-more">+{entry.keys.length - 3}</span>}
                            {entry.keys.length === 0 && <span className="wi-key-tag wi-key-none">无关键词</span>}
                          </div>
                        </div>
                        <div className="wi-col wi-col-group">
                          {entry.group ? (
                            <span className="wi-group-badge">{entry.group}</span>
                          ) : (
                            <span className="wi-group-badge wi-group-badge-empty">-</span>
                          )}
                        </div>
                        <div className="wi-col wi-col-meta">
                          <span className={`wi-meta-badge ${entry.constant ? 'wi-meta-constant' : ''}`}>{strategy}</span>
                        </div>
                        <div className="wi-col wi-col-meta">
                          <span className="wi-meta-badge">{positionShortLabels[entry.position] || entry.position}</span>
                        </div>
                        <div className="wi-col wi-col-meta">
                          <span className="wi-meta-badge">{entry.depth}</span>
                        </div>
                        <div className="wi-col wi-col-meta">
                          <span className="wi-meta-badge">{entry.order}</span>
                        </div>
                        <div className="wi-col wi-col-meta">
                          <span className="wi-meta-badge">{entry.useProbability ? `${entry.probability}%` : '100%'}</span>
                        </div>
                        <div className="wi-col wi-col-actions" onClick={e => e.stopPropagation()}>
                          <button className="wi-action-btn" onClick={() => setEditingId(entry.id)} title="编辑">✏️</button>
                          <button className="wi-action-btn" onClick={() => handleDuplicate(entry)} title="复制">📋</button>
                          <button className="wi-action-btn wi-action-delete" onClick={() => {
                            if (window.confirm('确定删除此条目？')) {
                              deleteWorldInfoEntry(entry.id);
                              setExpandedIds(prev => { const n = new Set(prev); n.delete(entry.id); return n; });
                            }
                          }} title="删除">🗑️</button>
                        </div>
                      </div>

                      {/* 编辑面板 / 内容预览 */}
                      {isExpanded && !isEditing && (
                        <div className="wi-entry-body">
                          <div className="wi-body-section">
                            <div className="wi-body-label">内容</div>
                            <pre className="wi-body-content">{entry.content || '(空)'}</pre>
                          </div>
                          {entry.secondaryKeys?.length > 0 && (
                            <div className="wi-body-section">
                              <div className="wi-body-label">次关键词</div>
                              <div className="wi-key-tags">
                                {entry.secondaryKeys.map((k, i) => (
                                  <span key={i} className="wi-key-tag wi-key-secondary">{k}</span>
                                ))}
                              </div>
                              <span className="wi-body-hint">逻辑: {entry.selectiveLogic === 'AND' ? 'AND' : 'ANY'}</span>
                            </div>
                          )}
                          <div className="wi-body-details">
                            <span>扫描深度: {entry.scanDepth}</span>
                            <span>Token上限: {entry.tokenBudget || '不限'}</span>
                            {entry.cooldown > 0 && <span>冷却: {entry.cooldown}轮</span>}
                            {entry.delay > 0 && <span>延迟: {entry.delay}轮</span>}
                          </div>
                        </div>
                      )}

                      {isEditing && (
                        <EntryDrawer
                          key={`edit-${entry.id}`}
                          entry={entry}
                          onSave={handleSaveEdit}
                          onClose={() => setEditingId(null)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
      </div>

      {/* ─── 底部状态栏 ─── */}
      <div className="wi-status-bar">
        <span>总计: {worldInfo.length} 条</span>
        <span className="wi-stat-enabled">启用: {totalEnabled}</span>
        <span className="wi-stat-constant">常驻: {totalConstant}</span>
      </div>

      {/* ─── 设置弹窗 ─── */}
      {showSettingsModal && <SettingsModal onClose={() => setShowSettingsModal(false)} />}
    </div>
  );
};

export default WorldInfoPage;

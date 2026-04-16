import React, { useState, useEffect, useRef } from 'react';
import { Role } from '../store/useStore';

interface RoleEditorProps {
  role?: Role;
  onSave: (updates: Partial<Role>) => void;
  onCancel: () => void;
}

const RoleEditor: React.FC<RoleEditorProps> = ({ role, onSave, onCancel }) => {
  const [form, setForm] = useState<Partial<Role>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showGreetings, setShowGreetings] = useState(false);

  useEffect(() => {
    if (role) {
      setForm({
        name: role.name || '',
        description: role.description || '',
        avatar: role.avatar || '',
        prompt: role.prompt || '',
        personality: role.personality || '',
        scenario: role.scenario || '',
        first_mes: role.first_mes || '',
        mes_example: role.mes_example || '',
        alternate_greetings: role.alternate_greetings || [],
        system_prompt: role.system_prompt || '',
        post_history_instructions: role.post_history_instructions || '',
        creator_notes: role.creator_notes || '',
        creator: role.creator || '',
        character_version: role.character_version || '',
        tags: role.tags || [],
        talkativeness: role.talkativeness ?? 50,
        temperature: role.temperature ?? 0.7,
        maxTokens: role.maxTokens ?? 2000,
        topP: role.topP ?? 0.9,
        frequencyPenalty: role.frequencyPenalty ?? 0.0,
        presencePenalty: role.presencePenalty ?? 0.0,
      });
    } else {
      setForm({
        name: '', description: '', avatar: '', prompt: '',
        personality: '', scenario: '', first_mes: '', mes_example: '',
        alternate_greetings: [], system_prompt: '', post_history_instructions: '',
        creator_notes: '', creator: '', character_version: '', tags: [],
        talkativeness: 50,
        temperature: 0.7, maxTokens: 2000, topP: 0.9,
        frequencyPenalty: 0.0, presencePenalty: 0.0,
      });
    }
  }, [role]);

  const handleChange = (field: keyof Role, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarColors = [
    '#5B3FD9', '#00CED1', '#FF6B6B', '#4CAF50', '#FF9800',
    '#E91E63', '#2196F3', '#9C27B0', '#795548', '#607D8B',
  ];

  const handleUploadAvatar = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) { alert('请选择图片文件'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 512;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) { height = Math.round((height * maxSize) / width); width = maxSize; }
          else { width = Math.round((width * maxSize) / height); height = maxSize; }
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) { ctx.drawImage(img, 0, 0, width, height); handleChange('avatar', canvas.toDataURL('image/png')); }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGenerateColorAvatar = (color: string) => {
    const initial = (form.name || '?').charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="${color}"/><text x="64" y="75" text-anchor="middle" font-size="48" fill="white" font-family="sans-serif">${initial}</text></svg>`;
    handleChange('avatar', `data:image/svg+xml;utf8,${svg}`);
  };

  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
    const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
    if (fallback) fallback.style.display = 'flex';
  };

  // ── 备选问候语管理 ──
  const handleAddGreeting = () => {
    const greetings = [...(form.alternate_greetings || []), ''];
    handleChange('alternate_greetings', greetings);
  };
  const handleRemoveGreeting = (idx: number) => {
    const greetings = (form.alternate_greetings || []).filter((_, i) => i !== idx);
    handleChange('alternate_greetings', greetings);
  };
  const handleGreetingChange = (idx: number, value: string) => {
    const greetings = [...(form.alternate_greetings || [])];
    greetings[idx] = value;
    handleChange('alternate_greetings', greetings);
  };

  // ── 标签管理 ──
  const [tagInput, setTagInput] = useState('');
  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !(form.tags || []).includes(tag)) {
      handleChange('tags', [...(form.tags || []), tag]);
      setTagInput('');
    }
  };
  const handleRemoveTag = (tag: string) => {
    handleChange('tags', (form.tags || []).filter(t => t !== tag));
  };

  return (
    <form className="role-editor-form" onSubmit={handleSubmit}>
      {/* ── 基本信息 ── */}
      <div className="form-section">
        <h3>基本信息</h3>
        <div className="form-group">
          <label>角色名称 *</label>
          <input type="text" value={form.name} onChange={(e) => handleChange('name', e.target.value)} required placeholder="例如：AI助手" />
        </div>
        <div className="form-group">
          <label>角色描述</label>
          <textarea value={form.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="角色的外观、性格、背景描述" rows={3} />
          <div className="hint">描述长度: {form.description?.length || 0} 字符</div>
        </div>
        <div className="form-group">
          <label>标签</label>
          <div className="tags-editor">
            <div className="tags-list">
              {(form.tags || []).map(tag => (
                <span key={tag} className="tag-item">
                  {tag} <button type="button" onClick={() => handleRemoveTag(tag)}>×</button>
                </span>
              ))}
            </div>
            <div className="tag-input-row">
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }}} placeholder="添加标签后按 Enter" />
              <button type="button" className="btn-secondary btn-small" onClick={handleAddTag}>添加</button>
            </div>
          </div>
        </div>
        <div className="form-group">
          <label>角色头像</label>
          <div className="avatar-editor">
            <div className="avatar-current-preview">
              {form.avatar ? (
                <img src={form.avatar} alt="当前头像" className="avatar-preview-img" onError={handleAvatarError} />
              ) : (
                <div className="avatar-preview-placeholder">?</div>
              )}
              <div className="avatar-preview-placeholder avatar-fallback" style={{ display: 'none' }}>?</div>
            </div>
            <div className="avatar-actions">
              <button type="button" className="btn-secondary btn-small" onClick={handleUploadAvatar}>上传图片</button>
              <button type="button" className="btn-secondary btn-small" onClick={() => handleChange('avatar', '')}>清除头像</button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <div className="avatar-color-presets">
              <span className="avatar-presets-label">颜色头像：</span>
              <div className="avatar-color-grid">
                {avatarColors.map((color, idx) => (
                  <div key={idx} className="avatar-color-dot" style={{ backgroundColor: color }} onClick={() => handleGenerateColorAvatar(color)} />
                ))}
              </div>
            </div>
            <details className="avatar-url-section">
              <summary>使用图片URL</summary>
              <input type="text" value={form.avatar?.startsWith('data:') ? '' : form.avatar || ''} onChange={(e) => handleChange('avatar', e.target.value)} placeholder="输入图片URL（https://...）" />
            </details>
          </div>
        </div>
      </div>

      {/* ── 提示词设定 ── */}
      <div className="form-section">
        <h3>提示词设定</h3>
        <div className="form-group">
          <label>系统提示词 *</label>
          <textarea value={form.prompt} onChange={(e) => handleChange('prompt', e.target.value)} required placeholder="设定角色的行为、性格、知识范围等（全局默认）" rows={6} />
          <div className="hint">提示词长度: {form.prompt?.length || 0} 字符</div>
        </div>
      </div>

      {/* ── 高级定义（折叠） ── */}
      <div className="form-section">
        <div className="section-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
          <h3>高级定义</h3>
          <span className="toggle-icon">{showAdvanced ? '▼' : '▶'}</span>
        </div>
        {showAdvanced && (
          <>
            <div className="form-group">
              <label>性格概述</label>
              <textarea value={form.personality || ''} onChange={(e) => handleChange('personality', e.target.value)} placeholder="简短的性格概述" rows={2} />
            </div>
            <div className="form-group">
              <label>对话场景</label>
              <textarea value={form.scenario || ''} onChange={(e) => handleChange('scenario', e.target.value)} placeholder="对话的情境、时间、地点等" rows={2} />
            </div>
            <div className="form-group">
              <label>角色专属系统提示词</label>
              <textarea value={form.system_prompt || ''} onChange={(e) => handleChange('system_prompt', e.target.value)} placeholder="覆盖全局系统提示词，支持 {{original}} 占位符" rows={3} />
              <div className="hint">留空则使用上方的系统提示词</div>
            </div>
            <div className="form-group">
              <label>后历史指令 (Jailbreak)</label>
              <textarea value={form.post_history_instructions || ''} onChange={(e) => handleChange('post_history_instructions', e.target.value)} placeholder="在消息历史之后注入的指令，支持 {{original}} 占位符" rows={3} />
            </div>
            <div className="form-group">
              <label>示例对话</label>
              <textarea value={form.mes_example || ''} onChange={(e) => handleChange('mes_example', e.target.value)} placeholder={`用 <START> 分隔对话块，例如：\n<START>\n{{user}}: 你好\n{{char}}: 你好呀！`} rows={4} />
            </div>
            <div className="form-group">
              <label>创作者注释</label>
              <textarea value={form.creator_notes || ''} onChange={(e) => handleChange('creator_notes', e.target.value)} placeholder="关于此角色的说明（不会注入到 prompt）" rows={2} />
            </div>
            <div className="form-group">
              <label>创作者</label>
              <input type="text" value={form.creator || ''} onChange={(e) => handleChange('creator', e.target.value)} placeholder="角色创作者名称" />
            </div>
            <div className="form-group">
              <label>角色版本</label>
              <input type="text" value={form.character_version || ''} onChange={(e) => handleChange('character_version', e.target.value)} placeholder="例如: 1.0" />
            </div>
          </>
        )}
      </div>

      {/* ── 问候语（折叠） ── */}
      <div className="form-section">
        <div className="section-toggle" onClick={() => setShowGreetings(!showGreetings)}>
          <h3>问候语设定</h3>
          <span className="toggle-icon">{showGreetings ? '▼' : '▶'}</span>
        </div>
        {showGreetings && (
          <>
            <div className="form-group">
              <label>首条问候语</label>
              <textarea value={form.first_mes || ''} onChange={(e) => handleChange('first_mes', e.target.value)} placeholder="新对话开始时发送的第一条消息" rows={4} />
              <div className="hint">支持 Markdown 格式</div>
            </div>
            <div className="form-group">
              <label>备选问候语 ({(form.alternate_greetings || []).length})</label>
              {(form.alternate_greetings || []).map((g, idx) => (
                <div key={idx} className="greeting-item">
                  <textarea value={g} onChange={(e) => handleGreetingChange(idx, e.target.value)} placeholder={`备选问候语 #${idx + 1}`} rows={2} />
                  <button type="button" className="btn-danger btn-small" onClick={() => handleRemoveGreeting(idx)}>删除</button>
                </div>
              ))}
              <button type="button" className="btn-secondary btn-small" onClick={handleAddGreeting}>+ 添加备选问候语</button>
            </div>
          </>
        )}
      </div>

      {/* ── 生成参数 ── */}
      <div className="form-section">
        <h3>生成参数</h3>
        <div className="params-grid">
          <div className="form-group">
            <label>温度 ({form.temperature})<input type="range" min="0" max="2" step="0.1" value={form.temperature} onChange={(e) => handleChange('temperature', parseFloat(e.target.value))} /></label>
            <div className="hint">值越高越随机，值越低越确定</div>
          </div>
          <div className="form-group">
            <label>最大令牌数</label>
            <input type="number" min="100" max="8000" step="100" value={form.maxTokens} onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))} />
          </div>
          <div className="form-group">
            <label>Top-P ({form.topP})<input type="range" min="0" max="1" step="0.05" value={form.topP} onChange={(e) => handleChange('topP', parseFloat(e.target.value))} /></label>
          </div>
          <div className="form-group">
            <label>频率惩罚 ({form.frequencyPenalty})<input type="range" min="-2" max="2" step="0.1" value={form.frequencyPenalty} onChange={(e) => handleChange('frequencyPenalty', parseFloat(e.target.value))} /></label>
          </div>
          <div className="form-group">
            <label>存在惩罚 ({form.presencePenalty})<input type="range" min="-2" max="2" step="0.1" value={form.presencePenalty} onChange={(e) => handleChange('presencePenalty', parseFloat(e.target.value))} /></label>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>取消</button>
        <button type="submit" className="btn-primary">{role ? '保存更改' : '创建角色'}</button>
      </div>
    </form>
  );
};

export default RoleEditor;

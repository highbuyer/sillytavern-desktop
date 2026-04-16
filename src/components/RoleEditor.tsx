import React, { useState, useEffect, useRef } from 'react';
import { Role } from '../store/useStore';

interface RoleEditorProps {
  role?: Role;
  onSave: (updates: Partial<Role>) => void;
  onCancel: () => void;
}

type EditorTab = 'info' | 'description' | 'personality' | 'scenario' | 'greetings' | 'examples' | 'notes' | 'advanced';

const TABS: { key: EditorTab; label: string }[] = [
  { key: 'info', label: '角色信息' },
  { key: 'description', label: '描述' },
  { key: 'personality', label: '人设' },
  { key: 'scenario', label: '场景' },
  { key: 'greetings', label: '问候语' },
  { key: 'examples', label: '示例对话' },
  { key: 'notes', label: '创作者备注' },
  { key: 'advanced', label: '高级设定' },
];

const RoleEditor: React.FC<RoleEditorProps> = ({ role, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState<EditorTab>('info');
  const [form, setForm] = useState<Partial<Role>>({});
  const [showGroupGreetings, setShowGroupGreetings] = useState(false);

  useEffect(() => {
    if (role) {
      setForm({
        name: role.name || '',
        nickname: role.nickname || '',
        description: role.description || '',
        avatar: role.avatar || '',
        prompt: role.prompt || '',
        personality: role.personality || '',
        scenario: role.scenario || '',
        first_mes: role.first_mes || '',
        mes_example: role.mes_example || '',
        alternate_greetings: role.alternate_greetings || [],
        group_only_greetings: role.group_only_greetings || [],
        system_prompt: role.system_prompt || '',
        post_history_instructions: role.post_history_instructions || '',
        creator_notes: role.creator_notes || '',
        creator: role.creator || '',
        character_version: role.character_version || '',
        create_date: role.create_date || '',
        tags: role.tags || [],
        talkativeness: role.talkativeness ?? 50,
        temperature: role.temperature ?? 0.7,
        maxTokens: role.maxTokens ?? 2000,
        topP: role.topP ?? 0.9,
        topK: role.topK ?? 0,
        minP: role.minP ?? 0,
        frequencyPenalty: role.frequencyPenalty ?? 0.0,
        presencePenalty: role.presencePenalty ?? 0.0,
        impersonation_prompt: role.impersonation_prompt || '',
        depth_prompt: role.depth_prompt || { prompt: '', depth: 4, role: 0 },
      });
    } else {
      setForm({
        name: '', nickname: '', description: '', avatar: '', prompt: '',
        personality: '', scenario: '', first_mes: '', mes_example: '',
        alternate_greetings: [], group_only_greetings: [],
        system_prompt: '', post_history_instructions: '',
        creator_notes: '', creator: '', character_version: '', create_date: '',
        tags: [], talkativeness: 50,
        temperature: 0.7, maxTokens: 2000, topP: 0.9, topK: 0, minP: 0,
        frequencyPenalty: 0.0, presencePenalty: 0.0,
        impersonation_prompt: '', depth_prompt: { prompt: '', depth: 4, role: 0 },
      });
    }
    setActiveTab('info');
  }, [role]);

  const handleChange = (field: keyof Role, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  // ── 头像管理 ──
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

  // ── 问候语管理 ──
  const handleAddGreeting = (field: 'alternate_greetings' | 'group_only_greetings') => {
    const greetings = [...(form[field] || []), ''];
    handleChange(field, greetings);
  };
  const handleRemoveGreeting = (field: 'alternate_greetings' | 'group_only_greetings', idx: number) => {
    const greetings = (form[field] || []).filter((_, i) => i !== idx);
    handleChange(field, greetings);
  };
  const handleGreetingChange = (field: 'alternate_greetings' | 'group_only_greetings', idx: number, value: string) => {
    const greetings = [...(form[field] || [])];
    greetings[idx] = value;
    handleChange(field, greetings);
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

  // ── Depth Prompt ──
  const handleDepthPromptChange = (field: 'prompt' | 'depth' | 'role', value: string | number) => {
    const dp = { ...(form.depth_prompt || { prompt: '', depth: 4, role: 0 }), [field]: value };
    handleChange('depth_prompt', dp);
  };

  // ── 文本域组件 ──
  const TextArea = ({ field, label, placeholder, rows = 6, hint, maxLength }: {
    field: keyof Role; label: string; placeholder?: string; rows?: number; hint?: string; maxLength?: number;
  }) => (
    <div className="editor-field">
      <label>{label}</label>
      <textarea
        value={(form[field] as string) || ''}
        onChange={(e) => handleChange(field, e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
      />
      {hint && <div className="hint">{hint}</div>}
      <div className="hint">长度: {(form[field] as string || '').length} 字符</div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="editor-modal" onClick={(e) => e.stopPropagation()}>
        {/* ── 标题栏 ── */}
        <div className="editor-modal-header">
          <h2>{role ? `编辑角色: ${role.name}` : '创建新角色'}</h2>
          <button className="btn-icon modal-close-btn" onClick={onCancel} title="关闭">&times;</button>
        </div>

        {/* ── 标签页导航 ── */}
        <div className="editor-tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`editor-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── 内容区域 ── */}
        <form className="editor-modal-body" onSubmit={handleSubmit}>
          {/* ====== 角色信息 Tab ====== */}
          {activeTab === 'info' && (
            <div className="editor-tab-content">
              <div className="editor-info-layout">
                {/* 左侧：头像 */}
                <div className="editor-avatar-section">
                  <div className="editor-avatar-preview">
                    {form.avatar ? (
                      <img src={form.avatar} alt="头像" className="editor-avatar-img" onError={handleAvatarError} />
                    ) : (
                      <div className="editor-avatar-placeholder">?</div>
                    )}
                    <div className="editor-avatar-placeholder avatar-fallback" style={{ display: 'none' }}>?</div>
                  </div>
                  <div className="editor-avatar-buttons">
                    <button type="button" className="btn-secondary btn-small" onClick={handleUploadAvatar}>上传图片</button>
                    <button type="button" className="btn-secondary btn-small" onClick={() => handleChange('avatar', '')}>清除</button>
                  </div>
                  <div className="avatar-color-presets">
                    <span className="avatar-presets-label">快速头像：</span>
                    <div className="avatar-color-grid">
                      {avatarColors.map((color, idx) => (
                        <div key={idx} className="avatar-color-dot" style={{ backgroundColor: color }} onClick={() => handleGenerateColorAvatar(color)} />
                      ))}
                    </div>
                  </div>
                  <details className="avatar-url-section">
                    <summary>使用图片 URL</summary>
                    <input
                      type="text"
                      value={form.avatar?.startsWith('data:') ? '' : form.avatar || ''}
                      onChange={(e) => handleChange('avatar', e.target.value)}
                      placeholder="https://..."
                    />
                  </details>
                </div>

                {/* 右侧：基本信息 */}
                <div className="editor-fields-section">
                  <div className="editor-field">
                    <label>角色名称 *</label>
                    <input type="text" value={form.name || ''} onChange={(e) => handleChange('name', e.target.value)} required placeholder="角色的正式名称" />
                  </div>
                  <div className="editor-field">
                    <label>昵称</label>
                    <input type="text" value={form.nickname || ''} onChange={(e) => handleChange('nickname', e.target.value)} placeholder="显示用昵称（可选）" />
                    <div className="hint">在群聊和列表中可以使用昵称代替正式名称</div>
                  </div>
                  <div className="editor-field">
                    <label>标签</label>
                    <div className="tags-editor">
                      <div className="tags-list">
                        {(form.tags || []).map(tag => (
                          <span key={tag} className="tag-item">
                            {tag} <button type="button" onClick={() => handleRemoveTag(tag)}>&times;</button>
                          </span>
                        ))}
                      </div>
                      <div className="tag-input-row">
                        <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }}} placeholder="输入标签后按 Enter" />
                        <button type="button" className="btn-secondary btn-small" onClick={handleAddTag}>添加</button>
                      </div>
                    </div>
                  </div>
                  <div className="editor-field-row">
                    <div className="editor-field">
                      <label>创作者</label>
                      <input type="text" value={form.creator || ''} onChange={(e) => handleChange('creator', e.target.value)} placeholder="角色创作者" />
                    </div>
                    <div className="editor-field">
                      <label>角色版本</label>
                      <input type="text" value={form.character_version || ''} onChange={(e) => handleChange('character_version', e.target.value)} placeholder="例如: 1.0" />
                    </div>
                  </div>
                  <div className="editor-field">
                    <label>群聊活跃度 ({form.talkativeness ?? 50})</label>
                    <input type="range" min="0" max="100" step="1" value={form.talkativeness ?? 50}
                      onChange={(e) => handleChange('talkativeness', parseInt(e.target.value))} />
                    <div className="hint">值越高在群聊中越活跃，0 = 沉默</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ====== 描述 Tab ====== */}
          {activeTab === 'description' && (
            <div className="editor-tab-content">
              <TextArea
                field="description"
                label="角色描述"
                placeholder="详细描述角色的外观、性格特征、背景故事、行为习惯等。&#10;&#10;这部分内容会被注入到系统提示词中，帮助AI理解角色。&#10;支持使用 {{char}} 和 {{user}} 宏。"
                rows={14}
                hint="角色的完整描述，会出现在 system prompt 中"
              />
            </div>
          )}

          {/* ====== 人设 Tab ====== */}
          {activeTab === 'personality' && (
            <div className="editor-tab-content">
              <TextArea
                field="personality"
                label="性格概述"
                placeholder="用简短的语句概括角色的性格特征。&#10;例如：开朗、善良、偶尔毒舌、喜欢甜食"
                rows={4}
                hint="简短的性格关键词和特征描述"
              />
              <TextArea
                field="prompt"
                label="系统提示词"
                placeholder="设定角色的行为准则、知识范围、回复风格等。&#10;这是角色的核心指令。"
                rows={10}
                hint="角色的核心行为指令（全局默认）"
              />
            </div>
          )}

          {/* ====== 场景 Tab ====== */}
          {activeTab === 'scenario' && (
            <div className="editor-tab-content">
              <TextArea
                field="scenario"
                label="对话场景"
                placeholder="描述对话发生的时间、地点、情境背景。&#10;例如：现代都市的一家安静咖啡馆，午后阳光透过落地窗"
                rows={8}
                hint="为AI设定对话的情境和环境"
              />
            </div>
          )}

          {/* ====== 问候语 Tab ====== */}
          {activeTab === 'greetings' && (
            <div className="editor-tab-content">
              <TextArea
                field="first_mes"
                label="首条问候语"
                placeholder="新对话开始时角色发送的第一条消息。&#10;通常用于设定初始场景和角色语气。"
                rows={6}
                hint="新聊天时自动发送的第一条消息，支持 Markdown"
              />
              <div className="editor-sub-section">
                <div className="editor-sub-header">
                  <h4>备选问候语 ({(form.alternate_greetings || []).length})</h4>
                  <button type="button" className="btn-secondary btn-small" onClick={() => handleAddGreeting('alternate_greetings')}>+ 添加</button>
                </div>
                {(form.alternate_greetings || []).map((g, idx) => (
                  <div key={idx} className="greeting-item">
                    <div className="greeting-item-num">#{idx + 1}</div>
                    <textarea value={g} onChange={(e) => handleGreetingChange('alternate_greetings', idx, e.target.value)}
                      placeholder={`备选问候语 #${idx + 1}`} rows={3} />
                    <button type="button" className="btn-danger btn-small" onClick={() => handleRemoveGreeting('alternate_greetings', idx)}>&times;</button>
                  </div>
                ))}
              </div>
              <div className="editor-sub-section">
                <div className="editor-sub-header">
                  <h4>群聊专用问候语 ({(form.group_only_greetings || []).length})</h4>
                  <button type="button" className="btn-secondary btn-small" onClick={() => handleAddGreeting('group_only_greetings')}>+ 添加</button>
                </div>
                {(form.group_only_greetings || []).map((g, idx) => (
                  <div key={idx} className="greeting-item">
                    <div className="greeting-item-num">G#{idx + 1}</div>
                    <textarea value={g} onChange={(e) => handleGreetingChange('group_only_greetings', idx, e.target.value)}
                      placeholder={`群聊问候语 #${idx + 1}`} rows={3} />
                    <button type="button" className="btn-danger btn-small" onClick={() => handleRemoveGreeting('group_only_greetings', idx)}>&times;</button>
                  </div>
                ))}
                <div className="hint">群聊专用问候语仅在群聊中被使用</div>
              </div>
            </div>
          )}

          {/* ====== 示例对话 Tab ====== */}
          {activeTab === 'examples' && (
            <div className="editor-tab-content">
              <TextArea
                field="mes_example"
                label="示例对话"
                placeholder={`<START>\n{{user}}: 你好呀\n{{char}}: 你好！很高兴见到你。\n{{user}}: 今天天气真好\n{{char}}: 是啊，适合出去走走呢。\n<START>\n{{user}}: 你喜欢吃什么？\n{{char}}: 我最喜欢甜食了，尤其是草莓蛋糕！`}
                rows={12}
                hint="用 <START> 分隔不同的对话块，使用 {{user}} 和 {{char}} 宏"
              />
            </div>
          )}

          {/* ====== 创作者备注 Tab ====== */}
          {activeTab === 'notes' && (
            <div className="editor-tab-content">
              <TextArea
                field="creator_notes"
                label="创作者备注"
                placeholder="给其他使用者看的备注说明。&#10;例如：这个角色适合什么类型的对话、有哪些特殊设定、推荐的使用方式等。&#10;&#10;此内容不会注入到 prompt 中。"
                rows={10}
                hint="仅用于展示给用户，不会出现在 AI 提示词中"
              />
            </div>
          )}

          {/* ====== 高级设定 Tab ====== */}
          {activeTab === 'advanced' && (
            <div className="editor-tab-content">
              <div className="editor-sub-section">
                <h4>角色专属系统提示词</h4>
                <TextArea
                  field="system_prompt"
                  label=""
                  placeholder="覆盖全局系统提示词。留空则使用角色信息页的系统提示词。&#10;支持 {{original}} 占位符来引用全局提示词。"
                  rows={4}
                  hint="留空则使用全局系统提示词"
                />
              </div>
              <div className="editor-sub-section">
                <h4>后历史指令 (Jailbreak)</h4>
                <TextArea
                  field="post_history_instructions"
                  label=""
                  placeholder="在消息历史之后注入的指令。&#10;支持 {{original}} 占位符来引用全局指令。"
                  rows={4}
                  hint="在所有消息之后、最终指令之前注入"
                />
              </div>
              <div className="editor-sub-section">
                <h4>AI 帮答提示词</h4>
                <TextArea
                  field="impersonation_prompt"
                  label=""
                  placeholder="角色专属的 AI 帮答指令。留空则使用全局设定。&#10;例如：请以{{user}}的身份回复下一条消息。"
                  rows={3}
                  hint="覆盖全局 AI 帮答提示词"
                />
              </div>
              <div className="editor-sub-section">
                <h4>深度提示词 (Depth Prompt)</h4>
                <p className="hint" style={{ marginBottom: 12 }}>在消息历史中的指定深度位置注入自定义提示词</p>
                <div className="editor-field">
                  <label>注入内容</label>
                  <textarea
                    value={form.depth_prompt?.prompt || ''}
                    onChange={(e) => handleDepthPromptChange('prompt', e.target.value)}
                    placeholder="要注入的提示词内容"
                    rows={3}
                  />
                </div>
                <div className="editor-field-row">
                  <div className="editor-field">
                    <label>注入深度 ({form.depth_prompt?.depth ?? 4})</label>
                    <input type="range" min="0" max="999" step="1" value={form.depth_prompt?.depth ?? 4}
                      onChange={(e) => handleDepthPromptChange('depth', parseInt(e.target.value))} />
                    <div className="hint">从倒数第几条消息之前插入（0=不使用）</div>
                  </div>
                  <div className="editor-field">
                    <label>角色</label>
                    <select value={form.depth_prompt?.role ?? 0}
                      onChange={(e) => handleDepthPromptChange('role', parseInt(e.target.value))}>
                      <option value={0}>System</option>
                      <option value={1}>User</option>
                      <option value={2}>Assistant</option>
                    </select>
                    <div className="hint">注入消息的角色类型</div>
                  </div>
                </div>
              </div>
              <div className="editor-sub-section">
                <h4>生成参数</h4>
                <div className="params-grid">
                  <div className="editor-field">
                    <label>温度 ({form.temperature})</label>
                    <input type="range" min="0" max="2" step="0.05" value={form.temperature}
                      onChange={(e) => handleChange('temperature', parseFloat(e.target.value))} />
                    <div className="hint">越高越随机/有创意，越低越确定/保守</div>
                  </div>
                  <div className="editor-field">
                    <label>最大令牌数</label>
                    <input type="number" min="100" max="32000" step="100" value={form.maxTokens}
                      onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))} />
                  </div>
                  <div className="editor-field">
                    <label>Top-P ({form.topP})</label>
                    <input type="range" min="0" max="1" step="0.05" value={form.topP}
                      onChange={(e) => handleChange('topP', parseFloat(e.target.value))} />
                  </div>
                  <div className="editor-field">
                    <label>Top-K ({form.topK ?? 0})</label>
                    <input type="number" min="0" max="200" step="1" value={form.topK ?? 0}
                      onChange={(e) => handleChange('topK', parseInt(e.target.value))} />
                    <div className="hint">0 = 不限制</div>
                  </div>
                  <div className="editor-field">
                    <label>Min-P ({form.minP ?? 0})</label>
                    <input type="range" min="0" max="1" step="0.05" value={form.minP ?? 0}
                      onChange={(e) => handleChange('minP', parseFloat(e.target.value))} />
                    <div className="hint">最小概率阈值，过滤低概率词</div>
                  </div>
                  <div className="editor-field">
                    <label>频率惩罚 ({form.frequencyPenalty})</label>
                    <input type="range" min="-2" max="2" step="0.1" value={form.frequencyPenalty}
                      onChange={(e) => handleChange('frequencyPenalty', parseFloat(e.target.value))} />
                  </div>
                  <div className="editor-field">
                    <label>存在惩罚 ({form.presencePenalty})</label>
                    <input type="range" min="-2" max="2" step="0.1" value={form.presencePenalty}
                      onChange={(e) => handleChange('presencePenalty', parseFloat(e.target.value))} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── 底部操作栏 ── */}
          <div className="editor-modal-footer">
            <button type="button" className="btn-secondary" onClick={onCancel}>取消</button>
            <button type="submit" className="btn-primary">{role ? '保存更改' : '创建角色'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleEditor;

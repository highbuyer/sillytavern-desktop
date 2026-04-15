import React, { useState, useEffect } from 'react';
import { Role } from '../store/useStore';

interface RoleEditorProps {
  role?: Role;
  onSave: (updates: Partial<Role>) => void;
  onCancel: () => void;
}

const RoleEditor: React.FC<RoleEditorProps> = ({ role, onSave, onCancel }) => {
  const [form, setForm] = useState<Partial<Role>>({
    name: '',
    description: '',
    avatar: '',
    prompt: '',
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
  });

  useEffect(() => {
    if (role) {
      setForm({
        name: role.name,
        description: role.description,
        avatar: role.avatar,
        prompt: role.prompt,
        temperature: role.temperature,
        maxTokens: role.maxTokens,
        topP: role.topP,
        frequencyPenalty: role.frequencyPenalty,
        presencePenalty: role.presencePenalty,
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

  const avatarOptions = [
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#5B3FD9"/></svg>',
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect x="4" y="8" width="32" height="32" rx="6" fill="#00CED1"/></svg>',
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><polygon points="20,4 36,34 4,34" fill="#FF6B6B"/></svg>',
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="#4CAF50"/></svg>',
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect x="4" y="8" width="32" height="32" rx="6" fill="#FF9800"/></svg>',
  ];

  return (
    <form className="role-editor-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3>基本信息</h3>
        <div className="form-group">
          <label>角色名称 *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            placeholder="例如：AI助手"
          />
        </div>

        <div className="form-group">
          <label>角色描述</label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="简短描述角色的特点"
          />
        </div>

        <div className="form-group">
          <label>角色头像</label>
          <div className="avatar-selector">
            {avatarOptions.map((avatar, idx) => (
              <div
                key={idx}
                className={`avatar-option ${form.avatar === avatar ? 'selected' : ''}`}
                onClick={() => handleChange('avatar', avatar)}
              >
                <img src={avatar} alt={`头像${idx + 1}`} />
              </div>
            ))}
          </div>
          <input
            type="text"
            value={form.avatar}
            onChange={(e) => handleChange('avatar', e.target.value)}
            placeholder="或输入自定义头像URL"
          />
        </div>
      </div>

      <div className="form-section">
        <h3>提示词设定</h3>
        <div className="form-group">
          <label>系统提示词 *</label>
          <textarea
            value={form.prompt}
            onChange={(e) => handleChange('prompt', e.target.value)}
            required
            placeholder="设定角色的行为、性格、知识范围等"
            rows={6}
          />
          <div className="hint">提示词长度: {form.prompt?.length || 0} 字符</div>
        </div>
      </div>

      <div className="form-section">
        <h3>生成参数</h3>
        <div className="params-grid">
          <div className="form-group">
            <label>
              温度 ({form.temperature})
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={form.temperature}
                onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
              />
            </label>
            <div className="hint">值越高越随机，值越低越确定</div>
          </div>

          <div className="form-group">
            <label>最大令牌数</label>
            <input
              type="number"
              min="100"
              max="8000"
              step="100"
              value={form.maxTokens}
              onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>
              Top-P ({form.topP})
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={form.topP}
                onChange={(e) => handleChange('topP', parseFloat(e.target.value))}
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              频率惩罚 ({form.frequencyPenalty})
              <input
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={form.frequencyPenalty}
                onChange={(e) => handleChange('frequencyPenalty', parseFloat(e.target.value))}
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              存在惩罚 ({form.presencePenalty})
              <input
                type="range"
                min="-2"
                max="2"
                step="0.1"
                value={form.presencePenalty}
                onChange={(e) => handleChange('presencePenalty', parseFloat(e.target.value))}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn-secondary" onClick={onCancel}>
          取消
        </button>
        <button type="submit" className="btn-primary">
          {role ? '保存更改' : '创建角色'}
        </button>
      </div>
    </form>
  );
};

export default RoleEditor;

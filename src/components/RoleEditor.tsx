import React, { useState, useEffect, useRef } from 'react';
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
        name: role.name || '',
        description: role.description || '',
        avatar: role.avatar || '',
        prompt: role.prompt || '',
        temperature: role.temperature ?? 0.7,
        maxTokens: role.maxTokens ?? 2000,
        topP: role.topP ?? 0.9,
        frequencyPenalty: role.frequencyPenalty ?? 0.0,
        presencePenalty: role.presencePenalty ?? 0.0,
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

  const handleUploadAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      // 缩放图片减少存储
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 512;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          handleChange('avatar', canvas.toDataURL('image/png'));
        }
      };
      img.src = dataUri;
    };
    reader.readAsDataURL(file);
    // 清空 input 以便重复选择同一文件
    e.target.value = '';
  };

  const handleGenerateColorAvatar = (color: string) => {
    const name = form.name || '?';
    const initial = name.charAt(0).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="64" fill="${color}"/><text x="64" y="75" text-anchor="middle" font-size="48" fill="white" font-family="sans-serif">${initial}</text></svg>`;
    handleChange('avatar', `data:image/svg+xml;utf8,${svg}`);
  };

  const handleClearAvatar = () => {
    handleChange('avatar', '');
  };

  const handleAvatarError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
    const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
    if (fallback) fallback.style.display = 'flex';
  };

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
          <div className="avatar-editor">
            {/* 当前头像预览 */}
            <div className="avatar-current-preview">
              {form.avatar ? (
                <img
                  src={form.avatar}
                  alt="当前头像"
                  className="avatar-preview-img"
                  onError={handleAvatarError}
                />
              ) : (
                <div className="avatar-preview-placeholder">?</div>
              )}
              {/* 加载失败时显示 fallback */}
              <div className="avatar-preview-placeholder avatar-fallback" style={{ display: 'none' }}>?</div>
            </div>

            {/* 操作按钮 */}
            <div className="avatar-actions">
              <button type="button" className="btn-secondary btn-small" onClick={handleUploadAvatar}>
                上传图片
              </button>
              <button type="button" className="btn-secondary btn-small" onClick={handleClearAvatar}>
                清除头像
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            {/* 颜色头像预设 */}
            <div className="avatar-color-presets">
              <span className="avatar-presets-label">或选择颜色头像：</span>
              <div className="avatar-color-grid">
                {avatarColors.map((color, idx) => (
                  <div
                    key={idx}
                    className="avatar-color-dot"
                    style={{ backgroundColor: color }}
                    onClick={() => handleGenerateColorAvatar(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* 自定义 URL（折叠） */}
            <details className="avatar-url-section">
              <summary>使用图片URL</summary>
              <input
                type="text"
                value={form.avatar?.startsWith('data:') ? '' : form.avatar || ''}
                onChange={(e) => handleChange('avatar', e.target.value)}
                placeholder="输入图片URL（https://...）"
              />
            </details>
          </div>
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

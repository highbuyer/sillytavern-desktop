import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreState, updateSettings, resetSettings } from '../store/useStore';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings } = useStoreState();
  const [form, setForm] = useState(settings);
  const [activeTab, setActiveTab] = useState<'api' | 'generation' | 'ui' | 'storage'>('api');

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSave = () => {
    updateSettings(form);
    alert('设置已保存');
  };

  const handleReset = () => {
    if (window.confirm('确定要重置所有设置为默认值吗？')) {
      resetSettings();
      setForm(settings);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          updateSettings(data);
          setForm(data);
          alert('设置已导入');
        } catch (error) {
          alert('导入失败：文件格式不正确');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExport = () => {
    const data = JSON.stringify(settings, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sillytavern-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateForm = (section: keyof typeof form, field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>设置</h1>
        <div className="page-actions">
          <button className="btn-primary" onClick={handleSave}>
            💾 保存设置
          </button>
          <button className="btn-secondary" onClick={() => navigate('/')}>
            ← 返回
          </button>
        </div>
      </div>

      <div className="settings-tabs">
        <button 
          className={`tab ${activeTab === 'api' ? 'active' : ''}`}
          onClick={() => setActiveTab('api')}
        >
          🌐 API配置
        </button>
        <button 
          className={`tab ${activeTab === 'generation' ? 'active' : ''}`}
          onClick={() => setActiveTab('generation')}
        >
          ⚙️ 生成参数
        </button>
        <button 
          className={`tab ${activeTab === 'ui' ? 'active' : ''}`}
          onClick={() => setActiveTab('ui')}
        >
          🎨 界面设置
        </button>
        <button 
          className={`tab ${activeTab === 'storage' ? 'active' : ''}`}
          onClick={() => setActiveTab('storage')}
        >
          💾 存储设置
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'api' && (
          <div className="settings-section">
            <h3>OpenAI</h3>
            <div className="form-group">
              <label>API密钥</label>
              <input
                type="password"
                value={form.api.openaiKey}
                onChange={(e) => updateForm('api', 'openaiKey', e.target.value)}
                placeholder="sk-..."
              />
            </div>
            <div className="form-group">
              <label>API地址</label>
              <input
                type="text"
                value={form.api.openaiUrl}
                onChange={(e) => updateForm('api', 'openaiUrl', e.target.value)}
                placeholder="https://api.openai.com/v1"
              />
            </div>

            <h3>Anthropic (Claude)</h3>
            <div className="form-group">
              <label>API密钥</label>
              <input
                type="password"
                value={form.api.claudeKey}
                onChange={(e) => updateForm('api', 'claudeKey', e.target.value)}
                placeholder="sk-ant-..."
              />
            </div>
            <div className="form-group">
              <label>API地址</label>
              <input
                type="text"
                value={form.api.claudeUrl}
                onChange={(e) => updateForm('api', 'claudeUrl', e.target.value)}
                placeholder="https://api.anthropic.com/v1"
              />
            </div>

            <h3>Ollama</h3>
            <div className="form-group">
              <label>API地址</label>
              <input
                type="text"
                value={form.api.ollamaUrl}
                onChange={(e) => updateForm('api', 'ollamaUrl', e.target.value)}
                placeholder="http://localhost:11434"
              />
            </div>

            <h3>OpenRouter</h3>
            <div className="form-group">
              <label>API密钥</label>
              <input
                type="password"
                value={form.api.openrouterKey}
                onChange={(e) => updateForm('api', 'openrouterKey', e.target.value)}
                placeholder="sk-or-..."
              />
            </div>
            <div className="form-group">
              <label>API地址</label>
              <input
                type="text"
                value={form.api.openrouterUrl}
                onChange={(e) => updateForm('api', 'openrouterUrl', e.target.value)}
                placeholder="https://openrouter.ai/api/v1"
              />
            </div>
          </div>
        )}

        {activeTab === 'generation' && (
          <div className="settings-section">
            <div className="form-group">
              <label>
                温度: {form.generation.temperature}
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={form.generation.temperature}
                  onChange={(e) => updateForm('generation', 'temperature', parseFloat(e.target.value))}
                />
              </label>
              <div className="hint">控制随机性：较低的值更确定，较高的值更有创意</div>
            </div>

            <div className="form-group">
              <label>最大令牌数</label>
              <input
                type="number"
                min="100"
                max="8000"
                step="100"
                value={form.generation.maxTokens}
                onChange={(e) => updateForm('generation', 'maxTokens', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>
                Top-P: {form.generation.topP}
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={form.generation.topP}
                  onChange={(e) => updateForm('generation', 'topP', parseFloat(e.target.value))}
                />
              </label>
            </div>

            <div className="form-group">
              <label>
                频率惩罚: {form.generation.frequencyPenalty}
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={form.generation.frequencyPenalty}
                  onChange={(e) => updateForm('generation', 'frequencyPenalty', parseFloat(e.target.value))}
                />
              </label>
            </div>

            <div className="form-group">
              <label>
                存在惩罚: {form.generation.presencePenalty}
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={form.generation.presencePenalty}
                  onChange={(e) => updateForm('generation', 'presencePenalty', parseFloat(e.target.value))}
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'ui' && (
          <div className="settings-section">
            <div className="form-group">
              <label>主题</label>
              <select
                value={form.ui.theme}
                onChange={(e) => updateForm('ui', 'theme', e.target.value)}
              >
                <option value="dark">深色</option>
                <option value="light">浅色</option>
                <option value="auto">跟随系统</option>
              </select>
            </div>

            <div className="form-group">
              <label>语言</label>
              <select
                value={form.ui.language}
                onChange={(e) => updateForm('ui', 'language', e.target.value)}
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
                <option value="ja-JP">日本語</option>
                <option value="ko-KR">한국어</option>
              </select>
            </div>

            <div className="form-group">
              <label>字体大小</label>
              <input
                type="number"
                min="12"
                max="24"
                value={form.ui.fontSize}
                onChange={(e) => updateForm('ui', 'fontSize', parseInt(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={form.ui.enableMarkdown}
                  onChange={(e) => updateForm('ui', 'enableMarkdown', e.target.checked)}
                />
                <span className="checkbox-label">启用Markdown渲染</span>
              </label>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={form.ui.enableTTS}
                  onChange={(e) => updateForm('ui', 'enableTTS', e.target.checked)}
                />
                <span className="checkbox-label">启用文本转语音(TTS)</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'storage' && (
          <div className="settings-section">
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={form.storage.autoSave}
                  onChange={(e) => updateForm('storage', 'autoSave', e.target.checked)}
                />
                <span className="checkbox-label">自动保存</span>
              </label>
              <div className="hint">自动保存聊天记录和设置</div>
            </div>

            <div className="form-group">
              <label>备份间隔（秒）</label>
              <input
                type="number"
                min="60"
                max="3600"
                value={form.storage.backupInterval}
                onChange={(e) => updateForm('storage', 'backupInterval', parseInt(e.target.value))}
              />
              <div className="hint">自动备份聊天记录的时间间隔</div>
            </div>

            <div className="form-group">
              <h3>数据管理</h3>
              <div className="button-group">
                <button className="btn-secondary" onClick={handleExport}>
                  💾 导出所有数据
                </button>
                <button className="btn-secondary" onClick={handleImport}>
                  📥 导入数据
                </button>
                <button className="btn-danger" onClick={handleReset}>
                  🔄 重置所有设置
                </button>
              </div>
            </div>

            <div className="form-group">
              <h3>存储状态</h3>
              <div className="storage-info">
                <p>聊天记录: {JSON.stringify(useStore.getState().chats).length} 字节</p>
                <p>角色数据: {JSON.stringify(useStore.getState().roles).length} 字节</p>
                <p>设置数据: {JSON.stringify(useStore.getState().settings).length} 字节</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;

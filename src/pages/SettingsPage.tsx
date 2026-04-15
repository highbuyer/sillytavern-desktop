import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreState, updateSettings, resetSettings, AIProvider } from '../store/useStore';
import { MODEL_LIST, getModelsByProvider, testConnection, AIServiceConfig } from '../services/ai';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, chats, roles } = useStoreState();
  const [form, setForm] = useState(settings);
  const [activeTab, setActiveTab] = useState<'api' | 'generation' | 'ui' | 'storage'>('api');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

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

  const handleProviderChange = (provider: AIProvider) => {
    const models = getModelsByProvider(provider);
    const defaultModel = models[0]?.id || '';
    setForm(prev => ({
      ...prev,
      api: {
        ...prev.api,
        activeProvider: provider,
        activeModel: defaultModel,
      },
    }));
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    const config: AIServiceConfig = {
      provider: form.api.activeProvider,
      model: form.api.activeModel,
      apiKey: form.api[`${form.api.activeProvider}Key` as keyof typeof form.api] as string,
      apiUrl: form.api[`${form.api.activeProvider}Url` as keyof typeof form.api] as string,
      temperature: form.generation.temperature,
      maxTokens: 100,
    };

    try {
      const result = await testConnection(config);
      setTestResult(result);
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setTesting(false);
    }
  };

  const providerConfig: { key: AIProvider; label: string; keyField: string; urlField: string; modelField: string; urlPlaceholder: string; keyPlaceholder: string }[] = [
    { key: 'openai', label: 'OpenAI', keyField: 'openaiKey', urlField: 'openaiUrl', modelField: 'openaiModel', urlPlaceholder: 'https://api.openai.com/v1', keyPlaceholder: 'sk-...' },
    { key: 'claude', label: 'Anthropic (Claude)', keyField: 'claudeKey', urlField: 'claudeUrl', modelField: 'claudeModel', urlPlaceholder: 'https://api.anthropic.com/v1', keyPlaceholder: 'sk-ant-...' },
    { key: 'ollama', label: 'Ollama', keyField: '', urlField: 'ollamaUrl', modelField: 'ollamaModel', urlPlaceholder: 'http://localhost:11434', keyPlaceholder: '' },
    { key: 'openrouter', label: 'OpenRouter', keyField: 'openrouterKey', urlField: 'openrouterUrl', modelField: 'openrouterModel', urlPlaceholder: 'https://openrouter.ai/api/v1', keyPlaceholder: 'sk-or-...' },
  ];

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>设置</h1>
        <div className="page-actions">
          <button className="btn-primary" onClick={handleSave}>
            保存设置
          </button>
          <button className="btn-secondary" onClick={() => navigate('/')}>
            返回
          </button>
        </div>
      </div>

      <div className="settings-tabs">
        <button
          className={`tab ${activeTab === 'api' ? 'active' : ''}`}
          onClick={() => setActiveTab('api')}
        >
          API配置
        </button>
        <button
          className={`tab ${activeTab === 'generation' ? 'active' : ''}`}
          onClick={() => setActiveTab('generation')}
        >
          生成参数
        </button>
        <button
          className={`tab ${activeTab === 'ui' ? 'active' : ''}`}
          onClick={() => setActiveTab('ui')}
        >
          界面设置
        </button>
        <button
          className={`tab ${activeTab === 'storage' ? 'active' : ''}`}
          onClick={() => setActiveTab('storage')}
        >
          存储设置
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'api' && (
          <div className="settings-section">
            {/* 后端选择 */}
            <div className="form-group">
              <label>当前使用的后端</label>
              <select
                value={form.api.activeProvider}
                onChange={(e) => handleProviderChange(e.target.value as AIProvider)}
              >
                {providerConfig.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
              <div className="hint">选择默认使用的 AI 后端，可在聊天中切换</div>
            </div>

            {/* 模型选择 */}
            <div className="form-group">
              <label>当前模型</label>
              <div className="model-selector">
                <select
                  value={form.api.activeModel}
                  onChange={(e) => updateForm('api', 'activeModel', e.target.value)}
                >
                  {getModelsByProvider(form.api.activeProvider).map(m => (
                    <option key={m.id} value={m.id}>{m.name} (ctx: {m.maxContext?.toLocaleString() || '?'})</option>
                  ))}
                  <option value="__custom__">自定义模型...</option>
                </select>
                {form.api.activeModel === '__custom__' && (
                  <input
                    type="text"
                    value=""
                    onChange={(e) => updateForm('api', 'activeModel', e.target.value)}
                    placeholder="输入模型ID..."
                    style={{ marginTop: '8px' }}
                  />
                )}
              </div>
            </div>

            <div className="settings-divider" />

            {/* 各后端配置 */}
            {providerConfig.map(p => (
              <div key={p.key} className={`provider-config ${form.api.activeProvider === p.key ? 'active' : ''}`}>
                <h3 className="provider-header">
                  {p.label}
                  {form.api.activeProvider === p.key && (
                    <span className="active-badge">当前使用</span>
                  )}
                </h3>
                {p.keyField && (
                  <div className="form-group">
                    <label>API密钥</label>
                    <input
                      type="password"
                      value={form.api[p.keyField as keyof typeof form.api] as string}
                      onChange={(e) => updateForm('api', p.keyField, e.target.value)}
                      placeholder={p.keyPlaceholder}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>API地址</label>
                  <input
                    type="text"
                    value={form.api[p.urlField as keyof typeof form.api] as string}
                    onChange={(e) => updateForm('api', p.urlField, e.target.value)}
                    placeholder={p.urlPlaceholder}
                  />
                </div>
                <div className="form-group">
                  <label>默认模型</label>
                  <input
                    type="text"
                    value={form.api[p.modelField as keyof typeof form.api] as string}
                    onChange={(e) => updateForm('api', p.modelField, e.target.value)}
                    placeholder="模型ID"
                  />
                </div>
              </div>
            ))}

            {/* 连接测试 */}
            <div className="form-group">
              <h3>连接测试</h3>
              <div className="test-connection-area">
                <button
                  className="btn-secondary"
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  {testing ? '测试中...' : '测试当前后端连接'}
                </button>
                {testResult && (
                  <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
                    {testResult.message}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'generation' && (
          <div className="settings-section">
            <h3>默认生成参数</h3>
            <div className="hint">这些参数可在角色设置中单独覆盖</div>

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
                max="32000"
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
                  导出所有数据
                </button>
                <button className="btn-secondary" onClick={handleImport}>
                  导入数据
                </button>
                <button className="btn-danger" onClick={handleReset}>
                  重置所有设置
                </button>
              </div>
            </div>

            <div className="form-group">
              <h3>存储状态</h3>
              <div className="storage-info">
                <p>聊天记录: {JSON.stringify(chats).length} 字节</p>
                <p>角色数据: {JSON.stringify(roles).length} 字节</p>
                <p>设置数据: {JSON.stringify(settings).length} 字节</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;

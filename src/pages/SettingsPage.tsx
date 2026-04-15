import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStoreState, updateSettings, resetSettings, AIProvider } from '../store/useStore';
import { MODEL_LIST, getModelsByProvider, testConnection, AIServiceConfig, fetchModels, AIModel } from '../services/ai';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { settings, chats, roles } = useStoreState();
  const [form, setForm] = useState(settings);
  const [activeTab, setActiveTab] = useState<'api' | 'generation' | 'ui' | 'storage'>('api');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<AIModel[]>(MODEL_LIST);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);

  useEffect(() => {
    setForm(settings);
    // 页面加载时同步已有的代理设置到主进程
    if (settings.api.proxyUrl) {
      try {
        const { ipcRenderer } = require('electron');
        if (ipcRenderer && ipcRenderer.invoke) {
          ipcRenderer.invoke('set-proxy', settings.api.proxyUrl);
        }
      } catch (e) { /* ignore */ }
    }
    
    // 页面加载时，如果有配置就尝试获取模型列表
    const provider = settings.api.activeProvider;
    const keyField = providerConfig.find(p => p.key === provider)?.keyField;
    const hasKey = keyField ? !!settings.api[keyField as keyof typeof settings.api] : provider === 'ollama';
    
    if (hasKey && provider !== 'claude') {
      // 延迟执行，确保form状态已更新
      setTimeout(() => {
        console.log('页面加载，尝试获取模型列表');
        handleFetchModels();
      }, 500);
    }
  }, [settings]);

  // 当API配置变化时，尝试获取模型列表
  useEffect(() => {
    const provider = form.api.activeProvider;
    const keyField = providerConfig.find(p => p.key === provider)?.keyField;
    const hasKey = keyField ? !!form.api[keyField as keyof typeof form.api] : provider === 'ollama';
    
    if (hasKey && form.api.activeProvider !== 'claude') {
      // 对于非Claude的提供商，自动获取模型列表
      handleFetchModels();
    }
  }, [form.api.activeProvider, form.api.openaiKey, form.api.claudeKey, form.api.openrouterKey]);

  // 同步代理设置到 Electron 主进程
  const syncProxyToElectron = (proxyUrl: string) => {
    try {
      const { ipcRenderer } = require('electron');
      if (ipcRenderer && ipcRenderer.invoke) {
        ipcRenderer.invoke('set-proxy', proxyUrl || '');
        console.log('已同步代理设置到主进程:', proxyUrl || '直连');
      }
    } catch (e) {
      // 非 Electron 环境忽略
      console.log('非 Electron 环境，跳过代理同步');
    }
  };

  const handleSave = () => {
    updateSettings(form);
    // 保存时同步代理
    syncProxyToElectron(form.api.proxyUrl);
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
      proxyUrl: form.api.proxyUrl,
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

  const handleFetchModels = async () => {
    console.log('=== 开始获取模型列表 ===');
    console.log('当前form状态:', form.api);
    
    const provider = form.api.activeProvider;
    const keyField = providerConfig.find(p => p.key === provider)?.keyField;
    const urlField = providerConfig.find(p => p.key === provider)?.urlField;
    
    console.log('当前后端:', provider);
    console.log('密钥字段:', keyField);
    console.log('URL字段:', urlField);
    
    // 检查是否需要API密钥
    if (keyField) {
      const apiKey = form.api[keyField as keyof typeof form.api] as string;
      console.log('API密钥值:', apiKey ? `${apiKey.substring(0, 10)}...` : '空');
      
      if (!apiKey || !apiKey.trim()) {
        setModelFetchError(`请先填写${provider}的API密钥`);
        return;
      }
    }

    const config: AIServiceConfig = {
      provider,
      model: form.api.activeModel,
      apiKey: keyField ? form.api[keyField as keyof typeof form.api] as string : undefined,
      apiUrl: form.api[urlField as keyof typeof form.api] as string,
      proxyUrl: form.api.proxyUrl,
    };

    console.log('当前form状态 - openaiKey:', form.api.openaiKey ? '已填写' : '未填写');
    console.log('当前form状态 - claudeKey:', form.api.claudeKey ? '已填写' : '未填写');
    console.log('当前form状态 - openrouterKey:', form.api.openrouterKey ? '已填写' : '未填写');
    console.log('当前form状态 - activeProvider:', form.api.activeProvider);
    console.log('获取模型配置:', JSON.stringify(config, null, 2));
    setFetchingModels(true);
    setModelFetchError(null);

    try {
      const models = await fetchModels(config);
      console.log('获取到的模型:', models);
      if (models.length > 0) {
        setAvailableModels(models);
        // 如果当前模型不在列表中，自动选择第一个
        const currentModelExists = models.some(m => m.id === form.api.activeModel);
        if (!currentModelExists && models[0]) {
          updateForm('api', 'activeModel', models[0].id);
        }
        setModelFetchError(null);
      } else {
        setModelFetchError('未获取到可用模型。请检查API地址、密钥是否正确，以及网络连接是否正常。');
      }
    } catch (error: any) {
      console.error('获取模型失败详情:', error);
      setModelFetchError(`获取模型失败: ${error.message}`);
    } finally {
      setFetchingModels(false);
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
              <div className="model-selector-header">
                <label>当前模型</label>
                <button 
                  className="btn-secondary btn-small" 
                  onClick={handleFetchModels}
                  disabled={fetchingModels}
                >
                  {fetchingModels ? '获取中...' : '🔄 获取模型列表'}
                </button>
              </div>
              <div className="model-selector">
                <select
                  value={form.api.activeModel}
                  onChange={(e) => updateForm('api', 'activeModel', e.target.value)}
                >
                  {availableModels
                    .filter(m => m.provider === form.api.activeProvider)
                    .map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} (ctx: {m.maxContext?.toLocaleString() || '?'})
                      </option>
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
                {modelFetchError && (
                  <div className="error-message" style={{ marginTop: '8px', color: 'var(--danger)' }}>
                    {modelFetchError}
                  </div>
                )}
                <div className="hint">
                  点击"获取模型列表"从API获取可用模型，或从预定义列表中选择
                </div>
              </div>
            </div>

            {/* 网络代理配置 */}
            <div className="form-group">
              <label>网络代理 (可选)</label>
              <input
                type="text"
                value={form.api.proxyUrl || ''}
                onChange={(e) => updateForm('api', 'proxyUrl', e.target.value)}
                placeholder="http://127.0.0.1:10808"
              />
              <div className="hint">设置HTTP/HTTPS代理，用于访问API服务。留空则使用系统代理或无代理。</div>
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

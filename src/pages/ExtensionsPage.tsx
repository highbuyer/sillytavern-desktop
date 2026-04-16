import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useStoreState,
  setExtensionEnabled,
  updateExtensionSettings,
  ExtensionDefinition,
} from '../store/useStore';

/* ─── 内置扩展定义 ─── */
const BUILT_IN_EXTENSIONS: ExtensionDefinition[] = [
  {
    id: 'regex',
    name: '正则脚本',
    description: '使用正则表达式对 AI 回复进行自动替换和处理，支持多条脚本按优先级执行。',
    icon: '🔄',
    category: 'built-in',
    version: '1.0.0',
  },
  {
    id: 'memory',
    name: '记忆 / 世界信息',
    description: '上下文注入系统，根据关键词自动将世界设定、角色信息注入到 AI 的提示中。',
    icon: '🧠',
    category: 'built-in',
    version: '1.0.0',
  },
  {
    id: 'summarize',
    name: '对话摘要',
    description: '自动对长对话进行摘要压缩，在上下文超出窗口时保留关键信息。',
    icon: '📝',
    category: 'built-in',
    version: '1.0.0',
  },
  {
    id: 'tts',
    name: '文字转语音',
    description: '将 AI 回复朗读出来，支持浏览器内置 TTS、ElevenLabs 等语音引擎。',
    icon: '🔊',
    category: 'built-in',
    version: '1.0.0',
  },
  {
    id: 'caption',
    name: '图片描述',
    description: '识别聊天中的图片内容并生成文字描述，让 AI 能"看到"图片。',
    icon: '🖼️',
    category: 'built-in',
    version: '1.0.0',
  },
  {
    id: 'translate',
    name: '聊天翻译',
    description: '自动翻译聊天消息，支持多语言互译，便于跨语言对话。',
    icon: '🌐',
    category: 'built-in',
    version: '1.0.0',
  },
  {
    id: 'expressions',
    name: '角色表情',
    description: '根据对话内容自动切换角色立绘表情，增强沉浸感。',
    icon: '😀',
    category: 'built-in',
    version: '1.0.0',
  },
  {
    id: 'quick-reply',
    name: '快捷回复',
    description: '预设快捷回复按钮，一键发送常用指令或 STscript 脚本。',
    icon: '⚡',
    category: 'built-in',
    version: '1.0.0',
  },
  {
    id: 'stable-diffusion',
    name: '图片生成',
    description: '通过 Stable Diffusion、DALL-E 等 API 在对话中生成图片。',
    icon: '🎨',
    category: 'built-in',
    version: '1.0.0',
  },
  {
    id: 'token-counter',
    name: 'Token 计数器',
    description: '实时显示消息和上下文的 Token 数量，帮助管理 Token 预算。',
    icon: '🔢',
    category: 'built-in',
    version: '1.0.0',
  },
  {
    id: 'vectors',
    name: '向量检索 (RAG)',
    description: '将聊天历史向量化，通过语义搜索找到最相关的历史消息加入上下文。',
    icon: '🔍',
    category: 'built-in',
    version: '1.0.0',
  },
  {
    id: 'connection-manager',
    name: '连接管理',
    description: '管理多个 API 连接配置文件，在不同 AI 服务间快速切换。',
    icon: '🔗',
    category: 'built-in',
    version: '1.0.0',
  },
];

/* ─── 扩展设置面板 ─── */
const ExtensionSettingsPanel: React.FC<{
  extId: string;
  onClose: () => void;
}> = ({ extId, onClose }) => {
  const state = useStoreState();
  const settings = state.extensionSettings[extId] || {};
  const setSetting = (key: string, value: any) => {
    updateExtensionSettings(extId, { [key]: value });
  };

  const renderSettings = () => {
    switch (extId) {
      case 'summarize':
        return (
          <div className="ext-settings-form">
            <div className="ext-settings-row">
              <label>摘要最大 Token 数</label>
              <input type="number" min={100} max={2000} value={settings.maxTokens ?? 500}
                onChange={e => setSetting('maxTokens', parseInt(e.target.value) || 500)} />
              <span className="ext-hint">摘要结果的最大长度</span>
            </div>
            <div className="ext-settings-row">
              <label>触发间隔（轮数）</label>
              <input type="number" min={1} max={50} value={settings.triggerInterval ?? 10}
                onChange={e => setSetting('triggerInterval', parseInt(e.target.value) || 10)} />
              <span className="ext-hint">每多少轮自动触发一次摘要</span>
            </div>
          </div>
        );
      case 'tts':
        return (
          <div className="ext-settings-form">
            <div className="ext-settings-row">
              <label>语音引擎</label>
              <select value={settings.provider ?? 'browser'} onChange={e => setSetting('provider', e.target.value)}>
                <option value="browser">浏览器内置</option>
                <option value="elevenlabs">ElevenLabs</option>
                <option value="edge">Edge TTS</option>
              </select>
            </div>
            <div className="ext-settings-row">
              <label>语音</label>
              <input type="text" value={settings.voice ?? 'default'}
                onChange={e => setSetting('voice', e.target.value)}
                placeholder="语音名称或 ID" />
            </div>
            <div className="ext-settings-row">
              <label className="ext-toggle-label">
                <input type="checkbox" checked={settings.autoPlay ?? false}
                  onChange={e => setSetting('autoPlay', e.target.checked)} />
                自动播放 AI 回复
              </label>
            </div>
          </div>
        );
      case 'caption':
        return (
          <div className="ext-settings-form">
            <div className="ext-settings-row">
              <label>识别引擎</label>
              <select value={settings.provider ?? 'openai'} onChange={e => setSetting('provider', e.target.value)}>
                <option value="openai">OpenAI (GPT-4o)</option>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="google">Google</option>
              </select>
            </div>
            <div className="ext-settings-row">
              <label>模型</label>
              <input type="text" value={settings.model ?? 'gpt-4o-mini'}
                onChange={e => setSetting('model', e.target.value)} />
            </div>
          </div>
        );
      case 'translate':
        return (
          <div className="ext-settings-form">
            <div className="ext-settings-row">
              <label>翻译引擎</label>
              <select value={settings.provider ?? 'google'} onChange={e => setSetting('provider', e.target.value)}>
                <option value="google">Google 翻译</option>
                <option value="deepl">DeepL</option>
                <option value="openai">OpenAI</option>
              </select>
            </div>
            <div className="ext-settings-row">
              <label>源语言</label>
              <select value={settings.sourceLang ?? 'auto'} onChange={e => setSetting('sourceLang', e.target.value)}>
                <option value="auto">自动检测</option>
                <option value="zh-CN">中文</option>
                <option value="en">英语</option>
                <option value="ja">日语</option>
                <option value="ko">韩语</option>
              </select>
            </div>
            <div className="ext-settings-row">
              <label>目标语言</label>
              <select value={settings.targetLang ?? 'zh-CN'} onChange={e => setSetting('targetLang', e.target.value)}>
                <option value="zh-CN">中文</option>
                <option value="en">英语</option>
                <option value="ja">日语</option>
                <option value="ko">韩语</option>
              </select>
            </div>
          </div>
        );
      case 'stable-diffusion':
        return (
          <div className="ext-settings-form">
            <div className="ext-settings-row">
              <label>生成后端</label>
              <select value={settings.provider ?? 'local'} onChange={e => setSetting('provider', e.target.value)}>
                <option value="local">本地 Stable Diffusion</option>
                <option value="dalle">DALL-E</option>
                <option value="flux">FLUX</option>
              </select>
            </div>
            <div className="ext-settings-row">
              <label>API 端点</label>
              <input type="text" value={settings.endpoint ?? ''}
                onChange={e => setSetting('endpoint', e.target.value)}
                placeholder="http://localhost:7860" />
            </div>
            <div className="ext-settings-row">
              <label>模型名称</label>
              <input type="text" value={settings.model ?? ''}
                onChange={e => setSetting('model', e.target.value)}
                placeholder="sd_xl_base_1.0" />
            </div>
          </div>
        );
      case 'vectors':
        return (
          <div className="ext-settings-form">
            <div className="ext-settings-row">
              <label>向量引擎</label>
              <select value={settings.provider ?? 'openai'} onChange={e => setSetting('provider', e.target.value)}>
                <option value="openai">OpenAI Embeddings</option>
                <option value="local">本地模型</option>
              </select>
            </div>
            <div className="ext-settings-row">
              <label>模型</label>
              <input type="text" value={settings.model ?? 'text-embedding-3-small'}
                onChange={e => setSetting('model', e.target.value)} />
            </div>
          </div>
        );
      case 'token-counter':
        return (
          <div className="ext-settings-form">
            <div className="ext-settings-row">
              <label>计数后端</label>
              <select value={settings.backend ?? 'tiktoken'} onChange={e => setSetting('backend', e.target.value)}>
                <option value="tiktoken">TikToken (OpenAI)</option>
                <option value="estimate">估算</option>
              </select>
            </div>
          </div>
        );
      case 'expressions':
        return (
          <div className="ext-settings-form">
            <div className="ext-settings-row">
              <label>立绘文件夹</label>
              <input type="text" value={settings.spriteFolder ?? ''}
                onChange={e => setSetting('spriteFolder', e.target.value)}
                placeholder="角色立绘图片目录路径" />
            </div>
            <div className="ext-settings-row">
              <label>默认表情</label>
              <input type="text" value={settings.defaultExpression ?? 'neutral'}
                onChange={e => setSetting('defaultExpression', e.target.value)}
                placeholder="neutral" />
            </div>
          </div>
        );
      case 'memory':
        return (
          <div className="ext-settings-form">
            <div className="ext-settings-row">
              <div className="ext-info-text">
                记忆扩展的详细配置请前往「世界书」页面进行管理。
                可在左侧工具栏点击「📖 世界书」进入。
              </div>
            </div>
          </div>
        );
      case 'regex':
        return (
          <div className="ext-settings-form">
            <div className="ext-settings-row">
              <div className="ext-info-text">
                正则脚本管理：在此添加、编辑和排序正则替换规则。
                每条规则包含脚本名称、查找模式和替换文本。
              </div>
            </div>
            <div className="ext-settings-row">
              <label className="ext-toggle-label">
                <input type="checkbox" checked={settings.runOnEdit ?? true}
                  onChange={e => setSetting('runOnEdit', e.target.checked)} />
                在编辑消息时也运行正则
              </label>
            </div>
          </div>
        );
      default:
        return (
          <div className="ext-settings-form">
            <div className="ext-info-text">此扩展暂无可配置的设置项。</div>
          </div>
        );
    }
  };

  const extDef = BUILT_IN_EXTENSIONS.find(e => e.id === extId);

  return (
    <div className="ext-settings-overlay" onClick={onClose}>
      <div className="ext-settings-panel" onClick={e => e.stopPropagation()}>
        <div className="ext-settings-header">
          <h3>
            {extDef?.icon} {extDef?.name} 设置
          </h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="ext-settings-body">
          {renderSettings()}
        </div>
      </div>
    </div>
  );
};

/* ─── 主页面 ─── */
const ExtensionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settingsExtId, setSettingsExtId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [search, setSearch] = useState('');
  const state = useStoreState();

  const filteredExtensions = BUILT_IN_EXTENSIONS.filter(ext => {
    if (search && !ext.name.toLowerCase().includes(search.toLowerCase()) &&
        !ext.description.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (filter === 'enabled' && !state.extensionEnabled[ext.id]) return false;
    if (filter === 'disabled' && state.extensionEnabled[ext.id]) return false;
    return true;
  });

  const enabledCount = BUILT_IN_EXTENSIONS.filter(e => state.extensionEnabled[e.id]).length;

  return (
    <div className="ext-page">
      {/* 顶部栏 */}
      <div className="wi-top-bar">
        <div className="wi-top-bar-left">
          <h1 className="wi-page-title">扩展程序</h1>
          <span className="wi-page-subtitle">Extensions</span>
          <span className="ext-count">{enabledCount} / {BUILT_IN_EXTENSIONS.length} 已启用</span>
        </div>
        <div className="wi-top-bar-right">
          <button className="btn-secondary btn-sm" onClick={() => navigate('/')}>← 返回</button>
        </div>
      </div>

      {/* 搜索与过滤 */}
      <div className="wi-toolbar">
        <div className="wi-toolbar-left">
          <span className="wi-search-icon">🔍</span>
          <input
            className="wi-search-input"
            placeholder="搜索扩展..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="wi-toolbar-right">
          <div className="ext-filter-group">
            <button
              className={`ext-filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >全部 ({BUILT_IN_EXTENSIONS.length})</button>
            <button
              className={`ext-filter-btn ${filter === 'enabled' ? 'active' : ''}`}
              onClick={() => setFilter('enabled')}
            >已启用 ({enabledCount})</button>
            <button
              className={`ext-filter-btn ${filter === 'disabled' ? 'active' : ''}`}
              onClick={() => setFilter('disabled')}
            >未启用 ({BUILT_IN_EXTENSIONS.length - enabledCount})</button>
          </div>
        </div>
      </div>

      {/* 扩展列表 */}
      <div className="ext-list">
        {filteredExtensions.map(ext => {
          const isEnabled = !!state.extensionEnabled[ext.id];
          const extSettings = state.extensionSettings[ext.id] || {};

          return (
            <div
              key={ext.id}
              className={`ext-card ${isEnabled ? 'ext-card-enabled' : ''}`}
            >
              <div className="ext-card-left">
                <div className="ext-icon">{ext.icon}</div>
                <div className="ext-info">
                  <div className="ext-name">{ext.name}</div>
                  <div className="ext-desc">{ext.description}</div>
                  <div className="ext-meta">
                    <span className="ext-version">v{ext.version}</span>
                    <span className="ext-category">{ext.category === 'built-in' ? '内置' : '第三方'}</span>
                  </div>
                </div>
              </div>
              <div className="ext-card-right">
                <label className="wi-toggle-switch" title={isEnabled ? '点击禁用' : '点击启用'}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => setExtensionEnabled(ext.id, !isEnabled)}
                  />
                  <span className="wi-toggle-track"><span className="wi-toggle-thumb" /></span>
                </label>
                <button
                  className="btn-secondary btn-sm ext-settings-btn"
                  onClick={() => setSettingsExtId(ext.id)}
                  title="扩展设置"
                >⚙️ 设置</button>
              </div>
            </div>
          );
        })}

        {filteredExtensions.length === 0 && (
          <div className="wi-empty">
            <div className="wi-empty-icon">🧩</div>
            <h2>没有找到匹配的扩展</h2>
            <p>尝试修改搜索词或过滤条件</p>
          </div>
        )}
      </div>

      {/* 第三方安装提示 */}
      <div className="ext-install-section">
        <div className="ext-install-title">安装第三方扩展</div>
        <div className="ext-install-desc">
          SillyTavern 支持从 Git 仓库安装社区扩展。此功能即将上线。
        </div>
        <div className="ext-install-input-row">
          <input
            className="ext-install-input"
            type="text"
            placeholder="粘贴 Git 仓库 URL..."
            disabled
          />
          <button className="btn-primary btn-sm" disabled>安装</button>
        </div>
      </div>

      {/* 设置面板 */}
      {settingsExtId && (
        <ExtensionSettingsPanel
          extId={settingsExtId}
          onClose={() => setSettingsExtId(null)}
        />
      )}
    </div>
  );
};

export default ExtensionsPage;

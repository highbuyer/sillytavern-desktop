/**
 * AI API 服务层
 * 统一封装 OpenAI / Claude / Ollama / OpenRouter 四个后端
 * 支持 SSE 流式响应和非流式响应
 */

// ==================== 类型定义 ====================

export type AIProvider = 'openai' | 'claude' | 'ollama' | 'openrouter';

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  maxContext?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullText: string) => void;
  onError: (error: Error) => void;
}

export interface AIServiceConfig {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  apiUrl: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
}

// ==================== 模型列表 ====================

export const MODEL_LIST: AIModel[] = [
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', maxContext: 128000 },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', maxContext: 128000 },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', maxContext: 128000 },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', maxContext: 16385 },
  // Claude
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'claude', maxContext: 200000 },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'claude', maxContext: 200000 },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', provider: 'claude', maxContext: 200000 },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'claude', maxContext: 200000 },
  // Ollama (用户自定义)
  { id: 'llama3', name: 'Llama 3 (Ollama)', provider: 'ollama', maxContext: 8192 },
  { id: 'qwen2.5', name: 'Qwen 2.5 (Ollama)', provider: 'ollama', maxContext: 32768 },
  { id: 'mistral', name: 'Mistral (Ollama)', provider: 'ollama', maxContext: 32768 },
  // OpenRouter (使用 OpenAI 兼容格式)
  { id: 'openrouter/auto', name: 'Auto (OpenRouter)', provider: 'openrouter', maxContext: 128000 },
];

export const getModelsByProvider = (provider: AIProvider): AIModel[] =>
  MODEL_LIST.filter(m => m.provider === provider);

// ==================== AbortController 管理 ====================

let currentAbortController: AbortController | null = null;

export const abortGeneration = () => {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
};

// ==================== OpenAI 兼容 API（含 OpenRouter）====================

async function* streamOpenAICompatible(
  config: AIServiceConfig,
  messages: ChatMessage[],
  signal: AbortSignal
): AsyncGenerator<string> {
  const url = `${config.apiUrl.replace(/\/$/, '')}/chat/completions`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const body: any = {
    model: config.model,
    messages,
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 2000,
    top_p: config.topP ?? 0.9,
    frequency_penalty: config.frequencyPenalty ?? 0,
    presence_penalty: config.presencePenalty ?? 0,
    stream: true,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error (${response.status}): ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (!trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        const content = json.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      } catch {
        // 忽略解析错误
      }
    }
  }
}

// ==================== Claude API ====================

async function* streamClaude(
  config: AIServiceConfig,
  messages: ChatMessage[],
  signal: AbortSignal
): AsyncGenerator<string> {
  const url = `${config.apiUrl.replace(/\/$/, '')}/messages`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };
  if (config.apiKey) {
    headers['x-api-key'] = config.apiKey;
  }

  // Claude 要求 system 单独传
  const systemMsg = messages.find(m => m.role === 'system');
  const chatMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => ({ role: m.role, content: m.content }));

  const body: any = {
    model: config.model,
    max_tokens: config.maxTokens ?? 4096,
    temperature: config.temperature ?? 0.7,
    top_p: config.topP ?? 0.9,
    stream: true,
    messages: chatMessages,
  };
  if (systemMsg) {
    body.system = systemMsg.content;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API Error (${response.status}): ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;

      try {
        const json = JSON.parse(trimmed.slice(6));
        if (json.type === 'content_block_delta' && json.delta?.text) {
          yield json.delta.text;
        }
      } catch {
        // 忽略解析错误
      }
    }
  }
}

// ==================== Ollama API ====================

async function* streamOllama(
  config: AIServiceConfig,
  messages: ChatMessage[],
  signal: AbortSignal
): AsyncGenerator<string> {
  const url = `${config.apiUrl.replace(/\/$/, '')}/api/chat`;

  const body: any = {
    model: config.model,
    messages,
    stream: true,
    options: {
      temperature: config.temperature ?? 0.7,
      top_p: config.topP ?? 0.9,
      num_predict: config.maxTokens ?? 2000,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API Error (${response.status}): ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const json = JSON.parse(trimmed);
        if (json.message?.content) {
          yield json.message.content;
        }
        if (json.done) break;
      } catch {
        // 忽略解析错误
      }
    }
  }
}

// ==================== 统一流式接口 ====================

export async function streamChat(
  config: AIServiceConfig,
  messages: ChatMessage[],
  callbacks: StreamCallbacks
): Promise<void> {
  // 取消之前的请求
  abortGeneration();
  currentAbortController = new AbortController();
  const { signal } = currentAbortController;

  let fullText = '';

  try {
    let stream: AsyncGenerator<string>;

    switch (config.provider) {
      case 'claude':
        stream = streamClaude(config, messages, signal);
        break;
      case 'ollama':
        stream = streamOllama(config, messages, signal);
        break;
      case 'openrouter':
        // OpenRouter 使用 OpenAI 兼容格式
        stream = streamOpenAICompatible(config, messages, signal);
        break;
      case 'openai':
      default:
        stream = streamOpenAICompatible(config, messages, signal);
        break;
    }

    for await (const token of stream) {
      fullText += token;
      callbacks.onToken(token);
    }

    callbacks.onDone(fullText);
  } catch (error: any) {
    if (error.name === 'AbortError') {
      // 用户手动取消
      callbacks.onDone(fullText);
    } else {
      callbacks.onError(error instanceof Error ? error : new Error(String(error)));
    }
  } finally {
    currentAbortController = null;
  }
}

// ==================== 非流式接口（备用）====================

export async function chatCompletion(
  config: AIServiceConfig,
  messages: ChatMessage[]
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    await streamChat(config, messages, {
      onToken: () => {}, // 非流式不需要逐token处理
      onDone: (text) => resolve(text),
      onError: (err) => reject(err),
    });
  });
}

// ==================== API 连接测试 ====================

export async function testConnection(config: AIServiceConfig): Promise<{ success: boolean; message: string }> {
  try {
    const result = await chatCompletion(config, [
      { role: 'user', content: 'Hi' },
    ]);
    return { success: true, message: `连接成功，模型响应: ${result.substring(0, 50)}...` };
  } catch (error: any) {
    return { success: false, message: `连接失败: ${error.message}` };
  }
}

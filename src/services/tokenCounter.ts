/**
 * Token 估算服务
 * 使用简易规则估算 token 数（不依赖 tiktoken，减少体积）
 * 中文字符约 1.5 token/字，英文约 0.75 token/word
 */

// 估算单条文本的 token 数
export function estimateTokens(text: string): number {
  if (!text) return 0;

  let tokens = 0;
  let i = 0;

  while (i < text.length) {
    const charCode = text.charCodeAt(i);

    if (charCode < 128) {
      // ASCII 字符
      if (/[a-zA-Z]/.test(text[i])) {
        // 英文字母：统计整个单词
        let wordLen = 0;
        while (i < text.length && /[a-zA-Z']/.test(text[i])) {
          wordLen++;
          i++;
        }
        // 平均每个英文词约 1.3 tokens
        tokens += Math.max(1, Math.ceil(wordLen * 1.3 / 4));
      } else if (text[i] === ' ') {
        i++;
        // 空格通常合并到前面的 token，不计入
      } else if (/\d/.test(text[i])) {
        // 数字：每 3-4 位算 1 个 token
        let numLen = 0;
        while (i < text.length && /[\d.,]/.test(text[i])) {
          numLen++;
          i++;
        }
        tokens += Math.max(1, Math.ceil(numLen / 3));
      } else {
        // 其他 ASCII（标点等）
        tokens += 1;
        i++;
      }
    } else if (charCode >= 0x4e00 && charCode <= 0x9fff) {
      // CJK 统一汉字：每个字约 1.5-2 tokens
      tokens += 2;
      i++;
    } else if (charCode >= 0x3040 && charCode <= 0x30ff) {
      // 日文假名
      tokens += 2;
      i++;
    } else if (charCode >= 0xac00 && charCode <= 0xd7af) {
      // 韩文
      tokens += 2;
      i++;
    } else if (charCode >= 0xfff0) {
      // Emoji 等特殊符号
      tokens += 2;
      i++;
      // 跳过可能的代理对
      if (i < text.length && text.charCodeAt(i) >= 0xdc00 && text.charCodeAt(i) <= 0xdfff) {
        i++;
      }
    } else {
      // 其他 Unicode
      tokens += 2;
      i++;
    }
  }

  return tokens;
}

// 估算消息数组的总 token 数
export function estimateMessagesTokens(messages: { role: string; content: string }[]): number {
  let total = 0;
  for (const msg of messages) {
    // 每条消息有约 4 token 的格式开销 (role, content 等键)
    total += 4;
    total += estimateTokens(msg.content);
  }
  return total;
}

// 格式化 token 数量显示
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return String(tokens);
}

// 计算上下文使用百分比
export function getContextUsage(usedTokens: number, maxTokens: number): {
  percent: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  color: string;
} {
  const percent = Math.min(100, Math.round((usedTokens / maxTokens) * 100));

  let level: 'low' | 'medium' | 'high' | 'critical';
  let color: string;

  if (percent < 50) {
    level = 'low';
    color = '#4CAF50'; // 绿色
  } else if (percent < 75) {
    level = 'medium';
    color = '#FF9800'; // 橙色
  } else if (percent < 90) {
    level = 'high';
    color = '#F44336'; // 红色
  } else {
    level = 'critical';
    color = '#FF1744'; // 亮红
  }

  return { percent, level, color };
}

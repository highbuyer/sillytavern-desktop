import React, { useMemo } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import css from 'highlight.js/lib/languages/css';
import xml from 'highlight.js/lib/languages/xml';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';
import sql from 'highlight.js/lib/languages/sql';
import java from 'highlight.js/lib/languages/java';
import cpp from 'highlight.js/lib/languages/cpp';
import markdown from 'highlight.js/lib/languages/markdown';
import yaml from 'highlight.js/lib/languages/yaml';
import rust from 'highlight.js/lib/languages/rust';
import go from 'highlight.js/lib/languages/go';

// 注册常用语言
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('js', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('ts', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('py', python);
hljs.registerLanguage('css', css);
hljs.registerLanguage('html', xml);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('json', json);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('shell', bash);
hljs.registerLanguage('sh', bash);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('java', java);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('c', cpp);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('md', markdown);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('yml', yaml);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('go', go);

// 配置 marked
marked.setOptions({
  breaks: true,
  gfm: true,
});

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const html = useMemo(() => {
    if (!content) return '';

    try {
      // 自定义渲染器，添加代码高亮
      const renderer = new marked.Renderer();
      
      renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
        const language = lang && hljs.getLanguage(lang) ? lang : '';
        let highlighted = text;
        if (language) {
          try {
            highlighted = hljs.highlight(text, { language }).value;
          } catch {
            highlighted = text;
          }
        } else {
          // 尝试自动检测
          try {
            highlighted = hljs.highlightAuto(text).value;
          } catch {
            highlighted = text;
          }
        }
        const langLabel = language ? `<div class="code-header"><span class="code-lang">${language}</span><button class="copy-code-btn" onclick="(function(btn){var code=btn.parentElement.nextElementSibling.textContent;navigator.clipboard.writeText(code);btn.textContent='已复制!';setTimeout(function(){btn.textContent='复制';},2000);})(this)">复制</button></div>` : '';
        return `${langLabel}<pre><code class="hljs${language ? ` language-${language}` : ''}">${highlighted}</code></pre>`;
      };

      renderer.table = ({ header, body }: { header: string; body: string }) => {
        return `<div class="table-wrapper"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;
      };

      renderer.link = ({ href, title, text }: { href: string; title?: string; text: string }) => {
        return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      };

      renderer.heading = ({ text, depth }: { text: string; depth: number }) => {
        const tag = `h${depth}`;
        return `<${tag} class="md-heading md-h${depth}">${text}</${tag}>`;
      };

      renderer.blockquote = ({ text }: { text: string }) => {
        return `<blockquote class="md-blockquote">${text}</blockquote>`;
      };

      renderer.list = ({ body, ordered }: { body: string; ordered: boolean }) => {
        const tag = ordered ? 'ol' : 'ul';
        return `<${tag} class="md-list">${body}</${tag}>`;
      };

      renderer.listitem = ({ text }: { text: string }) => {
        return `<li class="md-list-item">${text}</li>`;
      };

      renderer.image = ({ href, title, text }: { href: string; title?: string; text: string }) => {
        return `<div class="md-image-wrapper"><img src="${href}" alt="${text}" title="${title || ''}" loading="lazy" /><${title ? `p class="md-image-caption">${title}</p>` : ''}></div>`;
      };

      renderer.hr = () => {
        return '<hr class="md-hr" />';
      };

      const parsed = marked.parse(content, { renderer }) as string;
      return parsed;
    } catch (error) {
      console.error('Markdown parse error:', error);
      // 降级为简单渲染
      return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');
    }
  }, [content]);

  return (
    <div
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default MarkdownRenderer;

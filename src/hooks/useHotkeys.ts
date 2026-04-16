import { useEffect, useCallback } from 'react';

interface HotkeyAction {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

/**
 * 全局快捷键 Hook
 * @param actions 快捷键列表
 * @param enabled 是否启用
 */
export function useHotkeys(actions: HotkeyAction[], enabled: boolean = true) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // 忽略在输入框、文本框中的快捷键（除特殊键）
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;

      for (const hotkey of actions) {
        const keyMatch = e.key.toLowerCase() === hotkey.key.toLowerCase();
        const ctrlMatch = hotkey.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
        const shiftMatch = hotkey.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = hotkey.alt ? e.altKey : !e.altKey;

        // 对于非输入区域，或者 Ctrl 组合键，都允许触发
        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          if (isInput && !hotkey.ctrl && !hotkey.alt) continue;
          e.preventDefault();
          e.stopPropagation();
          hotkey.action();
          return;
        }
      }
    },
    [actions, enabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

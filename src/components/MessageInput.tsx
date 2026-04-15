import React from 'react';

interface Props { 
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const MessageInput: React.FC<Props> = ({ value, onChange, onSend, disabled = false, placeholder = '输入消息...' }) => {
  return (
    <div className="message-input">
      <textarea 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        onKeyDown={(e) => { 
          if (e.key === 'Enter' && !e.shiftKey && !disabled) { 
            e.preventDefault(); 
            onSend(); 
          } 
        }} 
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
      />
      <button onClick={onSend} disabled={disabled || !value.trim()}>
        {disabled ? '生成中...' : '发送'}
      </button>
    </div>
  );
};

export default MessageInput;

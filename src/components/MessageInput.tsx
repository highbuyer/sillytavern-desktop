import React from 'react';

interface Props { 
  value: string;
  onChange: (value: string) => void;
  onSend: () => void; 
}

const MessageInput: React.FC<Props> = ({ value, onChange, onSend }) => {
  return (
    <div className="message-input">
      <textarea 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        onKeyDown={(e) => { 
          if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault(); 
            onSend(); 
          } 
        }} 
        placeholder="输入消息..." 
      />
      <button onClick={onSend}>发送</button>
    </div>
  );
};

export default MessageInput;

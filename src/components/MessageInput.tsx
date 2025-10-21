import { useState, useRef } from 'react';
import { Paperclip, Mic, Send } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onFileSelect?: (file: File) => void;
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, onFileSelect, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onFileSelect) {
      onFileSelect(file);
    }
    // 重置input以便可以选择同一个文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="border-t border-slate-700 bg-slate-800 p-4">
      <div className="flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={disabled}
        />
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white hover:bg-slate-700"
          disabled={disabled}
          onClick={handleFileButtonClick}
        >
          <Paperclip className="w-5 h-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white hover:bg-slate-700"
          disabled={disabled}
        >
          <Mic className="w-5 h-5" />
        </Button>
        
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入消息..."
          disabled={disabled}
          className="flex-1 bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
        />
        
        <Button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          size="icon"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

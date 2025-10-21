import { useState } from 'react';

interface TextChatImportProps {
  onImport: (text: string) => void;
}

export function TextChatImport({ onImport }: TextChatImportProps) {
  const [text, setText] = useState('');

  const handleImport = () => {
    if (text.trim()) {
      onImport(text);
      setText('');
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md">
      <div className="flex flex-col gap-2">
        <label htmlFor="chat-text" className="text-sm font-medium text-gray-700">
          粘贴聊天记录
        </label>
        <p className="text-xs text-gray-500">
          从PDF复制文本并粘贴到下方。格式示例：
          <br />
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
            Bud 2025年9月23日 15:23<br />
            消息内容<br />
            <br />
            可大力 2025年9月23日 15:41<br />
            消息内容
          </code>
        </p>
      </div>

      <textarea
        id="chat-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="在此粘贴聊天记录文本..."
        className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex items-center gap-4">
        <button
          onClick={handleImport}
          disabled={!text.trim()}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          解析并导入
        </button>

        {text && (
          <span className="text-sm text-gray-500">
            文本长度: {text.length} 字符
          </span>
        )}
      </div>
    </div>
  );
}

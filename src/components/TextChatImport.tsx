import { useState } from 'react';

interface TextChatImportProps {
  onImport: (text: string, images: Array<{ id: string; base64: string }>) => void;
}

export function TextChatImport({ onImport }: TextChatImportProps) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<Array<{ id: string; base64: string; preview: string }>>([]);

  const handleImport = () => {
    if (text.trim()) {
      onImport(text, images.map(img => ({ id: img.id, base64: img.base64 })));
      setText('');
      setImages([]);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // 检查是否有图片
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault(); // 阻止默认粘贴行为

        const file = item.getAsFile();
        if (!file) continue;

        console.log('📷 检测到图片粘贴:', file.name, file.type);

        // 将图片转为Base64
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          const imageId = `IMG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

          // 保存图片
          setImages(prev => [...prev, {
            id: imageId,
            base64,
            preview: base64
          }]);

          // 在文本中插入图片占位符
          setText(prev => {
            const imageMarker = `[图片:${imageId}]`;
            const newText = prev ? prev + '\n' + imageMarker + '\n' : imageMarker + '\n';
            return newText;
          });

          console.log('✅ 图片已保存:', imageId);
        };
        reader.readAsDataURL(file);

        break; // 只处理第一个图片
      }
    }
  };

  const handleRemoveImage = (imageId: string) => {
    setImages(prev => prev.filter(img => img.id !== imageId));
    // 从文本中移除对应的图片标记
    setText(prev => prev.replace(new RegExp(`\\[图片:${imageId}\\]\\n?`, 'g'), ''));
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md">
      <div className="flex flex-col gap-2">
        <label htmlFor="chat-text" className="text-sm font-medium text-gray-700">
          粘贴聊天记录
        </label>
        <p className="text-xs text-gray-500">
          支持文本和图片粘贴。格式示例：
          <br />
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
            Bud 2025年9月23日 15:23<br />
            消息内容<br />
            [图片:IMG_xxx] (图片会自动插入)<br />
            <br />
            可大力 2025年9月23日 15:41<br />
            消息内容
          </code>
          <br />
          <span className="text-blue-600 font-medium">💡 支持粘贴截图，图片会自动保存并在聊天记录中显示</span>
        </p>
      </div>

      {/* 显示已粘贴的图片预览 */}
      {images.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">已添加的图片 ({images.length})</label>
          <div className="grid grid-cols-3 gap-2">
            {images.map(img => (
              <div key={img.id} className="relative group">
                <img
                  src={img.preview}
                  alt="粘贴的图片"
                  className="w-full h-24 object-cover rounded border border-gray-300"
                />
                <button
                  onClick={() => handleRemoveImage(img.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  title="删除图片"
                >
                  ×
                </button>
                <div className="text-xs text-gray-500 mt-1 truncate">{img.id}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <textarea
        id="chat-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={handlePaste}
        placeholder="在此粘贴聊天记录文本或截图..."
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

        {images.length > 0 && (
          <span className="text-sm text-blue-600 font-medium">
            {images.length} 张图片
          </span>
        )}
      </div>
    </div>
  );
}

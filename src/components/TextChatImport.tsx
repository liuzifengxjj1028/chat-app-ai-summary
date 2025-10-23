import { useState } from 'react';
import { createWorker } from 'tesseract.js';

interface TextChatImportProps {
  onImport: (text: string) => void;
}

export function TextChatImport({ onImport }: TextChatImportProps) {
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const handleImport = () => {
    if (text.trim()) {
      onImport(text);
      setText('');
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

        // 使用OCR识别图片中的文字
        setIsProcessing(true);
        setOcrProgress(0);

        try {
          const worker = await createWorker('chi_sim+eng', 1, {
            logger: m => {
              if (m.status === 'recognizing text') {
                setOcrProgress(Math.round(m.progress * 100));
              }
            }
          });

          const imageUrl = URL.createObjectURL(file);
          const { data: { text: recognizedText } } = await worker.recognize(imageUrl);

          await worker.terminate();
          URL.revokeObjectURL(imageUrl);

          console.log('✅ OCR识别完成，识别到', recognizedText.length, '个字符');

          // 将识别的文字追加到文本框
          setText(prev => {
            const newText = prev ? prev + '\n\n' + recognizedText : recognizedText;
            return newText;
          });

        } catch (error) {
          console.error('❌ OCR识别失败:', error);
          alert('图片识别失败，请重试或手动输入文本');
        } finally {
          setIsProcessing(false);
          setOcrProgress(0);
        }

        break; // 只处理第一个图片
      }
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-lg shadow-md">
      <div className="flex flex-col gap-2">
        <label htmlFor="chat-text" className="text-sm font-medium text-gray-700">
          粘贴聊天记录
        </label>
        <p className="text-xs text-gray-500">
          支持文本或图片粘贴。格式示例：
          <br />
          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
            Bud 2025年9月23日 15:23<br />
            消息内容<br />
            <br />
            可大力 2025年9月23日 15:41<br />
            消息内容
          </code>
          <br />
          <span className="text-blue-600 font-medium">💡 新功能：支持粘贴截图，自动识别图片中的文字</span>
        </p>
      </div>

      {/* OCR处理进度提示 */}
      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">正在识别图片中的文字...</p>
              <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${ocrProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-blue-700 mt-1">{ocrProgress}%</p>
            </div>
          </div>
        </div>
      )}

      <textarea
        id="chat-text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onPaste={handlePaste}
        placeholder="在此粘贴聊天记录文本或截图..."
        disabled={isProcessing}
        className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
      />

      <div className="flex items-center gap-4">
        <button
          onClick={handleImport}
          disabled={!text.trim() || isProcessing}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          解析并导入
        </button>

        {text && (
          <span className="text-sm text-gray-500">
            文本长度: {text.length} 字符
          </span>
        )}

        {isProcessing && (
          <span className="text-sm text-blue-600 font-medium">
            正在识别图片...
          </span>
        )}
      </div>
    </div>
  );
}

import { ClipboardPaste } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';

interface ImportOptionsDialogProps {
  onTextImport: (text: string) => void;
}

export function ImportOptionsDialog({ onTextImport }: ImportOptionsDialogProps) {
  const [text, setText] = useState('');

  const handleImport = () => {
    console.log('🔵 ImportOptionsDialog: 点击了导入按钮');
    console.log('🔵 ImportOptionsDialog: 文本长度:', text.length);

    if (text.trim()) {
      console.log('🔵 ImportOptionsDialog: 调用 onTextImport');
      onTextImport(text);
    } else {
      console.log('🔵 ImportOptionsDialog: 文本为空，不导入');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="max-w-3xl w-full space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white">模拟群聊AI总结</h2>
            <p className="text-slate-400">
              粘贴聊天记录文本，查看解析后的群聊内容并生成AI总结
            </p>
          </div>

          {/* 文本输入区域 */}
          <div className="space-y-4">
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-2">
              <h3 className="text-white font-medium text-sm flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4" />
                粘贴聊天记录
              </h3>
              <p className="text-slate-400 text-xs">
                支持的格式示例：
              </p>
              <pre className="text-slate-400 text-xs bg-slate-900/50 p-3 rounded border border-slate-700 overflow-x-auto">
{`Bud 2025年9月23日 15:23
尽快哈
可大力
@Bud(利指导)
2025年9月23日 15:41
有时间吗？对一下这个和空间这两个事情`}
              </pre>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-96 p-4 border border-slate-600 rounded-lg font-mono text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="在此粘贴聊天记录文本..."
            />

            <Button
              onClick={handleImport}
              disabled={!text.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed py-6 text-base"
            >
              <ClipboardPaste className="w-5 h-5 mr-2" />
              解析并导入聊天记录
            </Button>
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
            <h3 className="text-white font-medium text-sm">格式说明：</h3>
            <ul className="text-slate-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>
                  每条消息包含：<strong>用户名 日期 时间</strong>（如：Bud 2025年9月23日 15:23）
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>
                  消息内容在下一行，可以是多行文本
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-0.5">•</span>
                <span>
                  支持 @提及 功能，会被自动识别
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

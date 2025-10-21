import { Upload, FileText } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from './ui/button';

interface GroupChatImportProps {
  onImport: (file: File) => void;
}

export function GroupChatImport({ onImport }: GroupChatImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      // 重置input以便可以重新选择同一个文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      onImport(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-white">模拟群聊AI总结</h2>
          <p className="text-slate-400">
            导入聊天记录文件，查看解析后的群聊内容并生成AI总结
          </p>
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
            isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
          }`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.log,.json,.pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center">
              <Upload className="w-8 h-8 text-slate-400" />
            </div>

            <div className="space-y-2">
              <p className="text-white font-medium">拖拽文件到此处或点击上传</p>
              <p className="text-sm text-slate-400">
                支持 .txt、.log、.json、.pdf 格式的聊天记录文件
              </p>
            </div>

            <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
              <FileText className="w-4 h-4 mr-2" />
              选择文件
            </Button>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
          <h3 className="text-white font-medium text-sm">支持的文件格式：</h3>
          <ul className="text-slate-400 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>
                <strong>微信聊天记录：</strong>每行格式为 "时间 用户名: 消息内容"
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>
                <strong>QQ聊天记录：</strong>每行格式为 "时间 用户名 消息内容"
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>
                <strong>JSON格式：</strong>包含 messages 数组，每个消息有 sender、content、timestamp 字段
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-0.5">•</span>
              <span>
                <strong>PDF格式：</strong>自动提取PDF中的文本内容并解析为聊天记录
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

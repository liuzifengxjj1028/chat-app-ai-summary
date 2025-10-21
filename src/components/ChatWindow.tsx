import { MessageCircle, FileIcon, Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { fileUploadService } from '../services/fileUpload';

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isSelf: boolean;
  contentType?: 'text' | 'image' | 'file';
  fileId?: string;
  fileSize?: number;
}

interface ChatWindowProps {
  messages: Message[];
  contactName?: string;
  isGroupChat?: boolean; // 是否为群聊模式
  highlightMessageIds?: string[]; // 需要高亮的消息ID列表
}

export function ChatWindow({ messages, contactName, isGroupChat = false, highlightMessageIds = [] }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [flashingIds, setFlashingIds] = useState<Set<string>>(new Set());

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 当消息更新时自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 当需要高亮消息时，滚动到第一个消息并闪烁
  useEffect(() => {
    if (highlightMessageIds.length > 0) {
      const firstId = highlightMessageIds[0];
      const element = messageRefs.current.get(firstId);

      if (element) {
        // 滚动到目标消息
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // 开始闪烁动画
        setFlashingIds(new Set(highlightMessageIds));

        // 2秒后停止闪烁
        const timer = setTimeout(() => {
          setFlashingIds(new Set());
        }, 2000);

        return () => clearTimeout(timer);
      }
    }
  }, [highlightMessageIds]);
  if (!contactName) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
        <MessageCircle className="w-16 h-16 mb-4 opacity-30" strokeWidth={1.5} />
        <div className="text-lg mb-2">开始聊天</div>
        <div className="text-sm">从左侧选择一个联系人开始对话</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-slate-500">
          <MessageCircle className="w-16 h-16 mb-4 opacity-30" strokeWidth={1.5} />
          <div className="text-sm">开始与 {contactName} 的对话</div>
        </div>
      ) : (
        <>
          {messages.map((message, index) => {
            const isFlashing = flashingIds.has(message.id);
            return (
              <div
                key={`${message.id}-${index}`}
                className={`flex ${message.isSelf ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  ref={(el) => {
                    if (el) {
                      messageRefs.current.set(message.id, el);
                    } else {
                      messageRefs.current.delete(message.id);
                    }
                  }}
                  className={`max-w-md px-4 py-2 rounded-lg transition-all ${
                    message.isSelf
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-white'
                  } ${
                    isFlashing
                      ? 'ring-4 ring-yellow-400 ring-opacity-75 animate-pulse'
                      : ''
                  }`}
                >
                  {/* 群聊模式下始终显示发言人，单聊模式下只显示对方 */}
                  {(isGroupChat || !message.isSelf) && (
                    <div className="text-xs text-slate-400 mb-1">{message.sender}</div>
                  )}

                  {/* 文件消息 */}
                  {message.contentType === 'file' && message.fileId ? (
                    <div className="flex items-center gap-3">
                      <FileIcon className="w-8 h-8" />
                      <div className="flex-1">
                        <div className="font-medium">{message.content}</div>
                        {message.fileSize && (
                          <div className="text-xs opacity-70">
                            {(message.fileSize / 1024 / 1024).toFixed(2)} MB
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => fileUploadService.downloadFile(message.fileId!, message.content)}
                        className="p-2 hover:bg-white/10 rounded transition-colors"
                        title="下载文件"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    /* 普通文本消息 */
                    <div>{message.content}</div>
                  )}

                  <div className="text-xs opacity-70 mt-1">{message.timestamp}</div>
                </div>
              </div>
            );
          })}
          {/* 滚动目标元素 */}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}

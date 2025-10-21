import { X, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import { ParsedMessage } from '../services/chatParser';

interface AISummaryDialogProps {
  messages: ParsedMessage[];
  onClose: () => void;
  onSummarize: (startTime?: Date, endTime?: Date, customPrompt?: string) => void;
}

export function AISummaryDialog({ messages, onClose, onSummarize }: AISummaryDialogProps) {
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('准备中...');

  console.log('🟢 AISummaryDialog 渲染了，消息数量:', messages.length);

  // 获取消息的时间范围
  const getTimeRange = () => {
    if (messages.length === 0) return null;

    const times = messages
      .map((msg) => msg.rawTimestamp)
      .filter((t): t is Date => t !== undefined)
      .sort((a, b) => a.getTime() - b.getTime());

    if (times.length === 0) return null;

    return {
      start: times[0],
      end: times[times.length - 1],
    };
  };

  const timeRange = getTimeRange();

  const handleSummarize = () => {
    const start = startTime ? new Date(startTime) : undefined;
    const end = endTime ? new Date(endTime) : undefined;
    const prompt = customPrompt.trim() || undefined;

    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingText('正在准备聊天记录...');

    // 模拟进度更新，让用户感觉有进展
    const progressSteps = [
      { progress: 20, text: '正在分析消息内容...', delay: 300 },
      { progress: 40, text: '正在构建总结请求...', delay: 600 },
      { progress: 60, text: '正在调用AI生成总结...', delay: 1000 },
      { progress: 80, text: 'AI正在思考中...', delay: 2000 },
      { progress: 95, text: '正在整理总结结果...', delay: 3000 },
    ];

    progressSteps.forEach((step) => {
      setTimeout(() => {
        setLoadingProgress(step.progress);
        setLoadingText(step.text);
      }, step.delay);
    });

    onSummarize(start, end, prompt);
  };

  // 格式化日期为 datetime-local 输入框需要的格式
  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const dialogContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '1rem'
      }}
      onClick={(e) => {
        // 点击背景遮罩层时关闭对话框
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-slate-800 rounded-lg shadow-2xl w-full flex flex-col"
        style={{
          maxWidth: '42rem',
          maxHeight: '90vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">AI聊天总结</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            disabled={isLoading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 - 可滚动 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 消息统计 */}
          <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
            <h3 className="text-sm font-medium text-slate-300">消息统计</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-400">总消息数</div>
                <div className="text-white font-semibold text-lg">{messages.length}</div>
              </div>
              {timeRange && (
                <div>
                  <div className="text-slate-400">时间范围</div>
                  <div className="text-white text-xs">
                    {timeRange.start.toLocaleDateString()}
                    <br />
                    至 {timeRange.end.toLocaleDateString()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 时间范围选择 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white">选择总结时间范围（可选）</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1">开始时间</label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  max={endTime || (timeRange ? formatDateTimeLocal(timeRange.end) : undefined)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">结束时间</label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  min={startTime || (timeRange ? formatDateTimeLocal(timeRange.start) : undefined)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isLoading}
                />
              </div>

              {(startTime || endTime) && (
                <button
                  onClick={() => {
                    setStartTime('');
                    setEndTime('');
                  }}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                  disabled={isLoading}
                >
                  清除时间选择
                </button>
              )}
            </div>

            <p className="text-xs text-slate-400">
              💡 留空表示总结全部聊天记录。选择时间范围可以只总结特定时间段的对话。
            </p>
          </div>

          {/* 自定义总结要求 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white">自定义总结要求（可选）</h3>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="例如：请重点分析产品功能讨论，提炼出具体的需求和解决方案..."
              className="w-full h-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              disabled={isLoading}
            />
            <p className="text-xs text-slate-400">
              💡 如果选择了时间范围，AI会重点分析该时段的对话，同时参考前后消息作为背景。
            </p>
          </div>

          {/* 进度条 */}
          {isLoading && (
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{loadingText}</span>
                <span className="text-purple-400 font-semibold">{loadingProgress}%</span>
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-400 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* 按钮组 */}
          <div className="flex gap-3">
            <Button
              onClick={onClose}
              className="flex-1 bg-slate-600 hover:bg-slate-500 text-white"
              disabled={isLoading}
            >
              取消
            </Button>
            <Button
              onClick={handleSummarize}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  开始总结
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}

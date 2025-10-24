import { X, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import { ParsedMessage } from '../services/chatParser';
import { SummaryResult } from '../services/aiSummary';
import { SummaryResultDisplay } from './SummaryResult';

interface AISummaryDialogProps {
  messages: ParsedMessage[];
  onClose: () => void;
  onSummarize: (startTime?: Date, endTime?: Date, customPrompt?: string, currentUser?: string, participantMode?: 'all' | 'selected', selectedParticipants?: string[]) => void;
  summaryResult?: SummaryResult | null;
  onJumpToMessage?: (messageIds: string[]) => void;
}

export function AISummaryDialog({ messages, onClose, onSummarize, summaryResult, onJumpToMessage }: AISummaryDialogProps) {
  const [timeRangeOption, setTimeRangeOption] = useState<'today' | 'last3days' | 'last7days' | 'custom' | 'all'>('all');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [participantMode, setParticipantMode] = useState<'all' | 'selected'>('all');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('准备中...');

  console.log('🟢 AISummaryDialog 渲染了，消息数量:', messages.length);

  // 获取所有参与者列表
  const getParticipants = () => {
    const participantsMap = new Map<string, number>();
    messages.forEach(msg => {
      const count = participantsMap.get(msg.sender) || 0;
      participantsMap.set(msg.sender, count + 1);
    });
    return Array.from(participantsMap.entries())
      .sort((a, b) => b[1] - a[1]) // 按消息数量排序
      .map(([name]) => name);
  };

  const participants = getParticipants();

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

  // 根据时间范围选项计算实际的开始和结束时间
  const calculateTimeRange = (): { start?: Date; end?: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (timeRangeOption) {
      case 'today':
        return { start: today, end: undefined };
      case 'last3days':
        const last3days = new Date(today);
        last3days.setDate(last3days.getDate() - 3);
        return { start: last3days, end: undefined };
      case 'last7days':
        const last7days = new Date(today);
        last7days.setDate(last7days.getDate() - 7);
        return { start: last7days, end: undefined };
      case 'custom':
        return {
          start: startTime ? new Date(startTime) : undefined,
          end: endTime ? new Date(endTime) : undefined,
        };
      case 'all':
      default:
        return { start: undefined, end: undefined };
    }
  };

  const handleSummarize = () => {
    const { start, end } = calculateTimeRange();
    const prompt = customPrompt.trim() || undefined;

    // 验证：如果选择了指定用户模式，必须至少选择一个用户
    if (participantMode === 'selected' && (!selectedParticipants || selectedParticipants.length === 0)) {
      alert('请至少选择一个用户进行总结');
      return;
    }

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

    onSummarize(start, end, prompt, undefined, participantMode, selectedParticipants);
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
        alignItems: 'stretch',
        justifyContent: 'flex-end',
        backgroundColor: 'transparent',
        pointerEvents: 'none', // 允许点击穿透到后面的内容
      }}
    >
      <div
        className="bg-slate-800 shadow-2xl w-full flex flex-col animate-slide-in-right"
        style={{
          maxWidth: '48rem',
          height: '100vh',
          pointerEvents: 'auto' // 恢复抽屉本身的点击事件
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
          {/* 如果有总结结果，显示结果 */}
          {summaryResult ? (
            <div className="space-y-4">
              <SummaryResultDisplay
                result={summaryResult}
                onClose={() => {/* 不需要单独关闭，由外部控制 */}}
                onJumpToMessage={onJumpToMessage || (() => {})}
                embedded={true}
              />
            </div>
          ) : (
            <>
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
            <h3 className="text-sm font-medium text-white">选择总结时间范围</h3>

            <select
              value={timeRangeOption}
              onChange={(e) => setTimeRangeOption(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading}
            >
              <option value="all">全部时间</option>
              <option value="today">今天</option>
              <option value="last3days">近3天</option>
              <option value="last7days">近7天</option>
              <option value="custom">自定义</option>
            </select>

            {/* 自定义时间范围 */}
            {timeRangeOption === 'custom' && (
              <div className="space-y-3 pl-4 border-l-2 border-purple-500">
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
                    清除自定义时间
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 参与者选择 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white">选择总结的参与者</h3>

            <div className="space-y-3">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="participantMode"
                    value="all"
                    checked={participantMode === 'all'}
                    onChange={() => setParticipantMode('all')}
                    disabled={isLoading}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-white text-sm">全部人</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="participantMode"
                    value="selected"
                    checked={participantMode === 'selected'}
                    onChange={() => setParticipantMode('selected')}
                    disabled={isLoading}
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-white text-sm">指定用户</span>
                </label>
              </div>

              {/* 多选参与者 */}
              {participantMode === 'selected' && (
                <div className="pl-4 border-l-2 border-purple-500 space-y-2">
                  <p className="text-xs text-slate-400 mb-2">
                    选择要总结的用户（至少选择一个）：
                  </p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {participants.map(participant => (
                      <label key={participant} className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/30 px-2 py-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedParticipants.includes(participant)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedParticipants(prev => [...prev, participant]);
                            } else {
                              setSelectedParticipants(prev => prev.filter(p => p !== participant));
                            }
                          }}
                          disabled={isLoading}
                          className="w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                        />
                        <span className="text-white text-sm">{participant}</span>
                      </label>
                    ))}
                  </div>

                  {selectedParticipants.length > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-slate-600">
                      <span className="text-xs text-slate-400">
                        已选择 {selectedParticipants.length} 人
                      </span>
                      <button
                        onClick={() => setSelectedParticipants([])}
                        className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                        disabled={isLoading}
                      >
                        清除选择
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-slate-400">
              💡 选择"全部人"会总结核心话题；选择"指定用户"会按用户分别总结相关话题。
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
          </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}

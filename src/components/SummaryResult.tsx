import { X, Users, MessageSquare, Calendar, Tag } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import { SummaryResult } from '../services/aiSummary';

interface SummaryResultProps {
  result: SummaryResult;
  onClose: () => void;
  onJumpToMessage?: (messageIds: string[]) => void; // 点击总结句子时跳转到对应消息
}

export function SummaryResultDisplay({ result, onClose, onJumpToMessage }: SummaryResultProps) {
  console.log('📊 SummaryResult - 结构化总结:', result.structuredSummary);
  console.log('📊 SummaryResult - 是否可跳转:', !!onJumpToMessage);

  const formatDate = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 格式化AI总结内容，支持Markdown语法
  const formatSummary = (text: string): string => {
    return text
      // 标题格式化
      .replace(/^### (.+)$/gm, '<h4 class="text-white font-semibold text-base mt-4 mb-2">$1</h4>')
      .replace(/^## (.+)$/gm, '<h3 class="text-white font-semibold text-lg mt-5 mb-3">$1</h3>')
      .replace(/^# (.+)$/gm, '<h2 class="text-white font-bold text-xl mt-6 mb-3">$1</h2>')
      // 粗体
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
      // 无序列表
      .replace(/^[\-\*] (.+)$/gm, '<li class="ml-6 list-disc text-slate-300">$1</li>')
      // 有序列表
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-6 list-decimal text-slate-300">$2</li>')
      // 代码块
      .replace(/`([^`]+)`/g, '<code class="bg-slate-900 px-2 py-1 rounded text-blue-300 text-sm">$1</code>')
      // 换行符转换
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
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
    >
      <div
        className="bg-slate-800 rounded-lg shadow-2xl w-full flex flex-col"
        style={{
          maxWidth: '48rem',
          maxHeight: '90vh'
        }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">AI聊天总结结果</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 - 可滚动 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 统计信息卡片 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <MessageSquare className="w-4 h-4" />
                <span className="text-sm">消息数量</span>
              </div>
              <div className="text-2xl font-bold text-white">{result.messageCount}</div>
            </div>

            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-sm">参与人数</span>
              </div>
              <div className="text-2xl font-bold text-white">{result.participants.length}</div>
            </div>
          </div>

          {/* 时间范围 */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-3">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">时间范围</span>
            </div>
            <div className="text-white text-sm space-y-1">
              <div>开始：{formatDate(result.timeRange.start)}</div>
              <div>结束：{formatDate(result.timeRange.end)}</div>
            </div>
          </div>

          {/* 参与者列表 */}
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-slate-400 mb-3">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">参与者发言统计</span>
            </div>
            <div className="space-y-2">
              {result.participants.map((participant, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-white">{participant.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-slate-600 rounded-full overflow-hidden w-24">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${(participant.messageCount / result.messageCount) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-slate-400 text-sm w-12 text-right">
                      {participant.messageCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 关键词 */}
          {result.keywords.length > 0 && (
            <div className="bg-slate-700/50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 mb-3">
                <Tag className="w-4 h-4" />
                <span className="text-sm font-medium">关键词</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-full text-sm"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI总结内容 */}
          <div className="bg-slate-700/50 rounded-lg p-6">
            <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              AI总结
              {result.structuredSummary && onJumpToMessage && (
                <span className="text-xs text-slate-400 font-normal ml-2">
                  （点击句子可跳转到对应消息）
                </span>
              )}
            </h3>
            <div className="prose prose-invert max-w-none">
              {result.structuredSummary && onJumpToMessage ? (
                // 使用结构化总结，每个句子可点击
                <div className="text-slate-300 text-sm leading-relaxed space-y-4">
                  {result.structuredSummary.map((sentence, index) => {
                    const hasRefs = sentence.messageIds.length > 0;
                    console.log(`📝 句子${index}: ${sentence.text.substring(0, 50)}... | 引用: ${sentence.messageIds.length}条消息`);

                    return (
                      <div
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('🖱️ 点击句子:', sentence.text.substring(0, 50));
                          if (hasRefs) {
                            console.log('🎯 跳转到消息:', sentence.messageIds);
                            onJumpToMessage(sentence.messageIds);
                          } else {
                            console.log('⚠️ 该句子没有引用消息');
                          }
                        }}
                        className={`${
                          hasRefs
                            ? 'cursor-pointer bg-slate-700/30 hover:bg-blue-600/30 border-l-4 border-blue-500/50 hover:border-blue-400 transition-all duration-200 rounded-r px-4 py-3 shadow-sm hover:shadow-md'
                            : 'px-2 py-2 opacity-60'
                        }`}
                        style={{
                          userSelect: hasRefs ? 'none' : 'text'
                        }}
                      >
                        {hasRefs && (
                          <div className="text-xs text-blue-400 mb-1 font-semibold">
                            💡 点击跳转到相关消息 ({sentence.messageIds.length}条)
                          </div>
                        )}
                        <div
                          dangerouslySetInnerHTML={{
                            __html: formatSummary(sentence.text),
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                // 使用原始总结文本
                <div
                  className="text-slate-300 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: formatSummary(result.summary),
                  }}
                />
              )}
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-slate-700 flex gap-3">
          <Button
            onClick={() => {
              // 复制总结到剪贴板
              navigator.clipboard.writeText(result.summary);
              alert('总结已复制到剪贴板');
            }}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white"
          >
            复制总结
          </Button>
          <Button onClick={onClose} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
            关闭
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}

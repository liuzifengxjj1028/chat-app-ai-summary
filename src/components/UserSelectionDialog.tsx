import { X, User, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';

interface UserSelectionDialogProps {
  users: Array<{ name: string; messageCount: number }>;
  onSelect: (selectedUser: string) => void;
  onCancel: () => void;
}

export function UserSelectionDialog({ users, onSelect, onCancel }: UserSelectionDialogProps) {
  const [selectedUser, setSelectedUser] = useState<string>('');

  console.log('🎨 UserSelectionDialog 正在渲染，用户数量:', users.length);
  console.log('🎨 用户列表:', users);
  console.log('🎨 第一个用户:', users[0]);
  console.log('🎨 用户列表详细:', JSON.stringify(users, null, 2));

  useEffect(() => {
    // 阻止背景滚动
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleConfirm = () => {
    if (selectedUser) {
      onSelect(selectedUser);
    }
  };

  const dialogContent = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        backdropFilter: 'blur(4px)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
      onClick={(e) => {
        // 点击背景关闭
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="bg-slate-800 rounded-lg shadow-2xl max-w-md w-full border-4 border-blue-500"
        style={{
          zIndex: 1000000,
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">选择当前用户视角</h2>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-6 space-y-4">
          <p className="text-slate-400 text-sm">
            已从聊天记录中检测到 {users.length} 位用户，请选择一位作为"你"的视角：
          </p>

          {/* 用户列表 */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users.map((user, index) => (
              <div
                key={index}
                onClick={() => setSelectedUser(user.name)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                  selectedUser === user.name
                    ? 'bg-blue-600 ring-2 ring-blue-400'
                    : 'bg-slate-700 hover:bg-slate-600'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    selectedUser === user.name ? 'bg-blue-500' : 'bg-slate-600'
                  }`}
                >
                  <User className="w-5 h-5 text-white" />
                </div>

                <div className="flex-1">
                  <div className="text-white font-medium">{user.name}</div>
                  <div className="text-sm text-slate-300">
                    发送了 {user.messageCount} 条消息
                  </div>
                </div>

                {selectedUser === user.name && (
                  <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 提示信息 */}
          <div className="bg-slate-700/50 rounded-lg p-3">
            <p className="text-xs text-slate-400">
              💡 选择的用户视角将影响消息气泡的显示方式：
            </p>
            <ul className="text-xs text-slate-400 mt-2 space-y-1 ml-4">
              <li>• 选中用户的消息将显示在<span className="text-blue-400">右侧（蓝色）</span></li>
              <li>• 其他用户的消息将显示在<span className="text-slate-300">左侧（灰色）</span></li>
            </ul>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t border-slate-700 flex gap-3">
          <Button
            onClick={onCancel}
            className="flex-1 bg-slate-600 hover:bg-slate-500 text-white"
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedUser}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认
          </Button>
        </div>
      </div>
    </div>
  );

  // 使用 Portal 渲染到 body 顶层
  return createPortal(dialogContent, document.body);
}

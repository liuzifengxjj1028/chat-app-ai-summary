import { useState, useEffect, useRef } from 'react';
import { LogOut } from 'lucide-react';
import { WeatherCard } from './components/WeatherCard';
import { ContactList } from './components/ContactList';
import { ChatWindow } from './components/ChatWindow';
import { MessageInput } from './components/MessageInput';
import { Button } from './components/ui/button';
import { ScrollArea } from './components/ui/scroll-area';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Input } from './components/ui/input';
import { wsService, Message, Contact } from './services/websocket';
import { fileUploadService, FileUploadProgress } from './services/fileUpload';
import { ChatParser, ParsedMessage } from './services/chatParser';
import { TextChatParser } from './services/textChatParser';
import { ImportOptionsDialog } from './components/ImportOptionsDialog';
import { AISummaryDialog } from './components/AISummaryDialog';
import { SummaryResultDisplay } from './components/SummaryResult';
import { AISummaryService, SummaryResult } from './services/aiSummary';
import { UserSelectionDialog } from './components/UserSelectionDialog';

export default function App() {
  // 检查是否有保存的用户名
  const savedUsername = localStorage.getItem('chatUsername');
  const [isInitializing, setIsInitializing] = useState(!!savedUsername);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const messageHandlerRef = useRef<((data: any) => void) | null>(null);
  // 存储所有联系人的消息历史 {contactId: Message[]}
  const conversationsRef = useRef<Record<string, Message[]>>({});

  // 模拟群聊AI总结的特殊联系人ID
  const GROUP_CHAT_SUMMARY_ID = '__group_chat_summary__';

  // 群聊相关状态
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null);
  const groupChatMessagesRef = useRef<ParsedMessage[]>([]); // 存储原始的ParsedMessage，用于AI总结
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [selectedPerspective, setSelectedPerspective] = useState<string>(''); // 选中的用户视角
  const [participants, setParticipants] = useState<Array<{ name: string; messageCount: number }>>([]); // 群聊参与者列表
  const [highlightMessageIds, setHighlightMessageIds] = useState<string[]>([]); // 需要高亮的消息ID

  // 初始化 WebSocket 连接和自动登录
  useEffect(() => {
    // 动态构建WebSocket URL
    // 开发环境：使用localhost:8080
    // 生产环境：使用当前域名
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isDev = window.location.port === '3000' || window.location.port === '3001'; // Vite开发服务器在3000或3001端口
    const host = isDev ? 'localhost:8080' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    console.log('🔌 连接到WebSocket:', wsUrl);

    // 连接到 WebSocket 服务器
    wsService.connect(wsUrl)
      .then(() => {
        console.log('WebSocket 连接成功');

        // 检查是否有保存的用户名，自动登录
        const savedUsername = localStorage.getItem('chatUsername');
        if (savedUsername) {
          console.log('检测到已保存的用户名，自动登录:', savedUsername);
          setNicknameInput(savedUsername);
          wsService.register(savedUsername);
        } else {
          // 没有保存的用户名，结束初始化状态
          setIsInitializing(false);
        }
      })
      .catch((error) => {
        console.error('WebSocket 连接失败:', error);
        setErrorMsg('无法连接到服务器，请确保后端服务正在运行');
        setIsInitializing(false);
      });

    // 清理函数
    return () => {
      wsService.disconnect();
    };
  }, []);

  // 设置消息处理器
  useEffect(() => {
    const handleMessage = (data: any) => {
      console.log('处理消息:', data);

      switch (data.type) {
        case 'register_success':
          // 注册成功
          setIsLoggedIn(true);
          setUsername(data.username);
          setErrorMsg('');
          setIsInitializing(false); // 结束初始化状态

          // 保存用户名到 localStorage 以便下次自动登录
          localStorage.setItem('chatUsername', data.username);
          console.log('用户名已保存到 localStorage');

          // 处理用户列表（register_success 消息中包含用户列表）
          if (data.users && Array.isArray(data.users)) {
            const userContacts: Contact[] = data.users
              .filter((user: string) => user !== data.username && user !== 'AI总结Bot')
              .map((user: string) => ({
                id: user,
                name: user,
                type: 'user' as const,
                online: true,
              }));

            // 在最前面添加"模拟群聊AI总结"特殊联系人
            const allContacts: Contact[] = [
              {
                id: GROUP_CHAT_SUMMARY_ID,
                name: '模拟群聊AI总结',
                type: 'group' as const,
                online: true,
              },
              ...userContacts,
            ];

            setContacts(allContacts);
            console.log('用户列表已更新:', allContacts);
          }
          break;

        case 'register_error':
          // 注册失败
          setErrorMsg(data.message || '注册失败');
          setIsInitializing(false); // 结束初始化状态
          // 如果是自动登录失败，清除保存的用户名
          localStorage.removeItem('chatUsername');
          break;

        case 'user_list':
          // 更新用户列表
          const userContactsList: Contact[] = data.users
            .filter((user: string) => user !== username && user !== 'AI总结Bot')
            .map((user: string) => ({
              id: user,
              name: user,
              type: 'user' as const,
              online: true,
            }));

          // 在最前面添加"模拟群聊AI总结"特殊联系人
          const allContactsList: Contact[] = [
            {
              id: GROUP_CHAT_SUMMARY_ID,
              name: '模拟群聊AI总结',
              type: 'group' as const,
              online: true,
            },
            ...userContactsList,
          ];

          setContacts(allContactsList);
          break;

        case 'new_message':
          // 收到新消息
          const newMsg: Message = {
            id: data.message_id || Date.now().toString(),
            sender: data.from,
            content: data.content,
            timestamp: new Date(data.timestamp).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isSelf: false,
            contentType: data.content_type || 'text',
            read: false,
            fileId: data.file_id,
            fileSize: data.file_size,
          };

          // 存储消息到对应的会话中
          const senderId = data.from;
          if (!conversationsRef.current[senderId]) {
            conversationsRef.current[senderId] = [];
          }
          conversationsRef.current[senderId].push(newMsg);

          // 如果正在和发送者聊天，更新显示的消息列表
          if (selectedContactId === senderId) {
            setMessages([...conversationsRef.current[senderId]]);
            // 自动标记为已读
            wsService.markAsRead(senderId, newMsg.id);
          }
          break;

        case 'message_sent':
        case 'send_success':
          // 自己发送的消息确认
          const sentMsg: Message = {
            id: data.message_id || Date.now().toString(),
            sender: username,
            content: data.content,
            timestamp: new Date(data.timestamp).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isSelf: true,
            contentType: data.content_type || 'text',
            read: false,
          };
          setMessages((prev) => [...prev, sentMsg]);
          console.log('自己发送的消息已添加到列表:', sentMsg);
          break;

        case 'history_message':
          // 历史消息
          const historyMsg: Message = {
            id: data.message_id || Date.now().toString(),
            sender: data.from,
            content: data.content,
            timestamp: new Date(data.timestamp).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isSelf: data.from === username,
            contentType: data.content_type || 'text',
            read: data.read || false,
          };

          // 确定这条历史消息属于哪个会话
          const otherUser = data.from === username ? data.to : data.from;
          if (!conversationsRef.current[otherUser]) {
            conversationsRef.current[otherUser] = [];
          }
          conversationsRef.current[otherUser].push(historyMsg);

          // 如果正在和这个联系人聊天，更新显示的消息列表
          if (selectedContactId === otherUser) {
            setMessages([...conversationsRef.current[otherUser]]);
          }
          break;

        case 'message_read':
          // 消息已读回执
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.message_id ? { ...msg, read: true } : msg
            )
          );
          break;

        case 'user_online':
          // 用户上线
          setContacts((prev) => {
            const existingContact = prev.find((c) => c.id === data.username);
            if (existingContact) {
              // 更新现有联系人的在线状态
              return prev.map((c) =>
                c.id === data.username ? { ...c, online: true } : c
              );
            } else {
              // 添加新的联系人（过滤掉机器人和自己）
              if (data.username !== username && data.username !== 'AI总结Bot') {
                return [
                  ...prev,
                  {
                    id: data.username,
                    name: data.username,
                    type: 'user' as const,
                    online: true,
                  },
                ];
              }
              return prev;
            }
          });
          console.log('用户上线:', data.username);
          break;

        case 'user_offline':
          // 用户离线
          setContacts((prev) =>
            prev.map((c) =>
              c.id === data.username ? { ...c, online: false } : c
            )
          );
          console.log('用户离线:', data.username);
          break;

        case 'file_upload_success':
          // 文件上传成功，添加到会话记录
          if (selectedContactId) {
            const fileMsg: Message = {
              id: data.messageId,
              sender: username,
              content: data.filename || '文件',
              timestamp: new Date().toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
              isSelf: true,
              contentType: 'file',
              read: false,
              fileId: data.fileId,
              fileSize: data.fileSize,
            };

            // 存储到会话历史
            if (!conversationsRef.current[selectedContactId]) {
              conversationsRef.current[selectedContactId] = [];
            }
            conversationsRef.current[selectedContactId].push(fileMsg);

            // 更新显示
            setMessages([...conversationsRef.current[selectedContactId]]);
          }
          break;

        default:
          console.log('未处理的消息类型:', data.type);
      }
    };

    messageHandlerRef.current = handleMessage;
    wsService.onMessage(handleMessage);

    return () => {
      if (messageHandlerRef.current) {
        wsService.removeMessageHandler(messageHandlerRef.current);
      }
    };
  }, [username, selectedContactId]);

  // 处理登录
  const handleLogin = () => {
    if (!nicknameInput.trim()) {
      setErrorMsg('请输入昵称');
      return;
    }

    if (!wsService.isConnected()) {
      setErrorMsg('WebSocket 未连接，请刷新页面重试');
      return;
    }

    wsService.register(nicknameInput.trim());
  };

  // 处理退出登录
  const handleLogout = () => {
    // 清除 localStorage 中的用户名
    localStorage.removeItem('chatUsername');
    console.log('已清除保存的用户名');

    // 重置状态
    setIsLoggedIn(false);
    setUsername('');
    setNicknameInput('');
    setSelectedContactId(undefined);
    setMessages([]);
    setContacts([]);
    conversationsRef.current = {};

    // 断开 WebSocket 连接并重新连接
    wsService.disconnect();

    // 动态构建WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const isDev = window.location.port === '3000'; // Vite开发服务器在3000端口
    const host = isDev ? 'localhost:8080' : window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    wsService.connect(wsUrl).catch((error) => {
      console.error('重新连接失败:', error);
    });
  };

  // 处理群聊记录导入（文件）
  const handleGroupChatImport = async (file: File) => {
    try {
      console.log('开始解析聊天记录文件:', file.name);

      // 解析聊天记录
      const parsedMessages = await ChatParser.parseFile(file);
      console.log('解析完成，共', parsedMessages.length, '条消息');

      processImportedMessages(parsedMessages);
    } catch (error) {
      console.error('聊天记录解析失败:', error);
      alert(`聊天记录解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 处理群聊记录导入（文本）
  const handleTextChatImport = (text: string, images: Array<{ id: string; base64: string }> = []) => {
    try {
      console.log('开始解析文本聊天记录，长度:', text.length, ', 图片数量:', images.length);

      // 使用TextChatParser解析
      const parsedMessages = TextChatParser.parseText(text, images);
      console.log('解析完成，共', parsedMessages.length, '条消息');

      if (parsedMessages.length === 0) {
        alert('未能解析出任何消息。\n\n支持的格式示例：\n1. 用户名 2024年10月23日 14:30\n2. 用户名\\n2024年10月23日 14:30\n\n请检查您的文本是否包含日期时间信息。\n\n提示：您也可以尝试使用PDF导入或JSON导入功能。');
        return;
      }

      processImportedMessages(parsedMessages);
    } catch (error) {
      console.error('文本解析失败:', error);
      alert(`文本解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 处理导入的消息（文件或文本）
  const processImportedMessages = (parsedMessages: ParsedMessage[]) => {
    // 保存原始的ParsedMessage，用于AI总结
    groupChatMessagesRef.current = parsedMessages;

    // 提取所有参与者及其消息数量
    const senderCount = new Map<string, number>();
    parsedMessages.forEach((msg) => {
      senderCount.set(msg.sender, (senderCount.get(msg.sender) || 0) + 1);
    });

    const participantsList = Array.from(senderCount.entries())
      .map(([name, messageCount]) => ({ name, messageCount }))
      .sort((a, b) => b.messageCount - a.messageCount); // 按消息数量降序排序

    console.log('检测到参与者:', participantsList);

    // 保存参与者列表
    setParticipants(participantsList);

    // 显示用户选择对话框
    setShowUserSelection(true);
    console.log('设置 showUserSelection 为 true');
  };

  // 处理用户视角选择
  const handleUserPerspectiveSelect = (selectedUser: string) => {
    console.log('用户选择视角:', selectedUser);

    setSelectedPerspective(selectedUser);

    // 转换为Message格式，根据选择的用户视角设置isSelf
    const groupMessages: Message[] = groupChatMessagesRef.current.map((msg) => ({
      id: msg.id,
      sender: msg.sender,
      content: msg.content,
      timestamp: msg.timestamp,
      isSelf: msg.sender === selectedUser, // 选中用户的消息标记为"自己"
      contentType: 'text',
      read: true,
    }));

    // 存储到群聊会话中
    conversationsRef.current[GROUP_CHAT_SUMMARY_ID] = groupMessages;

    // 如果当前选中的是群聊，更新显示
    if (selectedContactId === GROUP_CHAT_SUMMARY_ID) {
      setMessages([...groupMessages]);
    }

    // 关闭对话框并清理
    setShowUserSelection(false);
    setParticipants([]);

    console.log('群聊记录已加载到界面，视角:', selectedUser);
  };

  // 处理AI总结
  const handleAISummarize = async (startTime?: Date, endTime?: Date, customPrompt?: string, currentUser?: string, participantMode?: 'all' | 'selected', selectedParticipants?: string[]) => {
    try {
      console.log('开始生成AI总结...');
      console.log('自定义prompt:', customPrompt || '(使用默认)');
      console.log('当前用户视角:', currentUser || '(未选择)');
      console.log('参与者模式:', participantMode);
      console.log('选择的参与者:', selectedParticipants);

      // 调用AI服务生成总结
      const result = await AISummaryService.generateSummary(
        groupChatMessagesRef.current,
        startTime,
        endTime,
        customPrompt,
        currentUser,
        participantMode,
        selectedParticipants
      );

      console.log('AI总结生成成功');

      // 显示总结结果
      setSummaryResult(result);
      // 不再自动关闭对话框，保持抽屉打开状态
      // setShowSummaryDialog(false);
    } catch (error) {
      console.error('AI总结生成失败:', error);
      alert(`AI总结生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
      // 出错时也不关闭对话框，让用户可以重试
      // setShowSummaryDialog(false);
    }
  };

  // 处理从AI总结跳转到消息
  const handleJumpToMessage = (messageIds: string[]) => {
    console.log('跳转到消息:', messageIds);

    // 不再关闭总结对话框，保持抽屉打开显示总结结果
    // setSummaryResult(null);

    // 切换到群聊视图（如果不在）
    if (selectedContactId !== GROUP_CHAT_SUMMARY_ID) {
      setSelectedContactId(GROUP_CHAT_SUMMARY_ID);
      const groupMessages = conversationsRef.current[GROUP_CHAT_SUMMARY_ID] || [];
      setMessages([...groupMessages]);
    }

    // 设置高亮消息ID，触发ChatWindow滚动和闪烁
    setHighlightMessageIds(messageIds);

    // 3秒后清除高亮
    setTimeout(() => {
      setHighlightMessageIds([]);
    }, 3000);
  };

  // 处理文件上传
  const handleFileSelect = async (file: File) => {
    if (!selectedContactId) {
      console.warn('没有选中联系人，无法发送文件');
      return;
    }

    console.log('准备上传文件:', file.name, '大小:', file.size, '到:', selectedContactId);

    // 开始上传（不立即显示消息，等服务器确认后再显示）
    try {
      await fileUploadService.uploadFile(file, selectedContactId, (progress: FileUploadProgress) => {
        console.log('上传进度:', progress);
        // TODO: 可以在这里显示上传进度条
      });

      console.log('文件上传成功');
    } catch (error) {
      console.error('文件上传失败:', error);
      // TODO: 显示错误提示
    }
  };

  // 处理发送消息
  const handleSendMessage = (content: string) => {
    console.log('handleSendMessage 被调用:', { content, selectedContactId });

    if (!selectedContactId) {
      console.warn('没有选中联系人，无法发送消息');
      return;
    }

    console.log('发送消息到:', selectedContactId, '内容:', content);

    // 立即显示消息（乐观更新）
    const newMessage: Message = {
      id: Date.now().toString(),
      sender: username,
      content: content,
      timestamp: new Date().toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isSelf: true,
      contentType: 'text',
      read: false,
    };

    // 存储到会话历史
    if (!conversationsRef.current[selectedContactId]) {
      conversationsRef.current[selectedContactId] = [];
    }
    conversationsRef.current[selectedContactId].push(newMessage);

    // 更新显示的消息列表（从conversationsRef读取确保一致性）
    setMessages([...conversationsRef.current[selectedContactId]]);
    console.log('消息已添加到界面:', newMessage);

    // 发送到服务器
    wsService.sendMessage(selectedContactId, content);
  };

  // 处理选择联系人
  const handleSelectContact = (id: string) => {
    setSelectedContactId(id);
    // 加载该联系人的历史消息（创建副本避免引用问题）
    const history = conversationsRef.current[id] || [];
    setMessages([...history]);
    console.log(`切换到联系人 ${id}，加载了 ${history.length} 条历史消息`);
  };

  const selectedContact = contacts.find((c) => c.id === selectedContactId);

  // 初始化加载状态
  if (isInitializing) {
    return (
      <div className="size-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="bg-white rounded-lg p-8 shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-600">正在登录...</p>
          </div>
        </div>
      </div>
    );
  }

  // 登录界面
  if (!isLoggedIn) {
    return (
      <div className="size-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
        <div className="bg-white rounded-lg p-8 shadow-2xl max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            实时聊天应用
          </h1>
          <div className="space-y-4">
            <Input
              type="text"
              placeholder="请输入昵称"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full"
            />
            {errorMsg && (
              <p className="text-red-500 text-sm text-center">{errorMsg}</p>
            )}
            <Button onClick={handleLogin} className="w-full">
              进入聊天室
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 聊天界面
  return (
    <>
      <div className="size-full flex bg-slate-900">
        {/* 左侧边栏 */}
        <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
          <div className="p-4 border-b border-slate-700">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-slate-600 text-white">
                  {username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-white">{username}</div>
                <div className="text-slate-400 text-sm">在线</div>
              </div>
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-white transition-colors"
                title="退出登录"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <WeatherCard />
            <ContactList
              contacts={contacts}
              selectedId={selectedContactId}
              onSelectContact={handleSelectContact}
            />
          </ScrollArea>
        </div>

        {/* 右侧聊天区域 */}
        <div className="flex-1 flex flex-col">
          {/* 顶部标题栏 */}
          <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6">
            <div className="text-white">
              {selectedContact ? selectedContact.name : '选择一个联系人开始聊天'}
            </div>
            {/* 群聊模式下显示AI总结按钮，其他情况显示原按钮 */}
            {selectedContactId === GROUP_CHAT_SUMMARY_ID && messages.length > 0 ? (
              <Button
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={() => {
                  console.log('🟣 点击了AI聊天总结按钮');
                  console.log('🟣 当前消息数量:', messages.length);
                  console.log('🟣 groupChatMessagesRef.current 长度:', groupChatMessagesRef.current.length);
                  console.log('🟣 设置 showSummaryDialog 为 true');
                  setShowSummaryDialog(true);
                }}
              >
                AI聊天总结
              </Button>
            ) : (
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                + AI聊天无痕
              </Button>
            )}
          </div>

          {/* 聊天窗口 */}
          <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden">
            {/* 如果选中的是群聊AI总结且还没有消息，显示导入界面 */}
            {selectedContactId === GROUP_CHAT_SUMMARY_ID && messages.length === 0 ? (
              <ImportOptionsDialog
                onTextImport={handleTextChatImport}
              />
            ) : (
              <>
                <ChatWindow
                  messages={messages}
                  contactName={selectedContact?.name}
                  isGroupChat={selectedContactId === GROUP_CHAT_SUMMARY_ID}
                  highlightMessageIds={highlightMessageIds}
                />

                {/* 消息输入 - 群聊模式下禁用 */}
                <MessageInput
                  onSendMessage={handleSendMessage}
                  onFileSelect={handleFileSelect}
                  disabled={!selectedContactId || selectedContactId === GROUP_CHAT_SUMMARY_ID}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* AI总结对话框（右侧抽屉） */}
      {showSummaryDialog && (
        <AISummaryDialog
          messages={groupChatMessagesRef.current}
          onClose={() => {
            setShowSummaryDialog(false);
            setSummaryResult(null); // 关闭时清除总结结果
          }}
          onSummarize={handleAISummarize}
          summaryResult={summaryResult}
          onJumpToMessage={handleJumpToMessage}
        />
      )}

      {/* 用户视角选择对话框 */}
      {showUserSelection && (
        <UserSelectionDialog
          users={participants}
          onSelect={handleUserPerspectiveSelect}
          onCancel={() => {
            setShowUserSelection(false);
            setParticipants([]);
          }}
        />
      )}
    </>
  );
}

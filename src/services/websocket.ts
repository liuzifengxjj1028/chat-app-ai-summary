/**
 * WebSocket 客户端服务
 * 连接到 realtime-chat-app 的 Python 后端
 */

export interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isSelf: boolean;
  contentType?: 'text' | 'image' | 'file';
  read?: boolean;
  fileId?: string;
  fileSize?: number;
}

export interface Contact {
  id: string;
  name: string;
  type: 'user' | 'group';
  online?: boolean;
  count?: number;
}

type MessageHandler = (data: any) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private messageHandlers: MessageHandler[] = [];
  private currentUser: string | null = null;
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(serverUrl: string = 'ws://localhost:8080/ws'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(serverUrl);

        this.ws.onopen = () => {
          console.log('✅ WebSocket 已连接');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📩 收到消息:', data);
            this.handleMessage(data);
          } catch (error) {
            console.error('❌ 解析消息失败:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket 错误:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket 已断开');
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ 超过最大重连次数');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(() => {
        console.log('重连失败');
      });
    }, 3000 * this.reconnectAttempts);
  }

  private handleMessage(data: any) {
    this.messageHandlers.forEach(handler => handler(data));
  }

  onMessage(handler: MessageHandler) {
    this.messageHandlers.push(handler);
  }

  removeMessageHandler(handler: MessageHandler) {
    this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
  }

  // 注册用户
  register(username: string): void {
    this.currentUser = username;
    this.send({
      type: 'register',
      username: username,
    });
  }

  // 发送文本消息
  sendMessage(to: string, content: string, chatType: 'user' | 'group' = 'user'): void {
    const message = {
      type: chatType === 'group' ? 'send_group_message' : 'send_message',
      to: to,
      content: content,
      content_type: 'text',
      timestamp: new Date().toISOString(),
    };

    this.send(message);
  }

  // 发送图片消息
  sendImage(to: string, imageData: string, chatType: 'user' | 'group' = 'user'): void {
    const message = {
      type: chatType === 'group' ? 'send_group_message' : 'send_message',
      to: to,
      content: imageData,
      content_type: 'image',
      timestamp: new Date().toISOString(),
    };

    this.send(message);
  }

  // 标记消息为已读
  markAsRead(from: string, messageId: string): void {
    this.send({
      type: 'mark_as_read',
      from: from,
      message_id: messageId,
    });
  }

  // 创建群组
  createGroup(groupName: string, members: string[]): void {
    this.send({
      type: 'create_group',
      group_name: groupName,
      members: members,
    });
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      console.log('📤 发送消息:', data);
    } else {
      console.error('❌ WebSocket 未连接');
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.currentUser = null;
    this.messageHandlers = [];
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getCurrentUser(): string | null {
    return this.currentUser;
  }
}

// 导出单例
export const wsService = new WebSocketService();

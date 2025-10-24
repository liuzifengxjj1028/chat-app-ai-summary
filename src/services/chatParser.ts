import { PDFParser } from './pdfParser';
import { AIChatParser } from './aiChatParser';

export interface ParsedMessage {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  rawTimestamp?: Date;
  imageData?: string; // Base64 encoded image data
}

export class ChatParser {
  /**
   * 解析聊天记录文件
   */
  static async parseFile(file: File): Promise<ParsedMessage[]> {
    let text: string;

    // 如果是 PDF 文件，先提取文本
    if (PDFParser.isPDF(file)) {
      console.log('📄 检测到 PDF 文件，开始提取文本...');
      text = await PDFParser.extractText(file);

      // PDF文件优先使用Claude API解析
      console.log('🤖 使用Claude API智能解析PDF文本...');
      try {
        const result = await AIChatParser.parseWithAI(text);
        if (result.length > 0) {
          console.log('✅ AI解析成功，返回', result.length, '条消息');
          return result;
        }
        console.log('⚠️  AI解析未找到消息，使用传统方法');
      } catch (error) {
        console.error('❌ AI解析失败，使用传统方法:', error);
      }
    } else {
      text = await file.text();
    }

    // 根据文件扩展名判断格式
    if (file.name.endsWith('.json')) {
      return this.parseJSON(text);
    } else {
      return this.parseText(text);
    }
  }

  /**
   * 解析JSON格式的聊天记录
   */
  private static parseJSON(text: string): ParsedMessage[] {
    try {
      const data = JSON.parse(text);
      const messages = data.messages || data;

      if (!Array.isArray(messages)) {
        throw new Error('JSON格式错误：需要包含 messages 数组');
      }

      return messages.map((msg, index) => ({
        id: msg.id || `msg-${index}`,
        sender: msg.sender || msg.username || msg.from || '未知用户',
        content: msg.content || msg.message || msg.text || '',
        timestamp: this.formatTimestamp(msg.timestamp || msg.time || new Date().toISOString()),
        rawTimestamp: new Date(msg.timestamp || msg.time || Date.now()),
      }));
    } catch (error) {
      console.error('JSON解析失败:', error);
      throw new Error('JSON格式错误，请检查文件格式');
    }
  }

  /**
   * 解析文本格式的聊天记录
   * 格式：
   * 用户名 年份年月份月日份日 时:分
   * 消息内容
   */
  private static parseText(text: string): ParsedMessage[] {
    console.log('📝 原始文本长度:', text.length);
    console.log('📝 原始文本前500字符:', text.substring(0, 500));

    // 新策略：保留换行符，按行处理
    // PDF格式：
    // 行1: 用户名 YYYY年MM月DD日 HH:MM
    // 行2: 消息内容
    // 行3: 空行（可选）

    const rawLines = text.split('\n').map(line => line.trim()).filter(line => line);
    console.log('📝 总行数（去除空行后）:', rawLines.length);
    console.log('📝 前10行:');
    rawLines.slice(0, 10).forEach((line, i) => {
      console.log(`  第${i + 1}行: ${line.substring(0, 80)}`);
    });

    // 匹配 "用户名 YYYY年MM月DD日 HH:MM" 的模式
    // 注意：日期和时间之间可能有空格也可能没有
    const headerPattern = /^(.+?)\s+(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/;

    const lines: string[] = [];
    let i = 0;

    while (i < rawLines.length) {
      const line = rawLines[i];
      const match = line.match(headerPattern);

      if (match) {
        // 这是一个消息头：用户名 + 日期时间
        const username = match[1].trim();
        const year = match[2];
        const month = match[3];
        const day = match[4];
        const hour = match[5];
        const minute = match[6];

        // 下一行应该是消息内容
        i++;
        let content = '';
        if (i < rawLines.length) {
          const nextLine = rawLines[i];
          // 检查下一行是否也是消息头（避免误判）
          const nextMatch = nextLine.match(headerPattern);
          if (!nextMatch) {
            // 下一行不是消息头，是消息内容
            content = nextLine;
            i++; // 移动到下一行
          }
          // 如果下一行也是消息头，说明当前消息没有内容，不移动指针
        }

        // 组合成完整的消息行（用于后续parseLine处理）
        const fullMessage = `${username} ${year}年${month}月${day}日 ${hour}:${minute} ${content}`;
        lines.push(fullMessage);

        console.log(`✅ 解析消息头: 用户="${username}", 日期=${year}-${month}-${day} ${hour}:${minute}, 内容="${content.substring(0, 30)}..."`);
      } else {
        console.log(`⚠️  跳过非消息头行: ${line.substring(0, 50)}`);
        i++;
      }
    }

    console.log('📝 成功组装消息数:', lines.length);
    const messages: ParsedMessage[] = [];

    console.log('📝 开始解析组装好的消息，总数:', lines.length);
    console.log('📝 前3条完整消息:');
    lines.slice(0, 3).forEach((line, idx) => {
      console.log(`  消息${idx + 1}: ${line}`);
    });

    // 现在lines中的每一行都是完整的消息：用户名 日期时间 内容
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      console.log(`📋 正在解析消息${i + 1}:`, line.substring(0, 100));
      const parsed = this.parseLine(line, messages.length);

      if (parsed) {
        console.log(`✅ 解析成功: 用户="${parsed.sender}", 时间=${parsed.timestamp}, 内容="${parsed.content.substring(0, 30)}"`);
        messages.push(parsed);
      } else {
        console.log(`❌ 解析失败: ${line.substring(0, 100)}`);
      }
    }

    return messages;
  }

  /**
   * 解析单行聊天记录
   * 支持多种格式：
   * 1. 用户名 年份年月份月日份日 时:分 (例如：Bud 2025年9月23日 16:41)
   * 2. YYYY-MM-DD HH:MM:SS 用户名: 内容 (例如：2024-10-20 09:00:15 张三: 大家早上好！)
   * 3. 用户名 年份年月份月日份日 时:分 内容 (例如：Bud 2025年9月26日 20:00 看懂了...)
   */
  private static parseLine(line: string, index: number): ParsedMessage | null {
    console.log(`🔍 parseLine 输入 [index=${index}]:`, JSON.stringify(line));
    console.log(`🔍 行长度: ${line.length}, trimmed长度: ${line.trim().length}`);

    const trimmedLine = line.trim();

    // 格式1：用户名 年份年月份月日份日 时:分 (内容在下一行)
    const pattern1 = /^([^\s\d@]+)\s+(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/;
    const match1 = trimmedLine.match(pattern1);
    console.log('🔍 格式1匹配结果:', match1 ? '✅ 成功' : '❌ 失败');

    if (match1) {
      const sender = match1[1].trim();
      const year = match1[2];
      const month = match1[3].padStart(2, '0');
      const day = match1[4].padStart(2, '0');
      const hour = match1[5].padStart(2, '0');
      const minute = match1[6];

      const dateString = `${year}-${month}-${day}T${hour}:${minute}:00`;
      const rawTimestamp = new Date(dateString);
      const timestamp = `${hour}:${minute}`;

      return {
        id: `msg-${index}`,
        sender,
        content: '', // 内容在下一行
        timestamp,
        rawTimestamp,
      };
    }

    // 格式2：YYYY-MM-DD HH:MM:SS 用户名: 内容
    const pattern2 = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2}):(\d{2})\s+([^:]+):\s*(.*)$/;
    const match2 = trimmedLine.match(pattern2);
    console.log('🔍 格式2匹配结果:', match2 ? '✅ 成功' : '❌ 失败');

    if (match2) {
      const date = match2[1];
      const hour = match2[2];
      const minute = match2[3];
      const second = match2[4];
      const sender = match2[5].trim();
      const content = match2[6].trim();

      const dateString = `${date}T${hour}:${minute}:${second}`;
      const rawTimestamp = new Date(dateString);
      const timestamp = `${hour}:${minute}`;

      return {
        id: `msg-${index}`,
        sender,
        content, // 内容在同一行
        timestamp,
        rawTimestamp,
      };
    }

    // 格式3：用户名 年份年月份月日份日 时:分 内容 (内容在同一行，可选)
    // 用户名和日期之间的空格是可选的（\s*）
    // 日期和时间之间的空格是可选的（\s*）
    // 用户名部分：匹配任何字符，直到遇到4位年份数字
    const pattern3 = /^(.+?)\s*(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})(.*)$/;
    const match3 = trimmedLine.match(pattern3);
    console.log('🔍 格式3匹配结果:', match3 ? '✅ 成功' : '❌ 失败');

    if (match3) {
      console.log('🔍 格式3匹配详情:', {
        sender: match3[1],
        year: match3[2],
        month: match3[3],
        day: match3[4],
        hour: match3[5],
        minute: match3[6],
        content: match3[7]
      });

      const sender = match3[1].trim();
      const year = match3[2];
      const month = match3[3].padStart(2, '0');
      const day = match3[4].padStart(2, '0');
      const hour = match3[5].padStart(2, '0');
      const minute = match3[6];
      const content = match3[7].trim();

      const dateString = `${year}-${month}-${day}T${hour}:${minute}:00`;
      const rawTimestamp = new Date(dateString);
      const timestamp = `${hour}:${minute}`;

      return {
        id: `msg-${index}`,
        sender,
        content, // 内容在同一行（可能为空）
        timestamp,
        rawTimestamp,
      };
    }

    console.log('❌ 所有格式都不匹配');
    return null;
  }

  /**
   * 解析时间戳字符串为Date对象
   */
  private static parseTimestamp(timeStr: string): Date {
    // 处理不同的日期分隔符
    const normalized = timeStr.replace(/\//g, '-');

    try {
      const date = new Date(normalized);
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (error) {
      console.warn('时间戳解析失败:', timeStr);
    }

    return new Date();
  }

  /**
   * 格式化时间戳为显示格式
   */
  private static formatTimestamp(timeStr: string | Date): string {
    let date: Date;

    if (typeof timeStr === 'string') {
      date = this.parseTimestamp(timeStr);
    } else {
      date = timeStr;
    }

    // 格式化为 HH:MM
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * 按时间范围过滤消息
   */
  static filterByTimeRange(
    messages: ParsedMessage[],
    startTime?: Date,
    endTime?: Date
  ): ParsedMessage[] {
    return messages.filter((msg) => {
      if (!msg.rawTimestamp) return true;

      if (startTime && msg.rawTimestamp < startTime) return false;
      if (endTime && msg.rawTimestamp > endTime) return false;

      return true;
    });
  }

  /**
   * 获取消息的统计信息
   */
  static getStatistics(messages: ParsedMessage[]) {
    const senderCount = new Map<string, number>();

    messages.forEach((msg) => {
      senderCount.set(msg.sender, (senderCount.get(msg.sender) || 0) + 1);
    });

    const senders = Array.from(senderCount.entries())
      .map(([sender, count]) => ({ sender, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalMessages: messages.length,
      senders,
      timeRange: {
        start: messages[0]?.rawTimestamp,
        end: messages[messages.length - 1]?.rawTimestamp,
      },
    };
  }
}

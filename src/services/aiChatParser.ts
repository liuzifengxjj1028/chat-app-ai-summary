import { ParsedMessage } from './chatParser';

/**
 * 使用AI大模型解析聊天记录文本
 * 适用于格式混乱、难以用正则表达式解析的情况
 */
export class AIChatParser {
  /**
   * 使用Claude API解析聊天记录文本
   */
  static async parseWithAI(text: string, apiKey?: string): Promise<ParsedMessage[]> {
    console.log('🤖 使用Claude API解析聊天记录...');
    console.log('📝 文本长度:', text.length);

    try {
      // 从环境变量或参数获取API密钥
      const CLAUDE_API_KEY = apiKey || import.meta.env.VITE_CLAUDE_API_KEY;

      if (!CLAUDE_API_KEY) {
        console.warn('⚠️  未配置Claude API密钥，使用本地规则解析');
        return this.parseWithLocalRules(text);
      }

      // 构建提示词 - 根据你提供的PDF格式特征
      const prompt = `你是一个聊天记录解析专家。我有一份从PDF提取的飞书群聊记录，文本格式混乱，需要你帮我解析。

**PDF格式特征（根据截图）：**
1. 每条消息的格式：用户名 YYYY年MM月DD日 HH:MM
2. 用户名和日期时间在同一行（可能有空格分隔，也可能紧贴）
3. 消息内容可能在下一行，也可能跟在时间后面
4. 文本中有噪音：标题（如"XXX与XXX的会话"）、导航提示（如"查看原消息记录"）
5. 所有字符之间可能有不规则的空格

**你的任务：**
从以下文本中提取所有真实的聊天消息。只提取包含时间（HH:MM）的消息，忽略标题和噪音。

**输出格式：**
返回一个JSON数组，每个元素包含：
- sender: 用户名（只要人名，去掉前后的噪音文字）
- datetime: 日期时间，格式为 "YYYY-MM-DD HH:MM"
- content: 消息内容（如果没有内容就留空字符串）

**示例：**
输入文本："怡宝与dengteng的会话2025年10月9日查看原消息记录怡宝2025年10月9日20:32[会话记录]可大力2025年9月23日12:45@唐炜分组右边"

输出：
\`\`\`json
[
  {"sender": "怡宝", "datetime": "2025-10-09 20:32", "content": "[会话记录]"},
  {"sender": "可大力", "datetime": "2025-09-23 12:45", "content": "@唐炜分组右边"}
]
\`\`\`

**待解析文本：**
${text.substring(0, 8000)}

请只返回JSON数组，不要包含任何markdown代码块标记或其他文字。`;

      // 调用后端API代理（避免CORS问题）
      // 动态构建API URL，支持本地开发和生产环境
      const isDev = window.location.port === '3000';
      const origin = isDev ? 'http://localhost:8080' : window.location.origin;
      const response = await fetch(`${origin}/api/parse-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Claude API错误:', errorText);
        throw new Error(`Claude API调用失败: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('🤖 Claude API返回:', result);

      // 提取Claude的回复内容
      const claudeResponse = result.content[0].text;
      console.log('🤖 Claude解析结果:', claudeResponse);

      // 解析JSON
      let parsedData;
      try {
        // 去除可能的markdown代码块标记
        const cleanJson = claudeResponse
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();
        parsedData = JSON.parse(cleanJson);
      } catch (parseError) {
        console.error('❌ JSON解析失败:', parseError);
        console.error('原始响应:', claudeResponse);
        throw new Error('Claude返回的不是有效的JSON格式');
      }

      // 转换为ParsedMessage格式
      const messages: ParsedMessage[] = parsedData.map((msg: any, index: number) => {
        const datetime = new Date(msg.datetime.replace(' ', 'T'));
        const timeStr = msg.datetime.split(' ')[1]; // 提取 HH:MM

        return {
          id: `msg-${index}`,
          sender: msg.sender.trim(),
          content: msg.content || '',
          timestamp: timeStr,
          rawTimestamp: datetime,
        };
      });

      console.log('✅ Claude AI解析完成，共', messages.length, '条消息');
      return messages;
    } catch (error) {
      console.error('❌ Claude AI解析失败:', error);
      console.log('⚠️  回退到本地规则解析');
      return this.parseWithLocalRules(text);
    }
  }

  /**
   * 使用本地规则作为AI的备选方案
   * 当AI不可用时，使用简单的规则提取
   */
  static parseWithLocalRules(text: string): ParsedMessage[] {
    console.log('🔧 使用本地规则解析...');

    const messages: ParsedMessage[] = [];

    // 使用正则匹配所有日期时间模式
    const pattern = /([^\n]*?)(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})\s*([^\n]*?)(?=(?:[^\n]*?\d{4}年\d{1,2}月\d{1,2}日\s*\d{1,2}:\d{2})|$)/gs;

    let match;
    let index = 0;

    while ((match = pattern.exec(text)) !== null) {
      const possibleUsername = match[1].trim();
      const year = match[2];
      const month = match[3].padStart(2, '0');
      const day = match[4].padStart(2, '0');
      const hour = match[5].padStart(2, '0');
      const minute = match[6];
      const possibleContent = match[7].trim();

      // 从possibleUsername中提取真正的用户名（通常是最后几个字符）
      const usernameParts = possibleUsername.split(/\s{2,}/);
      const username = usernameParts[usernameParts.length - 1] || possibleUsername.substring(Math.max(0, possibleUsername.length - 20));

      // 清理用户名（移除标题文字）
      const cleanUsername = username
        .replace(/.*会话/, '')
        .replace(/查看原消息记录.*/, '')
        .replace(/可点击回到会话/, '')
        .trim();

      if (cleanUsername) {
        const dateString = `${year}-${month}-${day}T${hour}:${minute}:00`;
        const rawTimestamp = new Date(dateString);
        const timestamp = `${hour}:${minute}`;

        messages.push({
          id: `msg-${index++}`,
          sender: cleanUsername,
          content: possibleContent,
          timestamp,
          rawTimestamp,
        });

        console.log(`✅ 提取消息: ${cleanUsername} - ${timestamp} - ${possibleContent.substring(0, 20)}...`);
      }
    }

    console.log('✅ 本地规则解析完成，共', messages.length, '条消息');
    return messages;
  }
}

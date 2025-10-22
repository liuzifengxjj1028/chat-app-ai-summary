import { ParsedMessage, ChatParser } from './chatParser';

// 总结句子，包含对消息的引用
export interface SummarySentence {
  text: string; // 句子内容
  messageIds: string[]; // 引用的消息ID列表
}

export interface SummaryResult {
  summary: string; // 原始总结文本（用于复制等功能）
  structuredSummary?: SummarySentence[]; // 结构化总结，包含消息引用
  keywords: string[];
  participants: Array<{ name: string; messageCount: number }>;
  timeRange: { start: Date; end: Date };
  messageCount: number;
}

export class AISummaryService {
  /**
   * 生成聊天记录总结
   */
  static async generateSummary(
    messages: ParsedMessage[],
    startTime?: Date,
    endTime?: Date,
    customPrompt?: string
  ): Promise<SummaryResult> {
    // 如果指定了时间范围，则需要区分重点总结范围和上下文范围
    let focusMessages: ParsedMessage[];
    let contextMessages: ParsedMessage[];

    if (startTime || endTime) {
      // 按时间范围过滤消息 - 这是重点总结的范围
      focusMessages = ChatParser.filterByTimeRange(messages, startTime, endTime);

      if (focusMessages.length === 0) {
        throw new Error('选定时间范围内没有消息');
      }

      // 其他消息作为上下文
      contextMessages = messages.filter(msg => !focusMessages.includes(msg));
    } else {
      // 如果没有指定时间范围，所有消息都是重点
      focusMessages = messages;
      contextMessages = [];
    }

    // 获取统计信息（基于重点消息）
    const stats = ChatParser.getStatistics(focusMessages);

    // 构建用于AI的prompt
    const prompt = this.buildPrompt(focusMessages, contextMessages, customPrompt);

    // 调用AI API生成总结
    const rawSummary = await this.callAIAPI(prompt);
    console.log('🤖 AI原始响应:', rawSummary.substring(0, 200) + '...');

    // 尝试解析JSON格式的响应
    let summary = rawSummary;
    let structuredSummary: SummarySentence[] | undefined;

    try {
      // 尝试从响应中提取JSON（可能包含在```json...```代码块中）
      let jsonText = rawSummary;
      const jsonMatch = rawSummary.match(/```json\s*([\s\S]+?)\s*```/);
      if (jsonMatch) {
        console.log('📦 找到JSON代码块');
        jsonText = jsonMatch[1];
      } else {
        console.log('⚠️ 未找到JSON代码块，尝试直接解析');
      }

      const parsed = JSON.parse(jsonText);
      console.log('✅ JSON解析成功:', parsed);

      if (parsed.summary && parsed.sentences) {
        summary = parsed.summary;
        structuredSummary = parsed.sentences.map((sent: any, idx: number) => {
          const messageIds = (sent.refs || []).map((refIdx: number) => {
            const msg = focusMessages[refIdx];
            if (!msg) {
              console.warn(`⚠️ 句子${idx}引用了不存在的消息索引: ${refIdx}`);
              return '';
            }
            return msg.id;
          }).filter(Boolean);

          console.log(`📝 句子${idx}: "${sent.text.substring(0, 30)}..." -> ${messageIds.length}条消息`);
          return {
            text: sent.text,
            messageIds
          };
        });
        console.log('✅ 成功解析结构化总结，包含', structuredSummary.length, '个句子');
      } else {
        console.warn('⚠️ JSON缺少summary或sentences字段');
      }
    } catch (e) {
      console.warn('⚠️ 无法解析JSON格式总结，使用原始文本', e);
      console.log('原始内容:', rawSummary.substring(0, 500));
      // 如果解析失败，使用原始文本
    }

    // 提取关键词
    const keywords = this.extractKeywords(focusMessages);

    return {
      summary,
      structuredSummary,
      keywords,
      participants: stats.senders,
      timeRange: {
        start: stats.timeRange.start || new Date(),
        end: stats.timeRange.end || new Date(),
      },
      messageCount: focusMessages.length,
    };
  }

  /**
   * 构建AI提示词
   */
  private static buildPrompt(
    focusMessages: ParsedMessage[],
    contextMessages: ParsedMessage[] = [],
    customPrompt?: string
  ): string {
    // 格式化重点总结的消息，带上索引编号
    const focusText = focusMessages
      .map((msg, index) => `[${index}] ${msg.sender} (${msg.timestamp}): ${msg.content}`)
      .join('\n');

    // 构建prompt
    let prompt = '';

    // 如果有上下文消息，先提供上下文
    if (contextMessages.length > 0) {
      const contextText = contextMessages
        .map((msg) => `${msg.sender} (${msg.timestamp}): ${msg.content}`)
        .join('\n');

      prompt += `## 背景上下文（仅供参考，不需要详细总结）

以下是此次对话前后的其他消息，帮助你理解对话背景：

${contextText}

---

`;
    }

    // 添加重点总结部分
    prompt += `## 需要重点总结的对话

${focusText}

---

`;

    // 添加总结要求
    if (customPrompt) {
      // 如果用户提供了自定义prompt，使用用户的要求
      prompt += `## 总结要求

${customPrompt}

## 重要：返回格式要求

请以JSON格式返回总结结果，格式如下：
\`\`\`json
{
  "summary": "完整的总结文本（用于阅读和复制）",
  "sentences": [
    {
      "text": "总结的第一个句子或段落",
      "refs": [0, 1, 2]
    },
    {
      "text": "总结的第二个句子或段落",
      "refs": [3, 4]
    }
  ]
}
\`\`\`

其中：
- summary: 完整的markdown格式总结文本
- sentences: 拆分后的总结句子/段落数组
- text: 每个句子或段落的内容
- refs: 该句子引用的消息编号（对应消息前的[数字]）

注意：每个总结句子都必须标注它所依据的消息编号！`;
    } else {
      // 使用默认的总结要求 - "入群必读"风格
      prompt += `## 角色设定

你是一个专业的群聊历史记录员和总结者。请根据以上群聊历史记录，为刚加入群的新同事生成一份"入群必读"总结。

## 核心要求

1. **视角绝对客观：** 你是一个没有参与过任何讨论的第三方。避免使用"我们讨论了"、"有人提出"等带有参与感的词语。改用"记录显示"、"话题围绕"、"关键结论为"等中性表述。
2. **目的明确：** 目标是让新同事快速了解这个群的**核心话题**和**重要决策**，让他们知道发生了什么，以及他们需要知道什么。
3. **主题化组织：** 将讨论按主题归类，每个主题都应该是具体的、可定位的话题。

## 内容要求

识别并提取以下类型的主题：
- **功能开发与优化**：某个具体功能的设计、开发、改进讨论
- **问题解决**：某个具体问题的发现、分析、解决方案
- **决策制定**：需要做出选择的事项及最终决定
- **任务分配**：谁负责什么事情，截止时间等
- **资源共享**：重要文档、链接、工具等

每个主题包括：
- 简洁的标题（5-15字）
- 具体说明（30-80字）：讨论了什么、得出了什么结论或决定
- 相关的消息编号

${contextMessages.length > 0 ? '注意：可以参考背景上下文来更好地理解对话，但重点分析"需要重点总结的对话"部分。' : ''}

## ⚠️ 关键：返回格式要求

**你必须严格按照以下JSON格式返回，不要添加任何markdown代码块标记（\`\`\`json），直接返回纯JSON对象：**

{
  "summary": "群组简介：这个群建立的主要目的（例如：用于XX项目日常协调、部门信息同步等）",
  "sentences": [
    {
      "text": "**📋 历史话题-XX功能讨论**：记录显示，话题围绕XX功能的设计方案展开。一种观点认为应该采用A方案，理由是...；另一种建议是采用B方案，优势在于...。讨论聚焦于方案的可行性和实施难度。",
      "refs": [0, 1, 2, 5, 8]
    },
    {
      "text": "**📋 历史话题-YY问题分析**：话题围绕YY问题的原因分析。记录显示，问题表现为...，经过讨论确定可能的原因包括...和...，需要进一步验证。",
      "refs": [10, 12, 15]
    },
    {
      "text": "**✅ 关键决策-采用A方案**：最终确定选择A方案用于XX功能开发。关键结论为该方案在性能和可维护性上更有优势。此决策意味着后续开发将按照A方案的技术路线进行。",
      "refs": [18, 20, 22]
    },
    {
      "text": "**✅ 关键决策-项目时间节点**：最终确定项目将于X月X日正式启动，所有相关文档需在X月X日前归档。此决策对当前工作的影响是需要加快文档整理进度。",
      "refs": [25, 28]
    },
    {
      "text": "**🔄 进行中-功能开发任务**：目前正在推进XX功能的开发工作。记录显示，该任务由某成员负责，预计X月X日完成。需要新同事注意的是...。",
      "refs": [30, 32, 35]
    },
    {
      "text": "**🔄 进行中-待评审事项**：目前有YY设计方案等待评审，悬而未决的问题包括...。后续节点是...。",
      "refs": [38, 40]
    },
    {
      "text": "**📎 资源链接-项目文档**：历史讨论中提及的重要资源包括：[具体的文档名称、链接描述等]。",
      "refs": [45, 48]
    }
  ]
}

**结构说明：**
按照"入群必读"的五个部分组织，每个条目必须以特定前缀开头：
- **📋 历史话题-[主题名称]**：归类讨论的核心主题，用"一种观点认为..."、"另一种建议是..."等中性表述
- **✅ 关键决策-[决策名称]**：已拍板的决定，说明"最终确定..."、"此决策对当前工作的影响是..."
- **🔄 进行中-[事项名称]**：正在跟进的事情、待办事项、悬而未决的问题
- **📎 资源链接-[资源类型]**：提及的重要文档、文件夹、链接等

**关键要求：**
1. summary: 一句话说明群组目的（作为"一、群组简介与目标"）
2. sentences: 包含上述四类条目（历史话题2-4条、关键决策1-3条、进行中1-3条、资源链接0-2条）
3. text格式：必须以emoji前缀开头（📋/✅/🔄/📎）
4. refs: 该条目涉及的**所有**消息编号（尽可能完整）

**表述要求：**
- ✅ 历史话题用："记录显示"、"话题围绕"、"一种观点认为"、"另一种建议是"
- ✅ 关键决策用："最终确定"、"关键结论为"、"此决策对...的影响是"
- ✅ 进行中用："目前正在"、"记录显示"、"悬而未决的问题"、"后续节点"
- ❌ 避免："我们讨论了"、"有人提出"、"大家认为"

**最后提醒：直接返回纯JSON对象！不要添加\`\`\`json标记！不要添加任何解释文字！**`;
    }

    return prompt;
  }

  /**
   * 调用AI API - 通过后端代理调用 Claude API
   */
  private static async callAIAPI(prompt: string): Promise<string> {
    // 动态构建API URL，支持本地开发和生产环境
    // 开发环境：使用localhost:8080，生产环境：使用当前域名
    const isDev = window.location.port === '3000';
    const origin = isDev ? 'http://localhost:8080' : window.location.origin;
    const BACKEND_URL = `${origin}/api/summarize_chat`;

    try {
      console.log('🤖 通过后端调用 Claude API 生成总结...');

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_content: prompt,
          custom_prompt: '', // prompt 已经包含了所有内容
          users: [],
          start_date: '',
          end_date: '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ 后端API错误:', errorData);
        throw new Error(`后端API错误: ${response.status} - ${errorData.error || '未知错误'}`);
      }

      const data = await response.json();
      console.log('✅ Claude API 调用成功');

      return data.summary;
    } catch (error) {
      console.error('❌ AI API 调用失败:', error);
      // 如果 API 调用失败，回退到模拟总结
      console.log('⚠️ 回退到模拟总结');
      return this.generateMockSummary(prompt);
    }
  }

  /**
   * 生成模拟总结（用于测试）
   */
  private static generateMockSummary(prompt: string): string {
    // 从prompt中提取聊天记录部分
    const chatMatch = prompt.match(/聊天记录：\n([\s\S]+?)\n\n请提供/);
    const chatText = chatMatch ? chatMatch[1] : '';

    const lines = chatText.split('\n').filter((line) => line.trim());
    const messageCount = lines.length;

    // 提取所有发言人
    const speakers = new Set<string>();
    lines.forEach((line) => {
      const match = line.match(/^([^:：]+)[：:]/);
      if (match) {
        speakers.add(match[1].trim());
      }
    });

    return `## 对话总结

本次对话共有 ${messageCount} 条消息，参与者包括：${Array.from(speakers).join('、')}。

### 主要内容

对话围绕以下几个主题展开：

1. **核心议题**：参与者就多个话题进行了深入讨论，包括工作安排、项目进展、以及日常交流等内容。

2. **讨论要点**：
   - 各参与者积极分享了自己的观点和想法
   - 就某些具体问题达成了初步共识
   - 提出了一些待后续跟进的行动项

3. **互动情况**：对话氛围良好，参与者之间进行了有效的信息交流和意见沟通。

### 关键结论

通过本次对话，参与者对相关议题有了更清晰的认识，并为下一步行动奠定了基础。

---
*注：这是AI生成的模拟总结。要获得更准确的总结，请配置真实的AI API。*`;
  }

  /**
   * 提取关键词
   */
  private static extractKeywords(messages: ParsedMessage[]): string[] {
    // 简单的关键词提取逻辑
    // TODO: 使用更高级的NLP技术或AI API提取关键词

    const allText = messages.map((msg) => msg.content).join(' ');

    // 简单的中文分词和词频统计（这里只是演示，实际应使用专业的分词库）
    const words = allText.match(/[\u4e00-\u9fa5]{2,}/g) || [];

    const wordCount = new Map<string, number>();
    words.forEach((word) => {
      if (word.length >= 2) {
        // 过滤单字词
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });

    // 排序并取前10个高频词
    const sortedWords = Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    return sortedWords;
  }

  /**
   * 配置AI API密钥
   * TODO: 实现API密钥配置功能
   */
  static configureAPIKey(apiKey: string, provider: 'openai' | 'claude' | 'other') {
    // 存储API配置
    localStorage.setItem('ai_api_key', apiKey);
    localStorage.setItem('ai_provider', provider);
  }

  /**
   * 获取配置的API密钥
   */
  static getAPIConfig(): { apiKey: string | null; provider: string | null } {
    return {
      apiKey: localStorage.getItem('ai_api_key'),
      provider: localStorage.getItem('ai_provider'),
    };
  }
}

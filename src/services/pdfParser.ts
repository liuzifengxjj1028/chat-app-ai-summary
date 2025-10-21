import * as pdfjsLib from 'pdfjs-dist';

// 配置 PDF.js worker - 使用 npm 包中的 worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export class PDFParser {
  /**
   * 清理PDF提取的文本，移除中文字符之间的多余空格，并在消息分隔处添加换行
   */
  private static cleanPDFText(text: string): string {
    let cleaned = text;

    console.log('🧹 原始文本长度:', cleaned.length);
    console.log('🧹 原始文本样例:', cleaned.substring(0, 100));

    // 首先，规范化特殊Unicode字符为标准中文字符
    // PDF中的"⽉"(U+FA0A)、"⽇"(U+FA13)等是兼容字符，需要转换为标准字符
    cleaned = cleaned.replace(/⽉/g, '月');  // U+FA0A -> U+6708
    cleaned = cleaned.replace(/⽇/g, '日');  // U+FA13 -> U+65E5
    cleaned = cleaned.replace(/⼈/g, '人');  // 其他可能的兼容字符
    cleaned = cleaned.replace(/⼤/g, '大');
    cleaned = cleaned.replace(/⼯/g, '工');
    cleaned = cleaned.replace(/⼒/g, '力');
    cleaned = cleaned.replace(/⼾/g, '户');
    cleaned = cleaned.replace(/⽂/g, '文');
    cleaned = cleaned.replace(/⻚/g, '页');
    cleaned = cleaned.replace(/⾃/g, '自');
    cleaned = cleaned.replace(/⾏/g, '行');
    cleaned = cleaned.replace(/⾯/g, '面');
    cleaned = cleaned.replace(/⻜/g, '飞');
    cleaned = cleaned.replace(/⾬/g, '雨');
    cleaned = cleaned.replace(/⺠/g, '民');
    cleaned = cleaned.replace(/⾥/g, '里');
    cleaned = cleaned.replace(/⾼/g, '高');
    cleaned = cleaned.replace(/⾳/g, '音');
    cleaned = cleaned.replace(/⼀/g, '一');
    cleaned = cleaned.replace(/⼆/g, '二');
    cleaned = cleaned.replace(/⼊/g, '入');
    cleaned = cleaned.replace(/⼝/g, '口');
    cleaned = cleaned.replace(/⼏/g, '几');
    cleaned = cleaned.replace(/⼦/g, '子');
    cleaned = cleaned.replace(/⼿/g, '手');
    cleaned = cleaned.replace(/⽤/g, '用');
    cleaned = cleaned.replace(/⽣/g, '生');
    cleaned = cleaned.replace(/⼼/g, '心');
    cleaned = cleaned.replace(/⽅/g, '方');
    cleaned = cleaned.replace(/⽬/g, '目');
    cleaned = cleaned.replace(/⽴/g, '立');
    cleaned = cleaned.replace(/⻔/g, '门');
    cleaned = cleaned.replace(/⾒/g, '见');
    cleaned = cleaned.replace(/⼿/g, '手');
    cleaned = cleaned.replace(/⻓/g, '长');
    cleaned = cleaned.replace(/⻋/g, '车');
    cleaned = cleaned.replace(/⾔/g, '言');
    cleaned = cleaned.replace(/⻝/g, '食');
    cleaned = cleaned.replace(/⿊/g, '黑');
    cleaned = cleaned.replace(/⿏/g, '鼠');

    console.log('🧹 规范化后的文本样例:', cleaned.substring(0, 100));

    // 关键：不要移除所有空格！
    // 只移除明显多余的空格，保留可能是用户名和日期之间的空格
    // 具体策略：
    // 1. 移除中文字符之间的多个连续空格（保留单个空格）
    // 2. 移除数字和中文之间的空格（除非是年月日前）
    // 3. 保留可能是用户名结尾和年份开头之间的空格

    let prevLength = 0;
    while (cleaned.length !== prevLength) {
      prevLength = cleaned.length;
      // 只移除中文字符之间的多余空格（2个或以上变成1个）
      cleaned = cleaned.replace(/([\u4e00-\u9fa5])\s{2,}([\u4e00-\u9fa5])/g, '$1 $2');
      // 移除数字内部的空格（如 "2 0 2 5" -> "2025"）
      cleaned = cleaned.replace(/(\d)\s+(\d)/g, '$1$2');
      // 移除"月"、"日"、"年"前面的空格
      cleaned = cleaned.replace(/\s+(年|月|日)/g, '$1');
      // 移除"年"、"月"、"日"后面的空格（除了"日"后面可能跟时间）
      cleaned = cleaned.replace(/(年|月)\s+/g, '$1');
    }

    console.log('🧹 清理空格后的文本（前200字符）:', cleaned.substring(0, 200));

    // 关键步骤：在每个"用户名 日期时间"模式处插入换行符
    //
    // 观察到的文本格式（清理空格后）：
    // "... 消息内容 怡 宝 2025年10月9日 20:32 [ 会话记录 ] 可 大 力 2025年9月23日 12:45 @ 唐 炜 ..."
    //
    // 关键问题：
    // 1. 中文字符之间有空格："怡 宝" 而不是 "怡宝"
    // 2. 需要匹配"用户名 + 空格 + 日期 + 空格 + 时间"
    // 3. 用户名和日期之间至少有1个空格
    //
    // 新策略：
    // 使用全局替换，在每个 "日期+时间" 组合前插入换行（但保留用户名）
    // 正则：匹配 "某些字符 + 日期 + 时间"，在日期前插入换行

    // 第一步：找到所有 "YYYY年MM月DD日 HH:MM" 的位置，在它们前面插入标记
    // 使用更宽松的用户名匹配：任何非换行字符，直到遇到日期时间
    let formatted = cleaned;

    // 在每个日期时间前插入换行（保留用户名）
    // 匹配模式：(任意字符，非贪婪) + (YYYY年MM月DD日) + (空格) + (HH:MM)
    // 用负向后顾确保不会匹配到标题（标题后面没有时间）
    const dateTimePattern = /(\d{4}年\d{1,2}月\d{1,2}日\s+\d{1,2}:\d{2})/g;

    // 找到所有日期时间的位置
    const matches = [];
    let match;
    while ((match = dateTimePattern.exec(cleaned)) !== null) {
      matches.push({
        index: match.index,
        text: match[0],
        fullMatch: match[0]
      });
      console.log(`🔍 找到日期时间: "${match[0]}" at位置${match.index}`);
    }

    console.log(`🔍 总共找到 ${matches.length} 个日期时间`);

    // 构建格式化文本：用数组收集每条消息
    const formattedLines = [];

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];

      // 向前查找用户名：从当前日期时间往前最多30个字符
      const searchStart = Math.max(0, m.index - 50);
      const beforeText = cleaned.substring(searchStart, m.index);

      // 从后往前查找，用户名通常紧邻日期时间前
      // 用户名可能是：Bud、怡 宝、可 大 力、@Bud( 利 指 导 ) 等
      // 策略：取trim后的最后部分作为用户名
      const trimmedBefore = beforeText.trim();

      // 如果有多个空格段，取最后一段
      const parts = trimmedBefore.split(/\s{2,}/); // 用2个以上空格分割
      const username = parts[parts.length - 1].trim();

      console.log(`🔍 消息${i + 1}: 用户="${username}", 日期时间="${m.text}"`);

      // 提取消息内容：从日期时间结束到下一个日期时间开始（或文本结尾）
      const contentStart = m.index + m.text.length;
      let contentEnd = cleaned.length;
      if (i + 1 < matches.length) {
        const nextMatch = matches[i + 1];
        // 向前查找，排除下一条消息的用户名
        const nextSearchStart = Math.max(contentStart, nextMatch.index - 50);
        contentEnd = nextSearchStart;
      }

      const content = cleaned.substring(contentStart, contentEnd).trim();

      // 组装成一行：用户名 日期时间
      // 消息内容单独一行
      formattedLines.push(`${username} ${m.text}`);
      if (content) {
        formattedLines.push(content);
      }
    }

    // 重新组装文本
    formatted = formattedLines.join('\n');

    // 移除开头的多余换行
    formatted = formatted.replace(/^\n+/, '');

    console.log('🧹 插入换行后的文本（前500字符）:', formatted.substring(0, 500));

    const lines = formatted.split('\n').filter(line => line.trim());

    console.log('🧹 总行数:', lines.length);
    console.log('🧹 前10行:');
    lines.slice(0, 10).forEach((line, i) => {
      console.log(`   ${i + 1}: ${line.substring(0, 80)}`);
    });

    return lines.join('\n');
  }

  /**
   * 从 PDF 文件中提取文本内容
   */
  static async extractText(file: File): Promise<string> {
    try {
      console.log('📄 开始解析 PDF 文件:', file.name);

      // 将文件读取为 ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // 加载 PDF 文档
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      console.log(`📄 PDF 共 ${pdf.numPages} 页`);

      // 提取所有页面的文本
      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // 将文本内容项合并为字符串
        const pageText = textContent.items
          .map((item: any) => {
            // 处理文本项
            if ('str' in item) {
              return item.str;
            }
            return '';
          })
          .join(' ')
          .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/g, '') // 移除控制字符
          .replace(/\s+/g, ' ') // 合并多个空格
          .trim();

        fullText += pageText + '\n';
        console.log(`📄 已提取第 ${pageNum} 页`);
      }

      // 清理文本，移除中文字符之间的多余空格
      fullText = this.cleanPDFText(fullText);

      console.log('✅ PDF 文本提取完成，共', fullText.length, '字符');
      return fullText;
    } catch (error) {
      console.error('❌ PDF 解析失败:', error);
      throw new Error(`PDF 解析失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }

  /**
   * 检查文件是否为 PDF 格式
   */
  static isPDF(file: File): boolean {
    return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  }
}

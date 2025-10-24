import { ParsedMessage } from './chatParser';

/**
 * 解析从PDF复制的纯文本聊天记录
 *
 * 格式特征（根据真实示例）：
 * 1. 第一行：用户名 YYYY年MM月DD日 HH:MM
 * 2. 后续行：消息内容（可能多行）
 * 3. 空行分隔消息
 * 4. 特殊情况：用户名可能单独一行，然后@提及，再是日期时间
 */
export class TextChatParser {
  /**
   * 处理消息内容，提取图片
   */
  private static processContent(content: string, imageMap: Map<string, string>): { content: string; imageData?: string } {
    // 检测内容中是否有图片标记
    const imageMatch = content.match(/\[图片:(IMG_[^\]]+)\]/);
    let imageData: string | undefined;
    let finalContent = content;

    if (imageMatch) {
      const imageId = imageMatch[1];
      imageData = imageMap.get(imageId);
      // 从内容中移除图片标记
      finalContent = content.replace(/\[图片:IMG_[^\]]+\]\n?/g, '').trim();
      console.log(`🖼️  检测到图片标记: ${imageId}, 有数据: ${!!imageData}`);
    }

    return {
      content: finalContent || '[图片]', // 如果移除标记后内容为空，显示[图片]
      imageData
    };
  }

  /**
   * 解析文本聊天记录
   */
  static parseText(text: string, images: Array<{ id: string; base64: string }> = []): ParsedMessage[] {
    console.log('📝 开始解析文本聊天记录，长度:', text.length, ', 图片数量:', images.length);
    console.log('📝 前200个字符预览:', text.substring(0, 200));

    // 创建图片ID到Base64的映射
    const imageMap = new Map(images.map(img => [img.id, img.base64]));

    const messages: ParsedMessage[] = [];
    const lines = text.split('\n');

    let i = 0;
    let messageIndex = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      // 跳过空行
      if (!line) {
        i++;
        continue;
      }

      console.log(`📋 处理第${i + 1}行: "${line}"`);

      // 尝试匹配消息头: 用户名 YYYY年MM月DD日 HH:MM
      const headerMatch = line.match(/^(.+?)\s+(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);

      if (headerMatch) {
        // 找到消息头
        const sender = headerMatch[1].trim();
        const year = headerMatch[2];
        const month = headerMatch[3].padStart(2, '0');
        const day = headerMatch[4].padStart(2, '0');
        const hour = headerMatch[5].padStart(2, '0');
        const minute = headerMatch[6].padStart(2, '0');

        console.log(`✅ 匹配到消息头: 用户="${sender}", 日期=${year}-${month}-${day} ${hour}:${minute}`);

        // 读取后续行作为消息内容，直到遇到空行或下一个消息头
        i++;
        const contentLines: string[] = [];

        while (i < lines.length) {
          const contentLine = lines[i];

          // 如果是空行，消息结束
          if (!contentLine.trim()) {
            break;
          }

          // 检查是否是下一个消息头（标准格式）
          const nextHeaderMatch = contentLine.trim().match(/^(.+?)\s+(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
          if (nextHeaderMatch) {
            // 这是下一条消息的头，不要移动指针
            break;
          }

          // 检查是否是特殊格式的开始（可能是用户名单独一行）
          // 向前看两行，判断是否是特殊格式消息的开始
          if (i + 1 < lines.length) {
            const nextLine1 = lines[i + 1].trim();
            // 检查下一行是否是日期时间（特殊格式类型1）
            const isType1Start = nextLine1.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
            if (isType1Start) {
              // 当前行是用户名，下一行是日期，这是新消息的开始
              break;
            }

            // 检查下两行是否是日期时间（特殊格式类型2：用户名 + @提及 + 日期）
            if (i + 2 < lines.length) {
              const nextLine2 = lines[i + 2].trim();
              const isType2Start = nextLine2.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
              // 还要确保 nextLine1 看起来像是 @提及
              if (isType2Start && nextLine1.startsWith('@')) {
                // 当前行是用户名，下一行是@提及，下下行是日期，这是新消息的开始
                break;
              }
            }
          }

          // 这是消息内容
          contentLines.push(contentLine.trim());
          i++;
        }

        const rawContent = contentLines.join('\n');

        // 创建消息对象
        const dateString = `${year}-${month}-${day}T${hour}:${minute}:00`;
        const rawTimestamp = new Date(dateString);
        const timestamp = `${month}月${day}日 ${hour}:${minute}`;

        // 处理内容和图片
        const { content, imageData } = this.processContent(rawContent, imageMap);

        messages.push({
          id: `msg-${messageIndex++}`,
          sender,
          content,
          timestamp,
          rawTimestamp,
          imageData,
        });

        console.log(`✅ 添加消息: "${sender}" - "${content.substring(0, 30)}..."`);
      } else {
        // 不是消息头，尝试特殊情况：
        // 用户名单独一行 -> @提及 -> 日期时间
        // 例如：
        // 可大力
        // @Bud(利指导)
        // 2025年9月23日 15:41

        // 检查下两行
        if (i + 2 < lines.length) {
          const line1 = lines[i].trim();     // 可能是用户名
          const line2 = lines[i + 1].trim(); // 可能是@提及或日期
          const line3 = lines[i + 2].trim(); // 可能是日期时间

          // 尝试匹配 line2 或 line3 是否包含日期时间
          const dateMatch2 = line2.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
          const dateMatch3 = line3.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);

          if (dateMatch2) {
            // 格式：用户名 \n 日期时间
            const sender = line1;
            const year = dateMatch2[1];
            const month = dateMatch2[2].padStart(2, '0');
            const day = dateMatch2[3].padStart(2, '0');
            const hour = dateMatch2[4].padStart(2, '0');
            const minute = dateMatch2[5].padStart(2, '0');

            console.log(`✅ 匹配到特殊格式(类型1): 用户="${sender}", 日期=${year}-${month}-${day} ${hour}:${minute}`);

            // 读取后续内容
            i += 2; // 跳过用户名和日期行
            const contentLines: string[] = [];

            while (i < lines.length) {
              const contentLine = lines[i];
              if (!contentLine.trim()) break;

              // 检查是否是下一个消息头（标准格式）
              const nextHeaderMatch = contentLine.trim().match(/^(.+?)\s+(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
              if (nextHeaderMatch) break;

              // 检查是否是特殊格式的开始
              if (i + 1 < lines.length) {
                const nextLine1 = lines[i + 1].trim();
                const isType1Start = nextLine1.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
                if (isType1Start) break;

                if (i + 2 < lines.length) {
                  const nextLine2 = lines[i + 2].trim();
                  const isType2Start = nextLine2.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
                  if (isType2Start && nextLine1.startsWith('@')) break;
                }
              }

              contentLines.push(contentLine.trim());
              i++;
            }

            const rawContent = contentLines.join('\n');
            const dateString = `${year}-${month}-${day}T${hour}:${minute}:00`;
            const rawTimestamp = new Date(dateString);
            const timestamp = `${month}月${day}日 ${hour}:${minute}`;

            // 处理内容和图片
            const { content, imageData } = this.processContent(rawContent, imageMap);

            messages.push({
              id: `msg-${messageIndex++}`,
              sender,
              content,
              timestamp,
              rawTimestamp,
              imageData,
            });

            console.log(`✅ 添加消息(特殊格式1): "${sender}" - "${content.substring(0, 30)}..."`);
            continue;
          } else if (dateMatch3) {
            // 格式：用户名 \n @提及 \n 日期时间
            const sender = line1;
            const year = dateMatch3[1];
            const month = dateMatch3[2].padStart(2, '0');
            const day = dateMatch3[3].padStart(2, '0');
            const hour = dateMatch3[4].padStart(2, '0');
            const minute = dateMatch3[5].padStart(2, '0');

            console.log(`✅ 匹配到特殊格式(类型2): 用户="${sender}", 日期=${year}-${month}-${day} ${hour}:${minute}`);

            // line2 是 @提及，作为内容的一部分
            i += 3; // 跳过用户名、@提及和日期行
            const contentLines: string[] = [line2]; // 包含@提及

            while (i < lines.length) {
              const contentLine = lines[i];
              if (!contentLine.trim()) break;

              // 检查是否是下一个消息头（标准格式）
              const nextHeaderMatch = contentLine.trim().match(/^(.+?)\s+(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
              if (nextHeaderMatch) break;

              // 检查是否是特殊格式的开始
              if (i + 1 < lines.length) {
                const nextLine1 = lines[i + 1].trim();
                const isType1Start = nextLine1.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
                if (isType1Start) break;

                if (i + 2 < lines.length) {
                  const nextLine2 = lines[i + 2].trim();
                  const isType2Start = nextLine2.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
                  if (isType2Start && nextLine1.startsWith('@')) break;
                }
              }

              contentLines.push(contentLine.trim());
              i++;
            }

            const rawContent = contentLines.join('\n');
            const dateString = `${year}-${month}-${day}T${hour}:${minute}:00`;
            const rawTimestamp = new Date(dateString);
            const timestamp = `${month}月${day}日 ${hour}:${minute}`;

            // 处理内容和图片
            const { content, imageData } = this.processContent(rawContent, imageMap);

            messages.push({
              id: `msg-${messageIndex++}`,
              sender,
              content,
              timestamp,
              rawTimestamp,
              imageData,
            });

            console.log(`✅ 添加消息(特殊格式2): "${sender}" - "${content.substring(0, 30)}..."`);
            continue;
          }
        }

        // 都不匹配，跳过这行
        console.log(`⚠️  跳过无法识别的行: "${line}"`);
        i++;
      }
    }

    console.log(`✅ 解析完成，共 ${messages.length} 条消息`);
    return messages;
  }
}

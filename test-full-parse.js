// 完整模拟 textChatParser 的逻辑
const testText = `Bud 2025年9月23日 15:23
尽快哈
可大力
@Bud(利指导)
2025年9月23日 15:41
有时间吗？对一下这个和空间这两个事情
Bud 2025年9月23日 15:45
@可大力
可以
可大力
2025年9月23日 15:45
[视频会议邀请]Tokyo产品部的视频会议
Bud 2025年9月23日 16:06
空间先解决的基础问题是：管理者的隐身看和现身说
Bud 2025年9月23日 16:07
在此基础上才是如何高效率的找`;

function parseText(text) {
  console.log('📝 开始解析文本聊天记录，长度:', text.length);

  const messages = [];
  const lines = text.split('\n');

  let i = 0;
  let messageIndex = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // 跳过空行
    if (!line) {
      console.log(`第${i + 1}行: [空行] - 跳过`);
      i++;
      continue;
    }

    console.log(`\n📋 处理第${i + 1}行: "${line}"`);

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

      // 读取后续行作为消息内容
      i++;
      const contentLines = [];

      while (i < lines.length) {
        const contentLine = lines[i];

        // 如果是空行，消息结束
        if (!contentLine.trim()) {
          break;
        }

        // 检查是否是下一个消息头
        const nextHeaderMatch = contentLine.trim().match(/^(.+?)\s+(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
        if (nextHeaderMatch) {
          break;
        }

        // 这是消息内容
        contentLines.push(contentLine.trim());
        i++;
      }

      const content = contentLines.join('\n');

      messages.push({
        id: `msg-${messageIndex++}`,
        sender,
        content,
      });

      console.log(`✅ 添加消息: "${sender}" - "${content.substring(0, 30)}..."`);
      console.log(`   当前 i=${i}`);
    } else {
      // 不是消息头，尝试特殊情况
      console.log(`❌ 不匹配标准格式，检查特殊情况...`);

      // 检查下两行
      if (i + 2 < lines.length) {
        const line1 = lines[i].trim();
        const line2 = lines[i + 1].trim();
        const line3 = lines[i + 2].trim();

        console.log(`   line1 (第${i + 1}行): "${line1}"`);
        console.log(`   line2 (第${i + 2}行): "${line2}"`);
        console.log(`   line3 (第${i + 3}行): "${line3}"`);

        const dateMatch2 = line2.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
        const dateMatch3 = line3.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);

        console.log(`   line2 是日期? ${dateMatch2 ? '是' : '否'}`);
        console.log(`   line3 是日期? ${dateMatch3 ? '是' : '否'}`);

        if (dateMatch2) {
          console.log(`✅ 匹配特殊格式(类型1): 用户名 + 日期时间`);
          const sender = line1;

          i += 2;
          const contentLines = [];
          while (i < lines.length) {
            const contentLine = lines[i];
            if (!contentLine.trim()) break;

            const nextHeaderMatch = contentLine.trim().match(/^(.+?)\s+(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
            const nextDateMatch = contentLine.trim().match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
            if (nextHeaderMatch || nextDateMatch) break;

            contentLines.push(contentLine.trim());
            i++;
          }

          const content = contentLines.join('\n');
          messages.push({
            id: `msg-${messageIndex++}`,
            sender,
            content,
          });

          console.log(`✅ 添加消息(特殊格式1): "${sender}" - "${content.substring(0, 30)}..."`);
          console.log(`   当前 i=${i}`);
          continue;
        } else if (dateMatch3) {
          console.log(`✅ 匹配特殊格式(类型2): 用户名 + @提及 + 日期时间`);
          const sender = line1;

          i += 3;
          const contentLines = [line2];
          while (i < lines.length) {
            const contentLine = lines[i];
            if (!contentLine.trim()) break;

            const nextHeaderMatch = contentLine.trim().match(/^(.+?)\s+(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
            const nextDateMatch = contentLine.trim().match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
            if (nextHeaderMatch || nextDateMatch) break;

            contentLines.push(contentLine.trim());
            i++;
          }

          const content = contentLines.join('\n');
          messages.push({
            id: `msg-${messageIndex++}`,
            sender,
            content,
          });

          console.log(`✅ 添加消息(特殊格式2): "${sender}" - "${content.substring(0, 30)}..."`);
          console.log(`   当前 i=${i}`);
          continue;
        }
      }

      // 都不匹配，跳过这行
      console.log(`⚠️  跳过无法识别的行: "${line}"`);
      i++;
    }
  }

  console.log(`\n✅ 解析完成，共 ${messages.length} 条消息`);
  return messages;
}

const result = parseText(testText);

console.log('\n=== 最终结果 ===');
result.forEach((msg, i) => {
  console.log(`${i + 1}. ${msg.sender}: ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
});

console.log(`\n=== 统计参与者 ===`);
const senders = new Set(result.map(m => m.sender));
console.log(`参与者: ${Array.from(senders).join(', ')}`);

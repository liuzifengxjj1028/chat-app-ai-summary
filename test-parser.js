// 测试文本解析器
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

console.log('=== 测试文本 ===');
console.log(testText);
console.log('\n=== 分行分析 ===');

const lines = testText.split('\n');
lines.forEach((line, i) => {
  console.log(`第${i + 1}行: [${line}]`);

  // 检查是否匹配标准格式
  const headerMatch = line.match(/^(.+?)\s+(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
  if (headerMatch) {
    console.log(`  ✅ 标准格式 - 用户名: "${headerMatch[1]}"`);
  }

  // 检查是否只有日期时间
  const dateMatch = line.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
  if (dateMatch) {
    console.log(`  📅 只有日期时间`);
  }
});

console.log('\n=== 检查特殊格式 ===');
// 检查 "可大力" 这个案例
console.log('检查索引 2-4:');
console.log(`  第3行: [${lines[2]}]`);
console.log(`  第4行: [${lines[3]}]`);
console.log(`  第5行: [${lines[4]}]`);

const dateMatch2 = lines[3].trim().match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);
const dateMatch3 = lines[4].trim().match(/^(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2}):(\d{2})$/);

console.log(`  第4行是否匹配日期: ${dateMatch2 ? '是' : '否'}`);
console.log(`  第5行是否匹配日期: ${dateMatch3 ? '是' : '否'}`);

if (dateMatch3) {
  console.log(`  ✅ 应该识别为特殊格式(类型2):`);
  console.log(`     用户名: "${lines[2].trim()}"`);
  console.log(`     @提及: "${lines[3].trim()}"`);
  console.log(`     日期时间: "${lines[4].trim()}"`);
}

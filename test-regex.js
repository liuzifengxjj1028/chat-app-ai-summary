// 测试正则表达式
const line = "Bud 2025年9月23日 15:23尽快哈 可 大 力 2025年9月23日 15:41";

const pattern3 = /^(.+?)\s+(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})(.*)$/;

console.log('测试行:', line);
console.log('正则:', pattern3);

const match = line.match(pattern3);

if (match) {
  console.log('✅ 匹配成功！');
  console.log('发送者:', match[1]);
  console.log('年:', match[2]);
  console.log('月:', match[3]);
  console.log('日:', match[4]);
  console.log('时:', match[5]);
  console.log('分:', match[6]);
  console.log('内容:', match[7]);
} else {
  console.log('❌ 匹配失败');
}

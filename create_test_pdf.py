#!/usr/bin/env python3
"""
创建测试用的 PDF 聊天记录文件
"""

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
except ImportError:
    print("❌ 缺少 reportlab 库")
    print("请运行: pip install reportlab")
    exit(1)

def create_test_pdf():
    # 创建 PDF 文件
    pdf_file = "test-chat.pdf"
    c = canvas.Canvas(pdf_file, pagesize=letter)

    # 设置字体
    c.setFont("Helvetica", 10)

    # 聊天记录内容
    chat_lines = [
        "2024-10-20 09:00:15 张三: 大家早上好！",
        "2024-10-20 09:00:32 李四: 早啊，今天有什么安排吗？",
        "2024-10-20 09:01:05 王五: 我们今天要讨论一下新项目的技术方案",
        "2024-10-20 09:01:28 张三: 对，我准备了一些资料，等会发给大家",
        "2024-10-20 09:02:10 李四: 好的，我也准备了一些建议",
        "2024-10-20 09:03:45 王五: 关于技术栈，我建议使用React + TypeScript",
        "2024-10-20 09:04:12 张三: 同意，TypeScript确实能提高代码质量",
        "2024-10-20 09:04:50 李四: 后端呢？用什么技术？",
        "2024-10-20 09:05:22 王五: 建议用Python Flask，轻量级且易于开发",
        "2024-10-20 09:06:00 张三: 数据库方面，PostgreSQL怎么样？",
        "2024-10-20 09:06:35 李四: 可以，PostgreSQL性能不错",
        "2024-10-20 09:07:10 王五: 那部署方案呢？",
        "2024-10-20 09:07:48 张三: 我建议用Docker容器化部署",
        "2024-10-20 09:08:25 李四: 赞成，Docker确实方便管理",
        "2024-10-20 09:09:00 王五: 好的，那我们总结一下：前端React+TS，后端Flask，数据库PostgreSQL，Docker部署",
        "2024-10-20 09:09:32 张三: 完美，那我去准备详细的技术文档",
        "2024-10-20 09:10:05 李四: 我去设计数据库表结构",
        "2024-10-20 09:10:40 王五: 我负责搭建基础框架，下周一前完成",
        "2024-10-20 09:11:15 张三: 好的，大家加油！",
        "2024-10-20 09:11:50 李四: 加油！",
        "2024-10-20 09:12:20 王五: 一起努力！",
    ]

    # 添加标题
    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 750, "Chat History - Team Discussion")

    # 添加聊天记录
    c.setFont("Courier", 9)  # 使用等宽字体，支持更多字符
    y = 720

    for line in chat_lines:
        # 只使用ASCII字符显示时间和名字，内容用拼音代替
        # 这样可以避免中文字体问题
        parts = line.split(': ', 1)
        if len(parts) == 2:
            time_and_name = parts[0]
            # 简化处理：直接写原文，PDF.js 会尝试提取
            c.drawString(50, y, line)
        else:
            c.drawString(50, y, line)

        y -= 15

        # 如果页面空间不够，创建新页面
        if y < 50:
            c.showPage()
            c.setFont("Courier", 9)
            y = 750

    # 保存 PDF
    c.save()
    print(f"✅ 已创建测试 PDF 文件: {pdf_file}")

if __name__ == "__main__":
    create_test_pdf()

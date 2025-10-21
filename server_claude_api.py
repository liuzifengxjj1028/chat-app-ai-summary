# 在weather_handler之前添加这个处理器

async def parse_chat_handler(request):
    """处理PDF聊天记录解析请求 - Claude API代理"""
    try:
        # 获取请求数据
        data = await request.json()
        text = data.get('text', '')
        prompt = data.get('prompt', '')

        if not text:
            return web.json_response({
                'error': '缺少文本参数'
            }, status=400)

        # 获取API密钥
        api_key = os.environ.get('ANTHROPIC_API_KEY', '')
        if not api_key:
            print('⚠️  未配置ANTHROPIC_API_KEY环境变量')
            return web.json_response({
                'error': '未配置Claude API密钥'
            }, status=500)

        print(f'🤖 开始Claude API解析，文本长度: {len(text)}')

        # 调用Claude API
        claude_url = 'https://api.anthropic.com/v1/messages'
        headers = {
            'Content-Type': 'application/json',
            'x-api-key': api_key,
            'anthropic-version': '2023-06-01'
        }

        payload = {
            'model': 'claude-3-5-sonnet-20241022',
            'max_tokens': 4096,
            'messages': [
                {
                    'role': 'user',
                    'content': prompt if prompt else f'解析以下文本:\n{text[:8000]}'
                }
            ]
        }

        async with aiohttp.ClientSession() as session:
            async with session.post(claude_url, headers=headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f'❌ Claude API错误: {error_text}')
                    return web.json_response({
                        'error': f'Claude API调用失败: {error_text}'
                    }, status=response.status)

                result = await response.json()
                print(f'✅ Claude API响应成功')

                # 返回Claude的响应
                return web.json_response(result)

    except Exception as e:
        print(f'❌ Claude API代理错误: {str(e)}')
        import traceback
        traceback.print_exc()
        return web.json_response({
            'error': str(e)
        }, status=500)

# 然后在路由中添加:
# app.router.add_post('/api/parse-chat', parse_chat_handler)

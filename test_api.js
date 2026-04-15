const https = require('https');

// 测试 sunlea.de API
const testSunleaAPI = () => {
  const options = {
    hostname: 'sunlea.de',
    port: 443,
    path: '/v1/models',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_KEY_HERE' // 替换为你的API密钥
    }
  };

  console.log('测试 sunlea.de API...');
  
  const req = https.request(options, (res) => {
    console.log('状态码:', res.statusCode);
    console.log('响应头:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('响应数据:', data);
      try {
        const json = JSON.parse(data);
        console.log('解析后的JSON:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('JSON解析失败:', e.message);
      }
    });
  });

  req.on('error', (error) => {
    console.error('请求错误:', error);
  });

  req.end();
};

// 测试 OpenAI 兼容性
const testOpenAICompatibility = () => {
  const options = {
    hostname: 'sunlea.de',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_KEY_HERE' // 替换为你的API密钥
    }
  };

  console.log('\n测试 OpenAI 兼容性...');
  
  const req = https.request(options, (res) => {
    console.log('状态码:', res.statusCode);
    console.log('响应头:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('响应数据:', data);
    });
  });

  req.on('error', (error) => {
    console.error('请求错误:', error);
  });

  // 发送一个简单的测试请求
  const body = JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: 'Hello' }],
    max_tokens: 10
  });

  req.write(body);
  req.end();
};

// 执行测试
testSunleaAPI();
// testOpenAICompatibility(); // 先注释掉，先测试模型列表
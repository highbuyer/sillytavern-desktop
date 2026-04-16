// 直接测试 sunlea.de API
const https = require('https');

// 使用你的API密钥（替换为实际密钥）
const API_KEY = 'YOUR_API_KEY_HERE';
const API_URL = 'https://sunlea.de/v1/models';

const options = {
  hostname: 'sunlea.de',
  port: 443,
  path: '/v1/models',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`
  }
};

console.log('正在测试:', API_URL);
console.log('使用密钥:', API_KEY.substring(0, 10) + '...');

const req = https.request(options, (res) => {
  console.log('\n=== 响应信息 ===');
  console.log('状态码:', res.statusCode);
  console.log('状态消息:', res.statusMessage);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n=== 响应内容 ===');
    console.log(data);
    
    try {
      const json = JSON.parse(data);
      console.log('\n=== 解析后的JSON ===');
      console.log(JSON.stringify(json, null, 2));
      
      if (json.error) {
        console.log('\n❌ API返回错误:', json.error.message || JSON.stringify(json.error));
      } else if (json.data && Array.isArray(json.data)) {
        console.log(`\n✅ 成功获取到 ${json.data.length} 个模型`);
        json.data.slice(0, 5).forEach((model, i) => {
          console.log(`${i+1}. ${model.id} (${model.object || 'model'})`);
        });
        if (json.data.length > 5) {
          console.log(`... 还有 ${json.data.length - 5} 个模型`);
        }
      } else if (Array.isArray(json)) {
        console.log(`\n✅ 成功获取到 ${json.length} 个模型`);
        json.slice(0, 5).forEach((model, i) => {
          console.log(`${i+1}. ${model.id || model.name} (${model.object || 'model'})`);
        });
      } else {
        console.log('\n⚠️ 未知的响应格式');
      }
    } catch (e) {
      console.log('\n❌ JSON解析失败:', e.message);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ 请求错误:', error.message);
});

req.end();
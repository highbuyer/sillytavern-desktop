const https = require('https');
const http = require('http');

// 您的配置
const config = {
  backend: 'openai',
  apiUrl: 'https://sunlea.de/v1',
  apiKey: '您的API密钥', // 请替换为实际密钥
  proxy: 'http://127.0.0.1:10808'
};

console.log('=== 测试API配置 ===');
console.log('后端:', config.backend);
console.log('API地址:', config.apiUrl);
console.log('代理:', config.proxy);

// 解析代理
const proxyUrl = new URL(config.proxy);
const proxyHost = proxyUrl.hostname;
const proxyPort = proxyUrl.port || (proxyUrl.protocol === 'https:' ? 443 : 80);

// 创建代理请求选项
const options = {
  hostname: proxyHost,
  port: proxyPort,
  path: config.apiUrl,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json'
  }
};

console.log('\n=== 发送请求 ===');
console.log('目标URL:', config.apiUrl);
console.log('通过代理:', config.proxy);

// 通过代理发送请求
const req = http.request(options, (res) => {
  console.log('\n=== 响应状态 ===');
  console.log('状态码:', res.statusCode);
  console.log('状态消息:', res.statusMessage);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n=== 响应内容 ===');
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
      
      if (jsonData.models) {
        console.log('\n=== 可用模型 ===');
        jsonData.models.forEach((model, index) => {
          console.log(`${index + 1}. ${model.id}`);
        });
      }
    } catch (e) {
      console.log('原始响应:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('\n=== 请求错误 ===');
  console.error('错误信息:', error.message);
  
  // 尝试直接请求（不使用代理）
  console.log('\n=== 尝试直接请求（不使用代理）===');
  testDirectRequest();
});

req.end();

function testDirectRequest() {
  const url = new URL(config.apiUrl);
  const directOptions = {
    hostname: url.hostname,
    port: url.port || 443,
    path: url.pathname,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    }
  };
  
  const directReq = https.request(directOptions, (res) => {
    console.log('直接请求状态码:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('直接请求响应:', data);
    });
  });
  
  directReq.on('error', (error) => {
    console.error('直接请求错误:', error.message);
  });
  
  directReq.end();
}
// 直接测试当前配置
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// 尝试从多个位置读取配置
const possiblePaths = [
  path.join(process.env.HOME, '.config', 'sillytavern-desktop', 'localStorage.json'),
  path.join(process.env.HOME, '.config', 'SillyTavern', 'localStorage.json'),
  path.join(process.env.HOME, '.config', 'sillytavern', 'localStorage.json'),
  path.join(process.env.HOME, '.config', 'sillytavern-desktop', 'IndexedDB'),
  path.join(process.env.HOME, '.config', 'sillytavern-desktop'),
];

console.log('=== 搜索配置文件 ===');
let configFound = false;

for (const configPath of possiblePaths) {
  try {
    if (fs.existsSync(configPath)) {
      console.log('找到路径:', configPath);
      if (fs.statSync(configPath).isDirectory()) {
        console.log('  是目录，列出内容:');
        const files = fs.readdirSync(configPath);
        files.forEach(file => {
          console.log('  -', file);
          if (file.includes('localStorage') || file.includes('json')) {
            const fullPath = path.join(configPath, file);
            try {
              const content = fs.readFileSync(fullPath, 'utf8');
              console.log('    内容:', content.substring(0, 200) + '...');
            } catch (e) {
              console.log('    无法读取:', e.message);
            }
          }
        });
      } else {
        const content = fs.readFileSync(configPath, 'utf8');
        console.log('  文件内容:', content.substring(0, 500) + '...');
        configFound = true;
      }
    }
  } catch (error) {
    console.log('检查路径失败:', configPath, error.message);
  }
}

if (!configFound) {
  console.log('\n=== 未找到配置文件，使用硬编码配置测试 ===');
  
  // 使用您提供的配置
  const config = {
    backend: 'openai',
    apiUrl: 'https://sunlea.de/v1',
    apiKey: 'sk-xxx', // 请替换为您的实际API密钥
    proxy: 'http://127.0.0.1:10808'
  };
  
  console.log('配置:', config);
  
  // 测试API
  testAPI(config);
}

function testAPI(config) {
  console.log('\n=== 测试API连接 ===');
  
  const options = {
    hostname: 'sunlea.de',
    port: 443,
    path: '/v1/models',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    }
  };
  
  console.log('请求选项:', JSON.stringify(options, null, 2));
  
  const req = https.request(options, (res) => {
    console.log('\n=== API响应 ===');
    console.log('状态码:', res.statusCode);
    console.log('状态消息:', res.statusMessage);
    console.log('响应头:', JSON.stringify(res.headers, null, 2));
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('\n=== 响应体 ===');
      try {
        const jsonData = JSON.parse(data);
        console.log(JSON.stringify(jsonData, null, 2));
        
        if (jsonData.models) {
          console.log('\n=== 可用模型列表 ===');
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
    console.error('错误:', error.message);
    
    // 尝试不使用HTTPS
    console.log('\n=== 尝试HTTP请求 ===');
    testHTTP(config);
  });
  
  req.end();
}

function testHTTP(config) {
  const options = {
    hostname: '127.0.0.1',
    port: 10808,
    path: 'http://sunlea.de/v1/models',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
      'Host': 'sunlea.de'
    }
  };
  
  console.log('通过代理请求:', options);
  
  const req = http.request(options, (res) => {
    console.log('代理响应状态:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      console.log('代理响应:', data);
    });
  });
  
  req.on('error', (error) => {
    console.error('代理请求错误:', error.message);
  });
  
  req.end();
}
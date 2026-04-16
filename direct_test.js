// 直接测试，使用localStorage中的配置
const fs = require('fs');
const path = require('path');

// 读取localStorage文件
const localStoragePath = path.join(__dirname, 'test_storage.json');

// 模拟从Electron读取localStorage
function getSettings() {
  try {
    // 尝试从多个位置读取
    const possiblePaths = [
      path.join(process.env.HOME || process.env.USERPROFILE, '.config', 'sillytavern-desktop', 'Local Storage', 'leveldb'),
      path.join(__dirname, 'localStorage.json'),
      path.join(__dirname, 'test_storage.json')
    ];
    
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        console.log('找到设置文件:', filePath);
        return JSON.parse(content);
      }
    }
    
    // 如果没有找到文件，使用硬编码测试
    console.log('未找到设置文件，使用硬编码测试');
    return {
      api: {
        activeProvider: 'openai',
        activeModel: 'gpt-3.5-turbo',
        openaiKey: 'YOUR_API_KEY', // 这里需要替换
        openaiUrl: 'https://sunlea.de/v1',
        proxyUrl: 'http://127.0.0.1:10808'
      }
    };
  } catch (error) {
    console.error('读取设置失败:', error.message);
    return null;
  }
}

// 直接测试API
async function testAPI(settings) {
  if (!settings || !settings.api) {
    console.error('没有有效的设置');
    return;
  }
  
  const api = settings.api;
  console.log('\n=== 使用以下配置测试 ===');
  console.log('后端:', api.activeProvider);
  console.log('API地址:', api.openaiUrl);
  console.log('API密钥:', api.openaiKey ? `${api.openaiKey.substring(0, 15)}...` : '未填写');
  console.log('代理:', api.proxyUrl || '无');
  
  // 构建请求
  const url = `${api.openaiUrl}/models`;
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (api.openaiKey) {
    headers['Authorization'] = `Bearer ${api.openaiKey}`;
  }
  
  console.log('\n=== 发送请求 ===');
  console.log('URL:', url);
  console.log('Headers:', headers);
  
  try {
    // 使用node-fetch或https模块
    const https = require('https');
    const { URL } = require('url');
    
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: headers
    };
    
    // 如果有代理，通过代理发送
    if (api.proxyUrl) {
      console.log('通过代理发送:', api.proxyUrl);
      const { HttpsProxyAgent } = require('https-proxy-agent');
      const agent = new HttpsProxyAgent(api.proxyUrl);
      options.agent = agent;
    }
    
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.end();
    });
    
    console.log('\n=== 响应 ===');
    console.log('状态码:', response.status);
    console.log('响应头:', JSON.stringify(response.headers, null, 2));
    console.log('响应内容:', response.data);
    
    // 尝试解析JSON
    try {
      const json = JSON.parse(response.data);
      console.log('\n=== 解析后的JSON ===');
      console.log(JSON.stringify(json, null, 2));
      
      if (json.error) {
        console.log('\n❌ API错误:', json.error.message || JSON.stringify(json.error));
      } else if (json.data && Array.isArray(json.data)) {
        console.log(`\n✅ 成功! 获取到 ${json.data.length} 个模型`);
      } else if (Array.isArray(json)) {
        console.log(`\n✅ 成功! 获取到 ${json.length} 个模型`);
      } else {
        console.log('\n⚠️ 未知响应格式');
      }
    } catch (e) {
      console.log('\n❌ JSON解析失败:', e.message);
    }
    
  } catch (error) {
    console.error('\n🔥 请求失败:', error.message);
    console.error('错误堆栈:', error.stack);
  }
}

// 执行测试
const settings = getSettings();
if (settings) {
  testAPI(settings);
} else {
  console.error('无法获取设置');
}
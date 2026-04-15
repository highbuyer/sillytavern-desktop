const { app, BrowserWindow, session, screen } = require('electron');
const path = require('path');

// 在Linux上禁用沙箱以避免权限问题
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('--no-sandbox');
  app.commandLine.appendSwitch('--disable-gpu-sandbox');
  app.commandLine.appendSwitch('--disable-software-rasterizer');
  app.commandLine.appendSwitch('--disable-dev-shm-usage');
  app.commandLine.appendSwitch('--disable-gpu');
  app.commandLine.appendSwitch('--disable-accelerated-2d-canvas');
  app.commandLine.appendSwitch('--disable-accelerated-video-decode');
}

// 禁用硬件加速以避免渲染问题
app.disableHardwareAcceleration();

// 全局异常捕获
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception in main process:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
});

let mainWindow = null;

function createWindow() {
  const displays = screen.getAllDisplays();
  console.log('All displays:', displays.map(d => d.bounds));
  const primary = screen.getPrimaryDisplay();
  const { width, height } = primary.workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1440, width - 50),
    height: Math.min(900, height - 50),
    x: Math.max(0, (width - 1440) / 2),
    y: Math.max(0, (height - 900) / 2),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false,
      nodeIntegration: true,
      enableRemoteModule: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
    show: false,
  });

  // Load the frontend
  const prodPath = path.join(__dirname, '../dist/index.html');
  
  // 尝试加载开发服务器
  mainWindow.loadURL('http://localhost:5173').catch(err => {
    console.log('Failed to load dev server, falling back to production build:', err.message);
    // 回退到生产构建文件
    mainWindow.loadFile(prodPath).catch(err => {
      console.error('Failed to load production build:', err);
      // 作为最后手段，显示错误页面
      mainWindow.loadURL(`data:text/html,
        <html>
          <body style="background:#1e1e2e;color:#e8e8e8;font-family:sans-serif;padding:40px;text-align:center;">
            <h1>SillyTavern Desktop</h1>
            <p>无法加载应用。请确保构建成功。</p>
            <p>错误: ${err.message}</p>
            <button onclick="location.reload()" style="background:#5B3FD9;color:white;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;">
              重试
            </button>
          </body>
        </html>
      `);
    });
  });

  // 监听渲染进程的控制台输出
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer ${level}] ${message} (${sourceId}:${line})`);
  });

  // 监听渲染进程崩溃
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('❌ Renderer process gone:', details.reason, details.exitCode);
  });

  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('❌ Renderer crashed, killed:', killed);
  });

  // 监听未捕获异常
  mainWindow.webContents.on('uncaught-exception', (event, error) => {
    console.error('❌ Uncaught exception in renderer:', error);
  });

  // Ctrl+Shift+I 切换 DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key === 'I') {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
    }
    // F12 也切换
    if (input.key === 'F12') {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      }
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page finished loading');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    // 执行一个简单的JavaScript测试来检查DOM
    mainWindow.webContents.executeJavaScript(`
      console.log('DOM ready, root exists:', !!document.getElementById('root'));
      console.log('React version:', React?.version);
      console.log('ReactDOM version:', ReactDOM?.version);
      // 检查root内容
      const root = document.getElementById('root');
      console.log('Root children:', root?.children?.length);
      console.log('Root innerHTML length:', root?.innerHTML?.length);
      console.log('Body children:', document.body.children?.length);
      console.log('Computed body background:', window.getComputedStyle(document.body).backgroundColor);
      console.log('Computed root display:', root ? window.getComputedStyle(root).display : 'none');
      // 检查是否有空状态元素
      const emptyState = document.querySelector('.empty-state');
      console.log('Empty state element:', !!emptyState);
      if (emptyState) {
        console.log('Empty state text:', emptyState.textContent?.substring(0, 100));
        console.log('Empty state visibility:', window.getComputedStyle(emptyState).display);
        // 添加红色边框以便调试
        emptyState.style.border = '2px solid red';
      }
      // 检查侧边栏和主内容区域
      const sidebar = document.querySelector('.sidebar');
      const mainContent = document.querySelector('.main-content');
      console.log('Sidebar exists:', !!sidebar);
      console.log('Main content exists:', !!mainContent);
      if (mainContent) {
        console.log('Main content children:', mainContent.children?.length);
        console.log('Main content innerHTML length:', mainContent.innerHTML?.length);
        // 检查路由内容
        const routes = mainContent.querySelectorAll('*');
        console.log('Main content direct children:', mainContent.children?.length);
        for (let i = 0; i < Math.min(5, mainContent.children.length); i++) {
          const child = mainContent.children[i];
          console.log(\`Child \${i}: \${child.tagName} class=\${child.className}\`);
        }
      }
      // 检查当前URL路径
      console.log('Current path:', window.location.pathname);
      console.log('Current hash:', window.location.hash);
      // 尝试修改背景色以确认JavaScript执行
      document.body.style.backgroundColor = '#ff0000';
      setTimeout(() => { document.body.style.backgroundColor = ''; }, 500);
    `).catch(err => console.error('Failed to execute test script:', err));
    
    mainWindow.show();
    mainWindow.focus();
    console.log('Window bounds:', mainWindow.getBounds());
    console.log('Visible:', mainWindow.isVisible());
    console.log('Focused:', mainWindow.isFocused());
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      console.warn('Window still not visible after 30s');
    }
  }, 30000);
}

app.whenReady().then(() => {
  console.log('Electron app is ready');

  // 不设置默认代理，由渲染进程通过 IPC 动态配置
  // 监听渲染进程发来的代理设置请求
  const { ipcMain } = require('electron');
  ipcMain.handle('set-proxy', (event, proxyUrl) => {
    if (proxyUrl && proxyUrl.trim()) {
      console.log('设置代理服务器:', proxyUrl);
      session.defaultSession.setProxy({ proxyRules: proxyUrl.trim() })
        .then(() => console.log('Session代理设置成功:', proxyUrl))
        .catch(err => console.error('Session代理设置失败:', err));
    } else {
      console.log('清除代理，使用直连');
      session.defaultSession.setProxy({ proxyRules: '' })
        .then(() => console.log('已清除代理'))
        .catch(err => console.error('清除代理失败:', err));
    }
  });
  console.log('代理管理模块就绪，等待渲染进程配置');

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Access-Control-Allow-Origin': ['*'],
        'Access-Control-Allow-Methods': ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        'Access-Control-Allow-Headers': ['Content-Type', 'Authorization']
      }
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

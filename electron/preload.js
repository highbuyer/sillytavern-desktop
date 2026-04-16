const { contextBridge, ipcRenderer } = require('electron');

// 如果contextBridge可用且contextIsolation启用，则使用contextBridge
// 否则直接附加到window对象
if (contextBridge && ipcRenderer) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', {
      sendNotification: (title, body) => ipcRenderer.send('send-notification', { title, body }),
    });
    console.log('Preload script loaded successfully with contextBridge');
  } catch (error) {
    console.warn('ContextBridge failed, using direct attachment:', error.message);
    attachDirectly();
  }
} else {
  attachDirectly();
}

function attachDirectly() {
  if (typeof window !== 'undefined') {
    window.electronAPI = {
      sendNotification: (title, body) => {
        if (ipcRenderer) {
          ipcRenderer.send('send-notification', { title, body });
        } else {
          console.log('Notification (no ipcRenderer):', title, body);
        }
      }
    };
    console.log('Preload script attached directly to window');
  }
}

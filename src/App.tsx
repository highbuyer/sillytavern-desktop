import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useStoreState } from './store/useStore';
import ChatList from './components/ChatList';
import ChatRoom from './components/ChatRoom';
import SettingsPage from './pages/SettingsPage';
import RolesPage from './pages/RolesPage';
import ChatSettingsPage from './pages/ChatSettingsPage';
import WorldInfoPage from './pages/WorldInfoPage';
import './App.css';

const MainLayout: React.FC = () => {
  const state = useStoreState();
  const navigate = useNavigate();
  
  const currentChatId = window.location.pathname.match(/\/chat\/(\d+)/)?.[1];
  const currentChat = state.chats.find(c => String(c.id) === currentChatId);
  
  return (
    <div className="app">
      {/* 左侧聊天列表 */}
      <div className="sidebar">
        <ChatList />
      </div>
      
      {/* 右侧内容区域 */}
      <div className="main-content">
        <Routes>
          <Route path="/chat/:id" element={<ChatRoom />} />
          <Route path="/chat/:id/settings" element={<ChatSettingsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/worldinfo" element={<WorldInfoPage />} />
          <Route 
            path="/" 
            element={
              currentChat ? (
                <Navigate to={`/chat/${currentChat.id}`} replace />
              ) : state.chats.length > 0 ? (
                <Navigate to={`/chat/${state.chats[0].id}`} replace />
              ) : (
                <div className="empty-state">
                  <h2>欢迎使用 SillyTavern Desktop</h2>
                  <p>点击左侧"新建聊天"开始对话</p>
                  <button className="btn-primary" onClick={() => navigate('/settings')}>
                    前往设置
                  </button>
                </div>
              )
            } 
          />
        </Routes>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
};

export default App;

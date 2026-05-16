import React, { useState, useEffect } from 'react';
import { ChatProvider } from './context/ChatContext';
import LoginScreen from './components/LoginScreen';
import ChatLayout from './components/ChatLayout';
import { api } from './services/api';
import socket from './services/socketService';

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true); // show nothing while verifying token

  /**
   * On mount: check localStorage for a saved JWT.
   * If found, verify it with the backend and auto-login.
   * This keeps the user logged in across page refreshes and
   * browser restarts — they won't have to type their password again
   * until the token expires (30 days) or they sign out.
   */
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('yapping_token');
      if (!token) {
        setCheckingAuth(false);
        return;
      }

      try {
        const { user } = await api.post('/auth/verify', { token });

        // Token is valid — reconnect socket and go straight to chat
        socket.connect();
        socket.emit('user:join', { username: user.username, avatar: user.avatar });
        socket.once('init', () => {
          setUserData(user);
          setLoggedIn(true);
          setCheckingAuth(false);
        });
      } catch {
        // Token expired or invalid — clear it and show login
        localStorage.removeItem('yapping_token');
        localStorage.removeItem('yapping_user');
        setCheckingAuth(false);
      }
    };

    restoreSession();
  }, []);

  const handleLogin = (user) => {
    setUserData(user);
    setLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('yapping_token');
    localStorage.removeItem('yapping_user');
    socket.disconnect();
    setLoggedIn(false);
    setUserData(null);
  };

  // Splash screen while checking saved token
  if (checkingAuth) {
    return (
      <div className="h-full w-full flex items-center justify-center"
        style={{ background: '#080b14' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366f1,#22d3ee)', boxShadow: '0 0 30px rgba(99,102,241,0.4)' }}>
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
              <path d="M6 8C6 6.9 6.9 6 8 6h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H18l-4 4v-4H8c-1.1 0-2-.9-2-2V8z" fill="white" fillOpacity=".9"/>
            </svg>
          </div>
          <svg className="animate-spin w-5 h-5 text-indigo-500" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="noise">
      <ChatProvider>
        {!loggedIn ? (
          <LoginScreen onLogin={handleLogin} />
        ) : (
          <ChatLayout user={userData} onLogout={handleLogout} />
        )}
      </ChatProvider>
    </div>
  );
}
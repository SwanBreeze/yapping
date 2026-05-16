import React, { useState } from 'react';
import socket from '../services/socketService';
import { api } from '../services/api';

export default function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState('login');

  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setUsername('');
    setEmail('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register' && username.trim().length < 2) {
      return setError('Username must be at least 2 characters');
    }
    if (!email.trim()) return setError('Email is required');
    if (password.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true);
    try {
      const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
      const body = mode === 'register'
        ? { username: username.trim(), email: email.trim(), password }
        : { email: email.trim(), password };

      const { user, token } = await api.post(endpoint, body);

      localStorage.setItem('yapping_token', token);
      localStorage.setItem('yapping_user', JSON.stringify(user));

      socket.connect();
      socket.emit('user:join', { username: user.username, avatar: user.avatar });
      socket.once('init', () => onLogin(user));

    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const inputBase = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(99,102,241,0.2)',
    fontFamily: 'DM Sans, sans-serif',
  };

  return (
    <div className="min-h-full w-full flex items-start justify-center py-8 px-4 overflow-y-auto relative"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%), #080b14' }}>

      <div className="fixed top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #6366f1, #22d3ee)', boxShadow: '0 0 40px rgba(99,102,241,0.5)' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M6 8C6 6.9 6.9 6 8 6h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H18l-4 4v-4H8c-1.1 0-2-.9-2-2V8z"
                fill="white" fillOpacity=".9"/>
              <circle cx="11" cy="13" r="1.5" fill="white" fillOpacity=".5"/>
              <circle cx="16" cy="13" r="1.5" fill="white" fillOpacity=".5"/>
              <circle cx="21" cy="13" r="1.5" fill="white" fillOpacity=".5"/>
            </svg>
          </div>
          <h1 className="text-3xl font-bold gradient-text tracking-tight">Yapping</h1>
          <p className="text-slate-400 mt-2 text-sm">Real-time messaging platform</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8"
          style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.15)' }}>

          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-6"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            {['login', 'register'].map(m => (
              <button key={m} onClick={() => switchMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${mode === m ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                style={mode === m ? {
                  background: 'linear-gradient(135deg,#6366f1,#4f46e5)',
                  boxShadow: '0 0 15px rgba(99,102,241,0.3)',
                } : {}}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Username</label>
                <input
                  type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. alex_storm" maxLength={20} autoFocus
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-600 text-sm outline-none transition-all"
                  style={inputBase}
                  onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com" autoFocus={mode === 'login'} autoComplete="email"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-600 text-sm outline-none transition-all"
                style={inputBase}
                onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'At least 6 characters' : '••••••••'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  className="w-full px-4 py-3 pr-11 rounded-xl text-white placeholder-slate-600 text-sm outline-none transition-all"
                  style={inputBase}
                  onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.6)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(99,102,241,0.2)'}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors">
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit — always visible */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                boxShadow: loading ? 'none' : '0 0 25px rgba(99,102,241,0.45)',
              }}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeOpacity=".3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  {mode === 'register' ? 'Creating account...' : 'Signing in...'}
                </span>
              ) : (
                mode === 'register' ? '✦ Create Account' : 'Sign In →'
              )}
            </button>

          </form>

          <p className="text-center text-xs text-slate-600 mt-5">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>

          <div className="mt-6 pt-5 border-t border-white/5 flex items-center justify-center gap-4 flex-wrap">
            {['Real-time', 'File sharing', 'Voice msgs', 'Voice calls'].map(f => (
              <span key={f} className="flex items-center gap-1 text-xs text-slate-500">
                <span className="w-1 h-1 rounded-full bg-indigo-500/60 inline-block"/>
                {f}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
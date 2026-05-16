import React from 'react';
import { useChat } from '../context/ChatContext';

function Avatar({ user }) {
  if (user.avatar) {
    return <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
      style={{ background: 'linear-gradient(135deg,#6366f1,#22d3ee)' }}>
      {user.username?.[0]?.toUpperCase()}
    </div>
  );
}

export default function UserList({ onDmSelect }) {
  const { users, currentUser, dmUnread, startCall, activeCall } = useChat();

  const others = users.filter(u => u.id !== currentUser?.id);

  return (
    <div className="w-52 flex-shrink-0 flex flex-col border-l"
      style={{ borderColor: 'rgba(99,102,241,0.1)', background: 'rgba(8,11,20,0.95)' }}>

      <div className="px-4 py-4 border-b border-white/5">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Online — {users.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">

        {/* Current user */}
        {currentUser && (
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg">
            <div className="relative">
              <Avatar user={currentUser} />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 online-pulse"
                style={{ borderColor: '#080b14' }} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {currentUser.username} <span className="text-slate-600 font-normal">(you)</span>
              </div>
              <div className="text-xs text-green-400">Online</div>
            </div>
          </div>
        )}

        {others.length > 0 && (
          <div className="px-2 pt-2 pb-1">
            <span className="text-xs text-slate-600">Others</span>
          </div>
        )}

        {others.map(user => {
          const unread = dmUnread?.[user.id] || 0;
          return (
            <div key={user.id}
              className="flex items-center gap-2 px-2 py-2 rounded-lg transition-all hover:bg-white/5 group">

              {/* Avatar + online dot */}
              <div className="relative flex-shrink-0">
                <Avatar user={user} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2"
                  style={{ borderColor: '#080b14' }} />
              </div>

              {/* Name + DM button */}
              <button onClick={() => onDmSelect(user)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-slate-300 truncate group-hover:text-white transition-colors">
                    {user.username}
                  </span>
                  {/* Unread badge */}
                  {unread > 0 && (
                    <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }}>
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 group-hover:text-indigo-400 transition-colors">
                  {unread > 0 ? `${unread} new message${unread > 1 ? 's' : ''}` : 'Click to DM'}
                </div>
              </button>

              {/* Voice call button */}
              <button
                onClick={() => startCall(user)}
                disabled={!!activeCall}
                title={activeCall ? 'Already in a call' : `Call ${user.username}`}
                className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all
                  ${activeCall
                    ? 'opacity-30 cursor-not-allowed text-slate-600'
                    : 'text-slate-600 hover:text-green-400 hover:bg-green-500/10 opacity-0 group-hover:opacity-100'
                  }`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.1 4a2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.07 9.91a16 16 0 006.02 6.02l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
              </button>
            </div>
          );
        })}

        {others.length === 0 && (
          <div className="px-2 py-6 text-center">
            <p className="text-xs text-slate-600">No other users online</p>
            <p className="text-xs text-slate-700 mt-1">Share the URL to invite!</p>
          </div>
        )}
      </div>
    </div>
  );
}
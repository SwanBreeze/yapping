import React, { useState } from 'react';
import { useChat } from '../context/ChatContext';

const HashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" opacity=".5">
    <path d="M6.5 0l-.5 4H2.5l-.2 1.5H5.8L5 9H1.5L1.3 10.5H5L4.5 14h1.5l.5-3.5h3L9 14h1.5l.5-3.5H14l.2-1.5H11l.8-3.5h3.5L15.5 4H12l.5-4H11L10.5 4h-3L8 0H6.5zm.3 5.5h3l-.8 3.5h-3l.8-3.5z"/>
  </svg>
);

export default function Sidebar({ onDmSelect, onLogout }) {
  const { rooms, currentRoom, joinRoom, connected, currentUser, createRoom } = useChat();
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    createRoom(newRoomName.trim(), '');
    setNewRoomName('');
    setShowCreate(false);
  };

  return (
    <div className="w-60 flex-shrink-0 flex flex-col sidebar-border"
      style={{ background: 'rgba(8,11,20,0.95)' }}>

      {/* App header */}
      <div className="px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366f1,#22d3ee)' }}>
            <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
              <path d="M6 8C6 6.9 6.9 6 8 6h16c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H18l-4 4v-4H8c-1.1 0-2-.9-2-2V8z" fill="white"/>
            </svg>
          </div>
          <span className="font-bold text-white text-sm tracking-tight">Yapping</span>
          <span className={`ml-auto w-2 h-2 rounded-full ${connected ? 'bg-green-400 online-pulse' : 'bg-red-400'}`}/>
        </div>
      </div>

      {/* Rooms section */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <div className="px-2 mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Channels</span>
          <button onClick={() => setShowCreate(v => !v)}
            className="w-5 h-5 flex items-center justify-center rounded text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all text-lg leading-none">
            +
          </button>
        </div>

        {showCreate && (
          <form onSubmit={handleCreate} className="px-2 mb-2 animate-fade-in">
            <input
              autoFocus
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
              placeholder="room-name"
              className="w-full px-2 py-1.5 rounded-lg text-xs text-white outline-none"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}
              onKeyDown={e => e.key === 'Escape' && setShowCreate(false)}
            />
          </form>
        )}

        {rooms.map(room => {
          const active = currentRoom === room.id;
          return (
            <button
              key={room.id}
              onClick={() => joinRoom(room.id)}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm transition-all duration-150 text-left group ${
                active
                  ? 'bg-indigo-500/15 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}>
              <span className={active ? 'text-indigo-400' : ''}><HashIcon /></span>
              <span className="truncate font-medium text-sm">
                {room.name.replace('# ', '')}
              </span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      {/* Current user footer with logout */}
      {currentUser && (
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-2.5 px-2">
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="" className="w-8 h-8 rounded-full bg-slate-700 flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                style={{ background: 'linear-gradient(135deg,#6366f1,#22d3ee)' }}>
                {currentUser.username[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{currentUser.username}</div>
              <div className="text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 online-pulse" />
                Online
              </div>
            </div>

            {/* Logout button — only shown if onLogout is provided */}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign out"
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
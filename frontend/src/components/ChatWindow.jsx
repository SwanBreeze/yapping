import React, { useEffect, useRef } from 'react';
import { useChat } from '../context/ChatContext';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';

export default function ChatWindow({ dmPeer, onCloseDm, onToggleUsers }) {
  const { messages, currentRoom, rooms, typingUsers, currentUser, dmMessages, startCall, activeCall } = useChat();
  const bottomRef = useRef(null);

  const roomMessages = dmPeer
    ? (Object.values(dmMessages).flat().filter(m =>
        (m.sender.id === dmPeer.id || m.sender.id === currentUser?.id) &&
        (m.roomId.includes(dmPeer.id) || m.roomId.includes(currentUser?.id))
      ))
    : (messages[currentRoom] || []);

  const room = rooms.find(r => r.id === currentRoom);
  const roomTypers = typingUsers[currentRoom] || {};
  const typerNames = Object.values(roomTypers).filter(n => n !== currentUser?.username);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages.length]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center px-5 py-3.5 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(8,11,20,0.8)', backdropFilter: 'blur(20px)' }}>
        {dmPeer ? (
          <>
            <button onClick={onCloseDm} className="mr-3 text-slate-500 hover:text-white transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11 2L5 8l6 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </button>
            <div className="w-8 h-8 rounded-full flex-shrink-0 mr-2.5 overflow-hidden bg-slate-700">
              {dmPeer.avatar
                ? <img src={dmPeer.avatar} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ background: 'linear-gradient(135deg,#6366f1,#22d3ee)' }}>
                    {dmPeer.username[0].toUpperCase()}
                  </div>
              }
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white text-sm">{dmPeer.username}</div>
              <div className="text-xs text-slate-500">Direct message</div>
            </div>

            {/* Voice call button in DM header */}
            <button
              onClick={() => startCall(dmPeer)}
              disabled={!!activeCall}
              title={activeCall ? 'Already in a call' : `Call ${dmPeer.username}`}
              className={`ml-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${activeCall
                  ? 'opacity-30 cursor-not-allowed text-slate-600 bg-white/5'
                  : 'text-green-400 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20'
                }`}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.1 4a2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.07 9.91a16 16 0 006.02 6.02l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              Call
            </button>
          </>
        ) : (
          <>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-lg">#</span>
                <span className="font-semibold text-white text-sm">{room?.name?.replace('# ', '') || currentRoom}</span>
              </div>
              {room?.description && <p className="text-xs text-slate-500 mt-0.5">{room.description}</p>}
            </div>
          </>
        )}

        {/* Right controls */}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={onToggleUsers}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            title="Toggle user list">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{ background: 'linear-gradient(180deg, #080b14 0%, #0a0e18 100%)' }}>

        {roomMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <span className="text-2xl">#</span>
            </div>
            <h3 className="font-semibold text-white mb-1">
              {dmPeer ? `Start chatting with ${dmPeer.username}` : `Welcome to #${room?.name?.replace('# ', '') || currentRoom}`}
            </h3>
            <p className="text-slate-500 text-sm">Send the first message to get things started!</p>
          </div>
        )}

        {roomMessages.map((msg, i) => {
          const prevMsg = roomMessages[i - 1];
          const isGrouped = prevMsg && prevMsg.sender.id === msg.sender.id
            && prevMsg.type !== 'system'
            && (new Date(msg.timestamp) - new Date(prevMsg.timestamp)) < 60000;

          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender.id === currentUser?.id}
              isGrouped={isGrouped}
            />
          );
        })}

        {/* Typing indicator */}
        {typerNames.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-1 animate-fade-in">
            <div className="flex gap-1 items-center">
              <span className="dot w-1.5 h-1.5 bg-indigo-400 rounded-full" />
              <span className="dot w-1.5 h-1.5 bg-indigo-400 rounded-full" />
              <span className="dot w-1.5 h-1.5 bg-indigo-400 rounded-full" />
            </div>
            <span className="text-xs text-slate-400">
              <span className="text-indigo-300 font-medium">{typerNames.join(', ')}</span>
              {typerNames.length === 1 ? ' is' : ' are'} typing...
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <MessageInput dmPeer={dmPeer} />
    </div>
  );
}
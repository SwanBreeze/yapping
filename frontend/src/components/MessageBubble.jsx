import React from 'react';
import { format } from 'date-fns';

function FileAttachment({ fileData }) {
  const isImage = fileData.mimeType?.startsWith('image/');
  const isAudio = fileData.mimeType?.startsWith('audio/');

  if (isImage) {
    return (
      <a href={fileData.url} target="_blank" rel="noopener noreferrer" className="block mt-2">
        <img
          src={fileData.url}
          alt={fileData.name}
          className="max-w-xs max-h-64 rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        />
      </a>
    );
  }

  if (isAudio) {
    return (
      <div className="mt-2 flex items-center gap-3 p-3 rounded-xl"
        style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-indigo-400 flex-shrink-0">
          <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill="currentColor"/>
          <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <audio controls src={fileData.url} className="flex-1 h-8" style={{ maxWidth: '220px' }} />
      </div>
    );
  }

  const sizeKB = fileData.size ? Math.round(fileData.size / 1024) : null;
  return (
    <a href={fileData.url} download={fileData.name} target="_blank" rel="noopener noreferrer"
      className="mt-2 flex items-center gap-3 p-3 rounded-xl transition-all hover:opacity-80"
      style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(99,102,241,0.2)' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-indigo-400">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2"/>
          <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
        </svg>
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-indigo-300 truncate">{fileData.name}</div>
        {sizeKB && <div className="text-xs text-slate-500 mt-0.5">{sizeKB} KB · Click to download</div>}
      </div>
    </a>
  );
}

function Avatar({ user, size = 7 }) {
  if (user.avatar) {
    return <img src={user.avatar} alt="" className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`w-${size} h-${size} rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold`}
      style={{ background: 'linear-gradient(135deg,#6366f1,#22d3ee)' }}>
      {user.username?.[0]?.toUpperCase()}
    </div>
  );
}

export default function MessageBubble({ message, isOwn, isGrouped }) {
  const { sender, content, type, fileData, timestamp, seen } = message;

  // System messages
  if (type === 'system') {
    return (
      <div className="flex items-center justify-center py-2 animate-fade-in">
        <span className="text-xs text-slate-600 px-3 py-1 rounded-full"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {content}
        </span>
      </div>
    );
  }

  const time = timestamp ? format(new Date(timestamp), 'HH:mm') : '';

  if (isOwn) {
    return (
      <div className={`flex justify-end items-end gap-2 ${isGrouped ? 'mt-0.5' : 'mt-4'} msg-enter`}>
        <div className="max-w-xs lg:max-w-md xl:max-w-lg">
          {!isGrouped && (
            <div className="flex items-center justify-end gap-2 mb-1 pr-1">
              <span className="text-xs text-slate-500">{time}</span>
              <span className="text-xs font-medium" style={{ color: '#818cf8' }}>You</span>
            </div>
          )}
          <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-white leading-relaxed"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              boxShadow: '0 4px 15px rgba(99,102,241,0.25)',
            }}>
            {content && type === 'text' && (
              <p className="whitespace-pre-wrap break-words">{content}</p>
            )}
            {fileData && <FileAttachment fileData={fileData} />}
            {type !== 'text' && content && !fileData && (
              <p className="whitespace-pre-wrap break-words">{content}</p>
            )}
          </div>
          {seen && seen.length > 0 && (
            <div className="flex justify-end mt-1 pr-1">
              <span className="text-xs text-indigo-400">✓✓ Seen</span>
            </div>
          )}
        </div>
        {!isGrouped && <Avatar user={sender} size={7} />}
        {isGrouped && <div className="w-7 flex-shrink-0" />}
      </div>
    );
  }

  // Other user's message
  return (
    <div className={`flex items-end gap-2 ${isGrouped ? 'mt-0.5' : 'mt-4'} msg-enter`}>
      {!isGrouped ? <Avatar user={sender} size={7} /> : <div className="w-7 flex-shrink-0" />}
      <div className="max-w-xs lg:max-w-md xl:max-w-lg">
        {!isGrouped && (
          <div className="flex items-center gap-2 mb-1 pl-1">
            <span className="text-xs font-semibold text-slate-300">{sender.username}</span>
            <span className="text-xs text-slate-600">{time}</span>
          </div>
        )}
        <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm text-sm text-slate-100 leading-relaxed"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
          {content && type === 'text' && (
            <p className="whitespace-pre-wrap break-words">{content}</p>
          )}
          {fileData && <FileAttachment fileData={fileData} />}
          {type !== 'text' && content && !fileData && (
            <p className="whitespace-pre-wrap break-words">{content}</p>
          )}
        </div>
      </div>
    </div>
  );
}

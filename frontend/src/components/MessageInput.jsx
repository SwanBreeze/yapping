import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useChat } from '../context/ChatContext';
import { api } from '../services/api';
import socket from '../services/socketService';
import VoiceRecorder from './VoiceRecorder';
import EmojiPicker from 'emoji-picker-react';

export default function MessageInput({ dmPeer }) {
  const { sendMessage, sendFileMessage, sendDm, currentRoom } = useChat();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeout = useRef(null);
  const isTyping = useRef(false);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // ── Typing indicator logic ─────────────────────────────────────────────
  const emitTypingStart = useCallback(() => {
    if (!isTyping.current) {
      isTyping.current = true;
      socket.emit('typing:start', { roomId: currentRoom });
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      isTyping.current = false;
      socket.emit('typing:stop', { roomId: currentRoom });
    }, 2000);
  }, [currentRoom]);

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (e.target.value) emitTypingStart();
    else {
      isTyping.current = false;
      socket.emit('typing:stop', { roomId: currentRoom });
    }
  };

  // ── Send text ─────────────────────────────────────────────────────────
  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (dmPeer) {
      sendDm(dmPeer.id, trimmed);
    } else {
      sendMessage(trimmed);
    }
    setText('');
    isTyping.current = false;
    socket.emit('typing:stop', { roomId: currentRoom });
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── File upload ───────────────────────────────────────────────────────
  const uploadAndSend = useCallback(async (file) => {
    setUploading(true);
    setUploadProgress(0);
    try {
      const fileData = await api.uploadFile(file, setUploadProgress);
      const type = file.type.startsWith('image/') ? 'image'
                 : file.type.startsWith('audio/') ? 'audio'
                 : 'file';
      if (dmPeer) {
        sendDm(dmPeer.id, fileData.name, fileData, type);
      } else {
        sendFileMessage(fileData, type);
      }
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [dmPeer, sendDm, sendFileMessage]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadAndSend(file);
    e.target.value = '';
  };

  // ── Drag & drop ───────────────────────────────────────────────────────
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadAndSend(file);
  };

  // ── Emoji ─────────────────────────────────────────────────────────────
  const onEmojiClick = (emojiData) => {
    setText(prev => prev + emojiData.emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex-shrink-0 px-4 pb-4 pt-2 relative"
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}>

      {/* Drag overlay */}
      {dragOver && (
        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl m-2"
          style={{ background: 'rgba(99,102,241,0.15)', border: '2px dashed rgba(99,102,241,0.5)' }}>
          <p className="text-indigo-300 font-medium text-sm">Drop file to send</p>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="absolute bottom-full right-4 mb-2 z-30 animate-slide-up">
          <EmojiPicker
            onEmojiClick={onEmojiClick}
            theme="dark"
            searchPlaceholder="Search emoji..."
            height={380}
            width={320}
          />
        </div>
      )}

      {/* Voice recorder */}
      {showVoice && (
        <div className="mb-2">
          <VoiceRecorder
            onRecorded={(fileData) => {
              if (dmPeer) sendDm(dmPeer.id, 'Voice message', fileData, 'audio');
              else sendFileMessage(fileData, 'audio');
              setShowVoice(false);
            }}
            onCancel={() => setShowVoice(false)}
          />
        </div>
      )}

      {/* Upload progress bar */}
      {uploading && (
        <div className="mb-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div className="h-full rounded-full transition-all duration-200"
            style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg,#6366f1,#22d3ee)' }} />
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-end gap-2 rounded-2xl px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>

        {/* Attachment button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all disabled:opacity-40"
          title="Attach file">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect}
          accept="image/*,audio/*,.pdf,.doc,.docx,.txt,.zip" />

        {/* Text area */}
        <textarea
          ref={inputRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={dmPeer ? `Message ${dmPeer.username}...` : `Message #${currentRoom}...`}
          rows={1}
          className="flex-1 resize-none text-sm text-white placeholder-slate-600 outline-none leading-relaxed"
          style={{
            background: 'transparent',
            maxHeight: '120px',
            fontFamily: 'DM Sans, sans-serif',
          }}
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
        />

        {/* Right action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Emoji */}
          <button
            onClick={() => setShowEmoji(v => !v)}
            className={`p-1.5 rounded-lg transition-all ${showEmoji ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10'}`}
            title="Emoji">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
          </button>

          {/* Voice */}
          <button
            onClick={() => setShowVoice(v => !v)}
            className={`p-1.5 rounded-lg transition-all ${showVoice ? 'text-red-400 bg-red-500/10' : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10'}`}
            title="Voice message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
            </svg>
          </button>

          {/* Send */}
          <button
            onClick={handleSend}
            disabled={!text.trim() && !uploading}
            className="p-2 rounded-xl text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: text.trim() ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'rgba(255,255,255,0.07)',
              boxShadow: text.trim() ? '0 0 15px rgba(99,102,241,0.4)' : 'none',
            }}
            title="Send (Enter)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Hint */}
      <p className="text-center text-xs text-slate-700 mt-1.5">
        Enter to send · Shift+Enter for new line · Drag & drop files
      </p>
    </div>
  );
}

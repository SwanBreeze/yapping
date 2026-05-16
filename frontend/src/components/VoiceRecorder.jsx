import React, { useState, useRef } from 'react';
import { api } from '../services/api';

export default function VoiceRecorder({ onRecorded, onCancel }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorder.current = mr;
      chunks.current = [];

      mr.ondataavailable = (e) => chunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        setUploading(true);
        try {
          const fileData = await api.uploadFile(file);
          onRecorded(fileData);
        } catch (e) {
          console.error('Voice upload failed', e);
        } finally {
          setUploading(false);
        }
      };

      mr.start();
      setRecording(true);
      setSeconds(0);
      timer.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch {
      alert('Microphone access denied');
    }
  };

  const stop = () => {
    clearInterval(timer.current);
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (uploading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{ background: 'rgba(99,102,241,0.15)' }}>
        <svg className="animate-spin w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".3"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <span className="text-xs text-indigo-300">Uploading audio...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl"
      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
      {/* Animated waveform */}
      {recording && (
        <div className="flex items-center gap-0.5 h-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="waveform-bar w-0.5 bg-red-400 rounded-full"
              style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      )}
      <span className="text-xs font-mono text-red-400">{fmt(seconds)}</span>

      {!recording ? (
        <button onClick={start}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-white transition-all"
          style={{ background: 'rgba(239,68,68,0.7)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <circle cx="6" cy="6" r="6"/>
          </svg>
          Record
        </button>
      ) : (
        <button onClick={stop}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium text-white transition-all"
          style={{ background: 'rgba(239,68,68,0.8)' }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect width="12" height="12" rx="2"/>
          </svg>
          Stop & Send
        </button>
      )}

      <button onClick={onCancel}
        className="ml-auto text-slate-500 hover:text-slate-300 transition-colors text-xs">
        Cancel
      </button>
    </div>
  );
}

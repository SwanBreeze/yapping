/**
 * VoiceCall.jsx — WebRTC Voice Call Component
 *
 * Handles three states:
 *  - "outgoing"  : caller is waiting for the other person to pick up
 *  - "incoming"  : someone is calling you (ring ring!)
 *  - "active"    : call is connected, showing duration + controls
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

export default function VoiceCall({ call, currentUser, onEnd }) {
  /**
   * call shape:
   *  {
   *    type: 'outgoing' | 'incoming' | 'active',
   *    callId: string,
   *    peer: { id, username, avatar },   // who you're calling / who's calling
   *    offer: RTCSessionDescription,      // only on incoming
   *    peerSocketId: string,              // socket ID to relay ICE to
   *  }
   */

  const { type, callId, peer, offer, socket } = call;

  // WebRTC refs — don't put these in state, they're not React-managed
  const pcRef = useRef(null);           // RTCPeerConnection
  const localStreamRef = useRef(null);  // our mic stream
  const remoteAudioRef = useRef(null);  // <audio> element for remote audio

  const [callState, setCallState] = useState(type); // 'outgoing' | 'incoming' | 'active'
  const [duration, setDuration] = useState(0);       // seconds since connected
  const [muted, setMuted] = useState(false);
  const [speakerOff, setSpeakerOff] = useState(false);
  const [error, setError] = useState(null);

  const timerRef = useRef(null);
  const peerIdRef = useRef(peer.id);    // stable ref for event handlers

  // ── ICE / STUN config ────────────────────────────────────────────────
  const RTC_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // ── Helpers ──────────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  }, []);

  const stopTimer = useCallback(() => {
    clearInterval(timerRef.current);
  }, []);

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  /** Create RTCPeerConnection and wire up events */
  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    // When we get remote audio tracks, pipe them to the <audio> element
    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    // Relay ICE candidates to the remote peer via socket
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('call:ice', {
          toUserId: peerIdRef.current,
          candidate: event.candidate,
          callId,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallState('active');
        startTimer();
      }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        handleEnd(false);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [callId, socket, startTimer]);

  /** Get microphone access and add tracks to the peer connection */
  const addLocalStream = useCallback(async (pc) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      return stream;
    } catch (err) {
      setError('Microphone access denied. Please allow mic access and try again.');
      throw err;
    }
  }, []);

  /** Clean up WebRTC and media */
  const cleanup = useCallback(() => {
    stopTimer();
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
  }, [stopTimer]);

  /** End the call (local action or remote hangup) */
  const handleEnd = useCallback((notify = true) => {
    if (notify) {
      socket.emit('call:end', { callId, toUserId: peerIdRef.current });
    }
    cleanup();
    onEnd();
  }, [callId, socket, cleanup, onEnd]);

  /** Decline incoming call */
  const handleDecline = useCallback(() => {
    socket.emit('call:decline', { callId, toUserId: peerIdRef.current });
    cleanup();
    onEnd();
  }, [callId, socket, cleanup, onEnd]);

  // ── OUTGOING: create offer ────────────────────────────────────────────
  useEffect(() => {
    if (type !== 'outgoing') return;

    let cancelled = false;
    (async () => {
      try {
        const pc = createPeerConnection();
        await addLocalStream(pc);
        if (cancelled) return;

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('call:offer', {
          toUserId: peer.id,
          offer: pc.localDescription,
          callerInfo: { id: currentUser.id, username: currentUser.username },
        });
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── INCOMING: accept answer ────────────────────────────────────────────
  const handleAccept = useCallback(async () => {
    setCallState('connecting');
    try {
      const pc = createPeerConnection();
      await addLocalStream(pc);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call:answer', {
        callId,
        answer: pc.localDescription,
        toUserId: peer.id,
      });
    } catch (err) {
      setError(err.message);
    }
  }, [addLocalStream, callId, createPeerConnection, offer, peer.id, socket]);

  // ── Socket event listeners ────────────────────────────────────────────
  useEffect(() => {
    const onAnswered = async ({ answer }) => {
      try {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        setError(err.message);
      }
    };

    const onIce = async ({ candidate }) => {
      try {
        if (pcRef.current && candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        // ICE errors are usually non-fatal, log quietly
        console.warn('ICE error:', err);
      }
    };

    const onEnded = () => handleEnd(false);
    const onDeclined = () => { cleanup(); onEnd(); };

    socket.on('call:answered', onAnswered);
    socket.on('call:ice', onIce);
    socket.on('call:ended', onEnded);
    socket.on('call:declined', onDeclined);

    return () => {
      socket.off('call:answered', onAnswered);
      socket.off('call:ice', onIce);
      socket.off('call:ended', onEnded);
      socket.off('call:declined', onDeclined);
    };
  }, [cleanup, handleEnd, onEnd, socket]);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup]);

  // ── Mute / Speaker ────────────────────────────────────────────────────
  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  };

  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !speakerOff;
    }
    setSpeakerOff(s => !s);
  };

  // ── Avatar helper ─────────────────────────────────────────────────────
  const Avatar = ({ user, size = 'lg' }) => {
    const sz = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-10 h-10 text-sm';
    if (user.avatar) {
      return <img src={user.avatar} alt="" className={`${sz} rounded-full object-cover`} />;
    }
    return (
      <div className={`${sz} rounded-full flex items-center justify-center font-bold text-white`}
        style={{ background: 'linear-gradient(135deg,#6366f1,#22d3ee)' }}>
        {user.username?.[0]?.toUpperCase()}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}>

      {/* Hidden audio element — plays remote audio */}
      <audio ref={remoteAudioRef} autoPlay playsInline muted={speakerOff} />

      <div className="relative w-80 rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(160deg, #0f1628 0%, #0a0e1a 100%)',
          border: '1px solid rgba(99,102,241,0.2)',
          boxShadow: '0 0 60px rgba(99,102,241,0.15)',
        }}>

        {/* Top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px"
          style={{ background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.6),transparent)' }} />

        <div className="px-8 pt-10 pb-8 flex flex-col items-center gap-6">

          {/* Avatar with ring animation */}
          <div className="relative">
            {(callState === 'incoming' || callState === 'outgoing') && (
              <>
                <div className="absolute inset-0 rounded-full animate-ping opacity-20"
                  style={{ background: 'rgba(99,102,241,0.5)', animationDuration: '1.5s' }} />
                <div className="absolute -inset-3 rounded-full animate-ping opacity-10"
                  style={{ background: 'rgba(99,102,241,0.3)', animationDuration: '2s' }} />
              </>
            )}
            <Avatar user={peer} size="lg" />
            {callState === 'active' && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-400 border-2 border-[#0a0e1a] flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-green-900 animate-pulse" />
              </span>
            )}
          </div>

          {/* Name & status */}
          <div className="text-center">
            <h2 className="text-white font-semibold text-xl">{peer.username}</h2>
            <p className="text-slate-400 text-sm mt-1">
              {callState === 'outgoing' && 'Calling…'}
              {callState === 'incoming' && 'Incoming voice call'}
              {callState === 'connecting' && 'Connecting…'}
              {callState === 'active' && (
                <span className="flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                  {formatDuration(duration)}
                </span>
              )}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="w-full rounded-xl px-4 py-3 text-xs text-red-300 text-center"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {/* ── INCOMING: Accept / Decline ── */}
          {callState === 'incoming' && (
            <div className="flex gap-6 mt-2">
              {/* Decline */}
              <button onClick={handleDecline}
                className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-red-400"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.07 8.63 19.79 19.79 0 01.1 4a2 2 0 012-2.18h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.07 9.91a16 16 0 004.61 3.4z"/>
                    <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <span className="text-xs text-slate-500">Decline</span>
              </button>

              {/* Accept */}
              <button onClick={handleAccept}
                className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                  style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-green-400"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63 19.79 19.79 0 01.1 4a2 2 0 012-2.18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.07 9.91a16 16 0 006.02 6.02l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                </div>
                <span className="text-xs text-slate-500">Accept</span>
              </button>
            </div>
          )}

          {/* ── OUTGOING / ACTIVE: controls ── */}
          {(callState === 'outgoing' || callState === 'active' || callState === 'connecting') && (
            <div className="flex gap-4 mt-2 items-center">

              {/* Mute */}
              {callState === 'active' && (
                <button onClick={toggleMute}
                  className="flex flex-col items-center gap-2 group">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-110 ${
                    muted
                      ? 'bg-red-500/20 border border-red-500/40'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    {muted ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-red-400"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="1" y1="1" x2="23" y2="23"/>
                        <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
                        <path d="M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-slate-300"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                        <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-slate-600">{muted ? 'Unmute' : 'Mute'}</span>
                </button>
              )}

              {/* End call — always visible */}
              <button onClick={() => handleEnd(true)}
                className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                  style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-white"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 013.07 8.63 19.79 19.79 0 01.1 4a2 2 0 012-2.18h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.07 9.91a16 16 0 004.61 3.4z"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </div>
                <span className="text-xs text-slate-500">
                  {callState === 'outgoing' ? 'Cancel' : 'End'}
                </span>
              </button>

              {/* Speaker */}
              {callState === 'active' && (
                <button onClick={toggleSpeaker}
                  className="flex flex-col items-center gap-2 group">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all group-hover:scale-110 ${
                    speakerOff
                      ? 'bg-red-500/20 border border-red-500/40'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    {speakerOff ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-red-400"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <line x1="23" y1="9" x2="17" y2="15"/>
                        <line x1="17" y1="9" x2="23" y2="15"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-slate-300"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                        <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-slate-600">{speakerOff ? 'Speaker' : 'Mute spk'}</span>
                </button>
              )}
            </div>
          )}

        </div>

        {/* Bottom indicator */}
        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-slate-700">
            {callState === 'active' ? 'End-to-end encrypted · WebRTC' : 'NexusChat Voice'}
          </p>
        </div>
      </div>
    </div>
  );
}

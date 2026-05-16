import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import socket from '../services/socketService';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [currentUser, setCurrentUser]   = useState(null);
  const [messages, setMessages]         = useState({});
  const [users, setUsers]               = useState([]);
  const [rooms, setRooms]               = useState([]);
  const [currentRoom, setCurrentRoom]   = useState('general');
  const [typingUsers, setTypingUsers]   = useState({});
  const [connected, setConnected]       = useState(false);
  const [dmMessages, setDmMessages]     = useState({});

  // ── NEW: unread DM counts ──────────────────────────────────────────────
  // { peerId: number }  — incremented on incoming DM, cleared when you open that DM
  const [dmUnread, setDmUnread]         = useState({});

  // ── NEW: active DM peer (lifted here so UserList can read unread counts) 
  const [activeDmPeer, setActiveDmPeer] = useState(null);

  // ── Voice call state ───────────────────────────────────────────────────
  const [activeCall, setActiveCall]     = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);

  const typingTimeouts = useRef({});
  const currentUserRef = useRef(null); // stable ref used in event handlers

  // Keep ref in sync
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // ── Request browser notification permission on mount ───────────────────
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  /** Fire a browser notification (only when tab is not focused) */
  const notify = useCallback((title, body, icon) => {
    if (document.hasFocus()) return;                         // user is already looking
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        silent: false,
      });
    } catch (_) {}
  }, []);

  // ── SOCKET EVENT HANDLERS ──────────────────────────────────────────────
  useEffect(() => {
    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onInit = ({ me, rooms: r, users: u, messages: m, currentRoom: cr }) => {
      setCurrentUser(me);
      setRooms(r);
      setUsers(u);
      setMessages({ [cr]: m });
      setCurrentRoom(cr);
    };

    const onNewMessage = (msg) => {
      setMessages(prev => ({
        ...prev,
        [msg.roomId]: [...(prev[msg.roomId] || []), msg],
      }));
    };

    const onUserConnected = ({ user }) => {
      setUsers(prev => prev.find(u => u.id === user.id) ? prev : [...prev, user]);
    };

    const onUserDisconnected = ({ userId }) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
      setActiveCall(prev  => prev?.peer?.id  === userId ? null : prev);
      setIncomingCall(prev => prev?.peer?.id === userId ? null : prev);
    };

    const onTypingUpdate = ({ userId, username, roomId, isTyping }) => {
      setTypingUsers(prev => {
        const rt = { ...(prev[roomId] || {}) };
        if (isTyping) rt[userId] = username; else delete rt[userId];
        return { ...prev, [roomId]: rt };
      });
      if (isTyping) {
        clearTimeout(typingTimeouts.current[userId]);
        typingTimeouts.current[userId] = setTimeout(() => {
          setTypingUsers(prev => {
            const rt = { ...(prev[roomId] || {}) };
            delete rt[userId];
            return { ...prev, [roomId]: rt };
          });
        }, 3000);
      }
    };

    const onRoomJoined = ({ roomId, messages: m }) => {
      setCurrentRoom(roomId);
      setMessages(prev => ({ ...prev, [roomId]: m }));
    };

    const onRoomCreated = (room) => {
      setRooms(prev => [...prev, room]);
    };

    // ── DM handler — the key fix ─────────────────────────────────────────
    const onDmMessage = (msg) => {
      // Store the message
      setDmMessages(prev => ({
        ...prev,
        [msg.roomId]: [...(prev[msg.roomId] || []), msg],
      }));

      const me = currentUserRef.current;
      if (!me) return;

      const isFromMe = msg.sender.id === me.id;
      if (isFromMe) return; // don't notify yourself

      // The sender is the peer
      const senderId = msg.sender.id;

      // Only increment unread if this DM chat is NOT currently open
      setActiveDmPeer(currentPeer => {
        const chatIsOpen = currentPeer?.id === senderId;
        if (!chatIsOpen) {
          // Increment unread badge
          setDmUnread(prev => ({ ...prev, [senderId]: (prev[senderId] || 0) + 1 }));

          // Browser notification
          notify(
            `${msg.sender.username} sent you a message`,
            msg.type === 'text' ? msg.content : `📎 ${msg.type === 'audio' ? 'Voice message' : 'File'}`,
            msg.sender.avatar,
          );

          // In-app tab title flash
          document.title = `💬 New message from ${msg.sender.username} — Yapping`;
          setTimeout(() => { document.title = 'Yapping — Real-time Messaging'; }, 4000);
        }
        return currentPeer; // don't change the peer, just read it
      });
    };

    const onSeenUpdate = ({ messageId, roomId, seenBy }) => {
      setMessages(prev => {
        const roomMsgs = [...(prev[roomId] || [])];
        const idx = roomMsgs.findIndex(m => m.id === messageId);
        if (idx !== -1) {
          roomMsgs[idx] = { ...roomMsgs[idx], seen: [...(roomMsgs[idx].seen || []), seenBy] };
        }
        return { ...prev, [roomId]: roomMsgs };
      });
    };

    // ── Voice call events ────────────────────────────────────────────────
    const onCallIncoming = ({ callId, from, offer }) => {
      if (activeCall) {
        socket.emit('call:decline', { callId, toUserId: from.id });
        return;
      }
      setIncomingCall({ type: 'incoming', callId, peer: from, offer, socket });
      notify(`📞 ${from.username} is calling you`, 'Tap to answer', from.avatar);
    };

    const onCallInitiated = ({ callId }) => {
      setActiveCall(prev => prev ? { ...prev, callId } : prev);
    };

    const onCallEnded   = () => { setActiveCall(null); setIncomingCall(null); };
    const onCallDeclined = () => { setActiveCall(null); };

    socket.on('connect',            onConnect);
    socket.on('disconnect',         onDisconnect);
    socket.on('init',               onInit);
    socket.on('message:new',        onNewMessage);
    socket.on('user:connected',     onUserConnected);
    socket.on('user:disconnected',  onUserDisconnected);
    socket.on('typing:update',      onTypingUpdate);
    socket.on('room:joined',        onRoomJoined);
    socket.on('room:created',       onRoomCreated);
    socket.on('dm:message',         onDmMessage);
    socket.on('message:seenUpdate', onSeenUpdate);
    socket.on('call:incoming',      onCallIncoming);
    socket.on('call:initiated',     onCallInitiated);
    socket.on('call:ended',         onCallEnded);
    socket.on('call:declined',      onCallDeclined);

    return () => {
      socket.off('connect',            onConnect);
      socket.off('disconnect',         onDisconnect);
      socket.off('init',               onInit);
      socket.off('message:new',        onNewMessage);
      socket.off('user:connected',     onUserConnected);
      socket.off('user:disconnected',  onUserDisconnected);
      socket.off('typing:update',      onTypingUpdate);
      socket.off('room:joined',        onRoomJoined);
      socket.off('room:created',       onRoomCreated);
      socket.off('dm:message',         onDmMessage);
      socket.off('message:seenUpdate', onSeenUpdate);
      socket.off('call:incoming',      onCallIncoming);
      socket.off('call:initiated',     onCallInitiated);
      socket.off('call:ended',         onCallEnded);
      socket.off('call:declined',      onCallDeclined);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── ACTIONS ───────────────────────────────────────────────────────────

  const joinRoom = useCallback((roomId) => socket.emit('room:join', { roomId }), []);

  const sendMessage = useCallback((content) => {
    socket.emit('message:send', { roomId: currentRoom, content });
  }, [currentRoom]);

  const sendFileMessage = useCallback((fileData, type) => {
    socket.emit('message:file', { roomId: currentRoom, fileData, type });
  }, [currentRoom]);

  const sendDm = useCallback((toUserId, content, fileData = null, type = 'text') => {
    socket.emit('dm:send', { toUserId, content, fileData, type });
  }, []);

  const markSeen = useCallback((messageId) => {
    socket.emit('message:seen', { messageId, roomId: currentRoom });
  }, [currentRoom]);

  const createRoom = useCallback((name, description) => {
    socket.emit('room:create', { name, description });
  }, []);

  /** Open a DM with a peer — clears their unread count */
  const openDm = useCallback((peer) => {
    setActiveDmPeer(peer);
    if (peer) {
      setDmUnread(prev => ({ ...prev, [peer.id]: 0 }));
    }
  }, []);

  const closeDm = useCallback(() => setActiveDmPeer(null), []);

  // Voice call actions
  const startCall = useCallback((peer) => {
    if (activeCall) return;
    setActiveCall({ type: 'outgoing', callId: null, peer, socket });
  }, [activeCall]);

  const endCall = useCallback(() => {
    setActiveCall(null);
    setIncomingCall(null);
  }, []);

  return (
    <ChatContext.Provider value={{
      currentUser, setCurrentUser,
      messages, rooms, users, currentRoom,
      typingUsers, connected, dmMessages,
      dmUnread,           // { peerId: unreadCount }
      activeDmPeer,       // currently open DM peer (or null)
      joinRoom, sendMessage, sendFileMessage,
      sendDm, markSeen, createRoom,
      openDm, closeDm,    // use these instead of local setState for DM peer
      // Voice call
      activeCall, incomingCall,
      startCall, endCall,
      socket,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used inside ChatProvider');
  return ctx;
}
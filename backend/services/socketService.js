/**
 * socketService.js — Core Real-Time Communication Engine
 *
 * HOW SOCKET.IO WORKS (beginner-friendly explanation):
 * ─────────────────────────────────────────────────────
 * 1. A client (browser) connects → server fires "connection" event
 * 2. Each connection gets a unique socket object with a unique socket.id
 * 3. Either side can "emit" (send) named events with data payloads
 * 4. The other side "listens" with socket.on('eventName', callback)
 * 5. Disconnect is automatic if the browser tab closes or network drops
 *
 * ROOMS (chat rooms / private messaging):
 * ─────────────────────────────────────────────────────
 * Socket.IO has a built-in concept of "rooms". A socket can join/leave
 * rooms, and you can emit to just that room.
 *   socket.join('room-id')       → join a room
 *   io.to('room-id').emit(...)   → broadcast to everyone in that room
 *   socket.to('room-id').emit(…) → broadcast to room EXCEPT the sender
 *
 * VOICE CALL SIGNALING (WebRTC):
 * ─────────────────────────────────────────────────────
 * WebRTC peers need to exchange "signaling" messages to establish a
 * direct audio connection. The server is just a relay — it never touches
 * the actual audio. Flow:
 *   Caller  → call:offer   → Server → Callee
 *   Callee  → call:answer  → Server → Caller
 *   Either  → call:ice     → Server → Other   (ICE candidates)
 *   Either  → call:end     → Server → Other
 */

const { v4: uuidv4 } = require('uuid');

// In-memory stores (for a production app, use Redis)
const connectedUsers = new Map();   // socketId → user object
const rooms = new Map();            // roomId   → room object
const messages = new Map();         // roomId   → message[]
const activeCalls = new Map();      // callId   → { callerId, calleeId, startedAt }

// Pre-seed a few public chat rooms
const DEFAULT_ROOMS = [
  { id: 'general',   name: '# general',    description: 'Main lobby for everyone' },
  { id: 'tech',      name: '# tech-talk',  description: 'Discuss tech & networking' },
  { id: 'random',    name: '# random',     description: 'Anything goes!' },
];
DEFAULT_ROOMS.forEach(r => {
  rooms.set(r.id, { ...r, members: new Set() });
  messages.set(r.id, []);
});

// ─── HELPERS ───────────────────────────────────────────────────────────────

/** Serialize a room for sending over the wire (Sets aren't JSON-safe) */
function serializeRoom(room) {
  return {
    id: room.id,
    name: room.name,
    description: room.description,
    memberCount: room.members.size,
  };
}

/** Build the public user list (no private socket IDs) */
function getPublicUsers() {
  return Array.from(connectedUsers.values()).map(u => ({
    id: u.id,
    username: u.username,
    avatar: u.avatar,
    status: u.status,
  }));
}

/** Create a formatted message object */
function buildMessage({ roomId, sender, content, type = 'text', fileData = null }) {
  return {
    id: uuidv4(),
    roomId,
    sender: {
      id: sender.id,
      username: sender.username,
      avatar: sender.avatar,
    },
    content,
    type,           // 'text' | 'image' | 'file' | 'audio' | 'system'
    fileData,       // { url, name, size, mimeType } for non-text messages
    timestamp: new Date().toISOString(),
    seen: [],       // array of user IDs who have seen the message
    delivered: [],  // array of user IDs who received the message
  };
}

// ─── MAIN INIT FUNCTION ───────────────────────────────────────────────────

let io;

function initSocket(server) {
  io = require('socket.io')(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Max file size for socket payloads (voice memos sent as base64 blobs)
    maxHttpBufferSize: 10e6, // 10 MB
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ── 1. JOIN / AUTHENTICATE ────────────────────────────────────────────
    socket.on('user:join', ({ username, avatar }) => {
      const user = {
        id: socket.id,
        username: username || `User_${socket.id.slice(0, 4)}`,
        avatar: avatar || null,
        status: 'online',
        socketId: socket.id,
        joinedAt: new Date().toISOString(),
        typingIn: null,
      };

      connectedUsers.set(socket.id, user);

      socket.join('general');
      rooms.get('general').members.add(socket.id);

      socket.emit('init', {
        me: user,
        rooms: Array.from(rooms.values()).map(serializeRoom),
        users: getPublicUsers(),
        messages: messages.get('general'),
        currentRoom: 'general',
      });

      socket.broadcast.emit('user:connected', {
        user: { id: user.id, username: user.username, avatar: user.avatar, status: 'online' },
      });

      const sysMsg = buildMessage({
        roomId: 'general',
        sender: { id: 'system', username: 'System', avatar: null },
        content: `${user.username} joined the chat`,
        type: 'system',
      });
      messages.get('general').push(sysMsg);
      io.to('general').emit('message:new', sysMsg);

      console.log(`👤 ${user.username} joined (${socket.id})`);
    });

    // ── 2. ROOM MANAGEMENT ────────────────────────────────────────────────

    socket.on('room:join', ({ roomId }) => {
      const user = connectedUsers.get(socket.id);
      if (!user || !rooms.has(roomId)) return;

      for (const [rid, room] of rooms) {
        room.members.delete(socket.id);
        socket.leave(rid);
      }

      socket.join(roomId);
      rooms.get(roomId).members.add(socket.id);

      socket.emit('room:joined', {
        roomId,
        messages: messages.get(roomId) || [],
        memberCount: rooms.get(roomId).members.size,
      });

      socket.to(roomId).emit('room:memberJoined', {
        user: { id: user.id, username: user.username },
        roomId,
      });
    });

    socket.on('room:create', ({ name, description }) => {
      const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (rooms.has(id)) {
        socket.emit('error', { message: 'Room already exists' });
        return;
      }
      const room = { id, name: `# ${name}`, description: description || '', members: new Set() };
      rooms.set(id, room);
      messages.set(id, []);
      io.emit('room:created', serializeRoom(room));
    });

    // ── 3. MESSAGING ──────────────────────────────────────────────────────

    socket.on('message:send', ({ roomId, content }) => {
      const user = connectedUsers.get(socket.id);
      if (!user || !content?.trim()) return;

      const msg = buildMessage({ roomId, sender: user, content: content.trim() });
      
      if (!messages.has(roomId)) messages.set(roomId, []);
      messages.get(roomId).push(msg);

      io.to(roomId).emit('message:new', msg);
    });

    socket.on('message:file', ({ roomId, fileData, type }) => {
      const user = connectedUsers.get(socket.id);
      if (!user || !fileData?.url) return;

      const msg = buildMessage({
        roomId,
        sender: user,
        content: fileData.name || 'File',
        type,
        fileData,
      });

      if (!messages.has(roomId)) messages.set(roomId, []);
      messages.get(roomId).push(msg);

      io.to(roomId).emit('message:new', msg);
    });

    // ── 4. TYPING INDICATORS ──────────────────────────────────────────────

    socket.on('typing:start', ({ roomId }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;
      user.typingIn = roomId;
      socket.to(roomId).emit('typing:update', {
        userId: user.id,
        username: user.username,
        roomId,
        isTyping: true,
      });
    });

    socket.on('typing:stop', ({ roomId }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;
      user.typingIn = null;
      socket.to(roomId).emit('typing:update', {
        userId: user.id,
        username: user.username,
        roomId,
        isTyping: false,
      });
    });

    // ── 5. PRIVATE MESSAGING ─────────────────────────────────────────────

    socket.on('dm:send', ({ toUserId, content, fileData, type = 'text' }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const dmRoomId = [socket.id, toUserId].sort().join(':');
      
      if (!messages.has(dmRoomId)) messages.set(dmRoomId, []);

      const msg = buildMessage({
        roomId: dmRoomId,
        sender: user,
        content,
        type,
        fileData,
      });
      messages.get(dmRoomId).push(msg);

      socket.emit('dm:message', msg);
      socket.to(toUserId).emit('dm:message', msg);
    });

    // ── 6. SEEN / DELIVERED ───────────────────────────────────────────────

    socket.on('message:seen', ({ messageId, roomId }) => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      const roomMessages = messages.get(roomId) || [];
      const msg = roomMessages.find(m => m.id === messageId);
      if (msg && !msg.seen.includes(user.id)) {
        msg.seen.push(user.id);
        io.to(roomId).emit('message:seenUpdate', { messageId, seenBy: user.id });
      }
    });

    // ── 7. VOICE CALL SIGNALING (WebRTC) ──────────────────────────────────
    /**
     * The server never handles audio — it only relays signaling messages
     * so the two peers can discover each other and negotiate a direct
     * audio channel via WebRTC.
     *
     * Flow:
     *  1. Caller emits  call:offer   → server relays to callee
     *  2. Callee emits  call:answer  → server relays to caller
     *  3. Both emit     call:ice     → server relays ICE candidates
     *  4. Either emits  call:end     → server notifies the other peer
     */

    /** Step 1 — Caller initiates a call */
    socket.on('call:offer', ({ toUserId, offer, callerInfo }) => {
      const caller = connectedUsers.get(socket.id);
      if (!caller) return;

      const callId = uuidv4();
      activeCalls.set(callId, {
        callerId: socket.id,
        calleeId: toUserId,
        startedAt: new Date().toISOString(),
      });

      console.log(`📞 Call offer: ${caller.username} → ${toUserId} (callId: ${callId})`);

      // Forward the offer to the callee
      socket.to(toUserId).emit('call:incoming', {
        callId,
        from: {
          id: caller.id,
          username: caller.username,
          avatar: caller.avatar,
        },
        offer,
      });

      // Tell the caller their callId so they can reference it later
      socket.emit('call:initiated', { callId });
    });

    /** Step 2 — Callee accepts and sends back an answer */
    socket.on('call:answer', ({ callId, answer, toUserId }) => {
      console.log(`✅ Call answered: callId ${callId}`);
      socket.to(toUserId).emit('call:answered', { callId, answer });
    });

    /** Step 3 — ICE candidate exchange (both directions) */
    socket.on('call:ice', ({ toUserId, candidate, callId }) => {
      socket.to(toUserId).emit('call:ice', { candidate, callId, fromUserId: socket.id });
    });

    /** Callee declines the incoming call */
    socket.on('call:decline', ({ callId, toUserId }) => {
      const user = connectedUsers.get(socket.id);
      console.log(`❌ Call declined: callId ${callId}`);
      activeCalls.delete(callId);
      socket.to(toUserId).emit('call:declined', { callId });
    });

    /** Either side ends the call */
    socket.on('call:end', ({ callId, toUserId }) => {
      const user = connectedUsers.get(socket.id);
      console.log(`📵 Call ended: callId ${callId} by ${user?.username}`);
      activeCalls.delete(callId);
      socket.to(toUserId).emit('call:ended', { callId });
    });

    // ── 8. DISCONNECT ────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      const user = connectedUsers.get(socket.id);
      if (!user) return;

      // End any active calls this user was in
      for (const [callId, call] of activeCalls) {
        if (call.callerId === socket.id || call.calleeId === socket.id) {
          const otherId = call.callerId === socket.id ? call.calleeId : call.callerId;
          socket.to(otherId).emit('call:ended', { callId });
          activeCalls.delete(callId);
        }
      }

      for (const [, room] of rooms) room.members.delete(socket.id);
      connectedUsers.delete(socket.id);

      io.emit('user:disconnected', { userId: socket.id });

      console.log(`❌ ${user.username} disconnected`);
    });
  });

  return io;
}

module.exports = { initSocket };
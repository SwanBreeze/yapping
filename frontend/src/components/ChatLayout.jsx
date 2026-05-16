import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import UserList from './UserList';
import VoiceCall from './VoiceCall';
import { useChat } from '../context/ChatContext';

export default function ChatLayout({ user, onLogout }) {
  const [showUsers, setShowUsers] = useState(true);

  const { activeCall, incomingCall, endCall, currentUser, activeDmPeer, openDm, closeDm } = useChat();

  const displayCall = activeCall || incomingCall;

  return (
    <div className="h-full w-full flex overflow-hidden" style={{ background: '#080b14' }}>

      <Sidebar onDmSelect={openDm} onLogout={onLogout} />

      <div className="flex-1 flex flex-col min-w-0">
        <ChatWindow
          dmPeer={activeDmPeer}
          onCloseDm={closeDm}
          onToggleUsers={() => setShowUsers(v => !v)}
          onDmSelect={openDm}
        />
      </div>

      {showUsers && (
        <UserList onDmSelect={openDm} />
      )}

      {displayCall && (
        <VoiceCall
          call={displayCall}
          currentUser={currentUser}
          onEnd={endCall}
        />
      )}
    </div>
  );
}
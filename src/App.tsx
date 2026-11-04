
import React, { useState, useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import {
  UserProfile,
  RoomData,
} from './types';
import { roomManager } from './services/roomManager';
import { Navbar } from './components/Navbar';
import { LandingAuth } from './components/LandingAuth';
import { Dashboard } from './components/Dashboard';
import { GuestJoinModal } from './components/GuestJoinModal';
import { RoomView } from './components/RoomView';
import { ExportHtmlModal } from './components/ExportHtmlModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
  const [urlRoomCode, setUrlRoomCode] = useState<string | null>(null);
  const [showGuestModal, setShowGuestModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [meetingEndedNotice, setMeetingEndedNotice] = useState<string | null>(null);

  // Restore the existing meeting after browser refresh
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await roomManager.ensureConfigured();
        const savedUser = roomManager.getLocalUser();

        if (savedUser) {
          setCurrentUser(savedUser);
        }

        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');

        if (roomParam) {
          const code = roomParam.trim().toUpperCase();
          setUrlRoomCode(code);

          if (savedUser) {
            try {
              await handleJoinExistingRoom(code, savedUser);
            } catch (err) {
              setMeetingEndedNotice(
                err instanceof Error
                  ? err.message
                  : 'Unable to restore the meeting.'
              );

              setUrlRoomCode(null);
              window.history.replaceState(
                {},
                '',
                window.location.pathname
              );
            }
          } else {
            setShowGuestModal(true);
          }
        }
      } catch (err) {
        console.error('App initialization error:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Google Login
  const handleGoogleLogin = async () => {
    try {
      const user = await roomManager.signInWithGoogle();

      setCurrentUser(user);
      setShowGuestModal(false);

      if (urlRoomCode) {
        try {
          await handleJoinExistingRoom(urlRoomCode, user);
        } catch (err) {
          setMeetingEndedNotice(
            err instanceof Error ? err.message : 'Unable to join the meeting.'
          );
          setUrlRoomCode(null);
          window.history.replaceState({}, '', window.location.pathname);
        }
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      alert(err instanceof Error ? err.message : 'Google sign in failed');
    }
  };

  // Guest Login
  const handleGuestJoin = async (
    guestName: string,
    targetCode?: string
  ) => {
    const code = targetCode || urlRoomCode;

    if (!code) return;

    const guestUser = roomManager.joinAsGuest(guestName);

    setCurrentUser(guestUser);
    setShowGuestModal(false);

    try {
      await handleJoinExistingRoom(code, guestUser);
    } catch (err) {
      setMeetingEndedNotice(
        err instanceof Error ? err.message : 'Unable to join the meeting.'
      );

      setUrlRoomCode(null);
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // Create Room
  const handleCreateRoom = async (): Promise<RoomData> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const adminUser = {
      ...currentUser,
      role: 'admin' as const,
    };

    setCurrentUser(adminUser);
    roomManager.saveLocalUser(adminUser);

    const room = await roomManager.createRoom(adminUser);

    setCurrentRoom(room);
    setUrlRoomCode(room.code);

    const newUrl = `${window.location.pathname}?room=${room.code}`;

    window.history.replaceState({}, '', newUrl);

    return room;
  };

  // Join Existing Room
  async function handleJoinExistingRoom(
    code: string,
    userToJoin?: UserProfile
  ) {
    const user = userToJoin || currentUser;

    if (!user) {
      throw new Error('Please login before joining the room.');
    }

    const normalizedCode = code.trim().toUpperCase();

    // Find actual room
    const existingRoom = await roomManager.findRoomByCode(normalizedCode);

    if (!existingRoom) {
      throw new Error('Room not found. Please check the room code.');
    }

    if (existingRoom.status === 'ended') {
      throw new Error('This meeting has already been ended by the Host.');
    }

    // Join existing room
    const joinedRoom = await roomManager.joinRoom(
      existingRoom.id,
      user,
      existingRoom
    );

    if (!joinedRoom || joinedRoom.status === 'ended') {
      throw new Error('Unable to join this meeting.');
    }

    joinedRoom.participants = joinedRoom.participants || {};

    if (!joinedRoom.participants[user.id]) {
      joinedRoom.participants[user.id] = {
        id: user.id,
        name: user.name,
        role: user.role === 'admin' ? 'admin' : 'guest',
        isMuted: false,
        isCameraOff: false,
        joinedAt: Date.now(),
        photoURL: user.photoURL,
      };
    }

    setCurrentUser(user);
    setCurrentRoom(joinedRoom);
    setShowGuestModal(false);
    setMeetingEndedNotice(null);

    const newUrl = `${window.location.pathname}?room=${normalizedCode}`;

    window.history.replaceState({}, '', newUrl);
  }

  // Sign Out
  const handleSignOut = async () => {
    await roomManager.signOut();

    setCurrentUser(null);
    setCurrentRoom(null);
    setUrlRoomCode(null);

    window.history.replaceState({}, '', window.location.pathname);
  };

  // Leave Room
  const handleLeaveRoom = async () => {
    if (currentRoom && currentUser) {
      const isRoomAdmin =
        currentUser.role === 'admin' ||
        currentRoom.adminId === currentUser.id;

      if (isRoomAdmin) {
        await roomManager.endRoom(currentRoom.id);
      } else {
        await roomManager.leaveRoom(currentRoom.id, currentUser.id);
      }
    }

    setCurrentRoom(null);
    setUrlRoomCode(null);

    window.history.replaceState({}, '', window.location.pathname);
  };

  // End Room
  const handleEndRoom = (reason?: string) => {
    setCurrentRoom(null);
    setUrlRoomCode(null);

    window.history.replaceState({}, '', window.location.pathname);

    setMeetingEndedNotice(
      reason ||
        'Meeting ended by the Host (Admin). All participants were disconnected.'
    );
  };

  return (
    <div className="h-[100dvh] min-h-[100dvh] w-full bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white overflow-hidden">

      {!currentRoom && (
        <Navbar
          user={currentUser}
          onSignOut={handleSignOut}
        />
      )}

      {meetingEndedNotice && !currentRoom && (
        <div className="bg-rose-500/15 border-b border-rose-500/30 text-rose-200 px-4 py-3 text-sm flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2.5 max-w-5xl mx-auto w-full">

            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />

            <span className="font-medium text-xs sm:text-sm">
              {meetingEndedNotice}
            </span>

            <button
              onClick={() => setMeetingEndedNotice(null)}
              className="ml-auto text-xs bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 px-2.5 py-1 rounded-lg transition"
            >
              Dismiss
            </button>

          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-0">

        {isInitializing ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>

        ) : currentRoom && currentUser ? (
          <RoomView
            room={currentRoom}
            currentUser={currentUser}
            onLeaveRoom={handleLeaveRoom}
            onEndRoom={handleEndRoom}
          />

        ) : currentUser && !currentUser.isAnonymous && !urlRoomCode ? (
          <Dashboard
            user={currentUser}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={(code) => {
              handleJoinExistingRoom(code).catch((err) => {
                setMeetingEndedNotice(
                  err instanceof Error
                    ? err.message
                    : 'Unable to join the room.'
                );
              });
            }}
          />

        ) : (
          <LandingAuth
            onGoogleLogin={handleGoogleLogin}
            onGuestJoin={(name, code) => handleGuestJoin(name, code)}
            initialRoomCode={urlRoomCode || ''}
          />
        )}

      </main>

      {showGuestModal && urlRoomCode && !currentRoom && (
        <GuestJoinModal
          roomCode={urlRoomCode}
          onJoinAsGuest={(name) => handleGuestJoin(name)}
          onSwitchToGoogleLogin={handleGoogleLogin}
        />
      )}

      <ExportHtmlModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

    </div>
  );
}

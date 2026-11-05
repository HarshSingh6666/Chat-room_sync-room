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
import { PreJoinModal, PreJoinSettings } from './components/PreJoinModal';
import { RoomView } from './components/RoomView';
import { ExportHtmlModal } from './components/ExportHtmlModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [currentRoom, setCurrentRoom] = useState<RoomData | null>(null);
  const [urlRoomCode, setUrlRoomCode] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [meetingEndedNotice, setMeetingEndedNotice] = useState<string | null>(null);

  // Pre-Join Modal state (asks every user whether Camera and Mic are ON or OFF)
  const [preJoinState, setPreJoinState] = useState<{
    isOpen: boolean;
    roomCode: string;
    isHost: boolean;
  } | null>(null);

  const [mediaPreferences, setMediaPreferences] = useState<{
    isCameraOff: boolean;
    isMicMuted: boolean;
  }>({ isCameraOff: false, isMicMuted: false });

  // Restore the existing meeting or verify link after page load
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

          try {
            const checkRoom = await roomManager.findRoomByCode(code);
            if (!checkRoom || checkRoom.status === 'ended') {
              setMeetingEndedNotice(
                'This room code and link have expired because the meeting was ended by the host.'
              );
              setUrlRoomCode(null);
              window.history.replaceState({}, '', window.location.pathname);
              return;
            }

            // Prompt user for Camera & Mic settings before entering
            setPreJoinState({
              isOpen: true,
              roomCode: code,
              isHost: checkRoom.adminId === savedUser?.id,
            });
          } catch (err: any) {
            setMeetingEndedNotice(
              err instanceof Error
                ? err.message
                : 'This room code and link have expired.'
            );
            setUrlRoomCode(null);
            window.history.replaceState({}, '', window.location.pathname);
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

      if (urlRoomCode) {
        setPreJoinState({
          isOpen: true,
          roomCode: urlRoomCode,
          isHost: false,
        });
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      alert(err instanceof Error ? err.message : 'Google sign in failed');
    }
  };

  // Open PreJoin dialog for Host creating a room
  const handlePromptCreateRoom = async (): Promise<RoomData> => {
    return new Promise((resolve, reject) => {
      setPreJoinState({
        isOpen: true,
        roomCode: 'New Room',
        isHost: true,
      });
    });
  };

  // Create Room as Host
  const executeCreateRoom = async (settings: PreJoinSettings): Promise<RoomData> => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    setMediaPreferences({
      isCameraOff: settings.isCameraOff,
      isMicMuted: settings.isMicMuted,
    });

    const adminUser = {
      ...currentUser,
      role: 'admin' as const,
    };

    setCurrentUser(adminUser);
    roomManager.saveLocalUser(adminUser);

    const room = await roomManager.createRoom(adminUser);

    setCurrentRoom(room);
    setUrlRoomCode(room.code);
    setPreJoinState(null);

    const newUrl = `${window.location.pathname}?room=${room.code}`;
    window.history.replaceState({}, '', newUrl);

    return room;
  };

  // Join Existing Room after PreJoin configuration
  async function handleConfirmJoinRoom(settings: PreJoinSettings) {
    const code = preJoinState?.roomCode || urlRoomCode;
    if (!code) return;

    setMediaPreferences({
      isCameraOff: settings.isCameraOff,
      isMicMuted: settings.isMicMuted,
    });

    let userToUse = currentUser;
    if (!userToUse || userToUse.isAnonymous) {
      userToUse = roomManager.joinAsGuest(settings.name);
      setCurrentUser(userToUse);
    }

    try {
      const normalizedCode = code.trim().toUpperCase();

      // Find room & check expiration
      const existingRoom = await roomManager.findRoomByCode(normalizedCode);

      if (!existingRoom || existingRoom.status === 'ended') {
        throw new Error(
          'This room code and link have expired because the meeting was closed by the host.'
        );
      }

      // Join existing room (server and client clean up any previous stale participant with same name)
      const joinedRoom = await roomManager.joinRoom(
        existingRoom.id,
        userToUse,
        existingRoom
      );

      if (!joinedRoom || joinedRoom.status === 'ended') {
        throw new Error(
          'This room code and link have expired.'
        );
      }

      setCurrentUser(userToUse);
      setCurrentRoom(joinedRoom);
      setPreJoinState(null);
      setMeetingEndedNotice(null);

      const newUrl = `${window.location.pathname}?room=${normalizedCode}`;
      window.history.replaceState({}, '', newUrl);
    } catch (err: any) {
      setPreJoinState(null);
      setMeetingEndedNotice(
        err instanceof Error
          ? err.message
          : 'This room code and link have expired.'
      );
      setUrlRoomCode(null);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  // Sign Out
  const handleSignOut = async () => {
    await roomManager.signOut();

    setCurrentUser(null);
    setCurrentRoom(null);
    setUrlRoomCode(null);
    setPreJoinState(null);

    window.history.replaceState({}, '', window.location.pathname);
  };

  // Leave Room (Guest leaves; Host ends room)
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

  // End Room (Host ends room -> code and link expire)
  const handleEndRoom = (reason?: string) => {
    setCurrentRoom(null);
    setUrlRoomCode(null);

    window.history.replaceState({}, '', window.location.pathname);

    setMeetingEndedNotice(
      reason ||
        'Meeting ended by the Host. This room code and invite link have expired.'
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
            initialMicMuted={mediaPreferences.isMicMuted}
            initialCameraOff={mediaPreferences.isCameraOff}
            onLeaveRoom={handleLeaveRoom}
            onEndRoom={handleEndRoom}
          />
        ) : currentUser && !currentUser.isAnonymous && !urlRoomCode ? (
          <Dashboard
            user={currentUser}
            onCreateRoom={handlePromptCreateRoom}
            onJoinRoom={(code) => {
              setPreJoinState({
                isOpen: true,
                roomCode: code.trim().toUpperCase(),
                isHost: false,
              });
            }}
          />
        ) : (
          <LandingAuth
            onGoogleLogin={handleGoogleLogin}
            onGuestJoin={(name, code) => {
              setPreJoinState({
                isOpen: true,
                roomCode: code.trim().toUpperCase(),
                isHost: false,
              });
            }}
            initialRoomCode={urlRoomCode || ''}
          />
        )}
      </main>

      {/* Pre-Join Dialog: Prompts every user for Camera and Mic settings before entering */}
      {preJoinState && preJoinState.isOpen && (
        <PreJoinModal
          isOpen={preJoinState.isOpen}
          roomCode={preJoinState.roomCode}
          isHost={preJoinState.isHost}
          currentUser={currentUser}
          onJoin={(settings) => {
            if (preJoinState.isHost) {
              executeCreateRoom(settings).catch((err) => {
                alert(err instanceof Error ? err.message : 'Error creating room');
              });
            } else {
              handleConfirmJoinRoom(settings);
            }
          }}
          onClose={() => setPreJoinState(null)}
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

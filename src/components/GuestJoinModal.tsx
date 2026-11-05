import React from 'react';
import { PreJoinModal, PreJoinSettings } from './PreJoinModal';

interface GuestJoinModalProps {
  roomCode: string;
  onJoinAsGuest: (name: string, settings?: PreJoinSettings) => void;
  onSwitchToGoogleLogin: () => void;
}

export const GuestJoinModal: React.FC<GuestJoinModalProps> = ({
  roomCode,
  onJoinAsGuest,
  onSwitchToGoogleLogin,
}) => {
  return (
    <PreJoinModal
      isOpen={true}
      roomCode={roomCode}
      isHost={false}
      onJoin={(settings) => onJoinAsGuest(settings.name, settings)}
      onSwitchToGoogleLogin={onSwitchToGoogleLogin}
    />
  );
};

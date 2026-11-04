
import React from 'react';

export interface FloatingEmoji {
  id: string;
  emoji: string;
  senderName: string;
  leftPercent: number;
}

interface FloatingReactionsProps {
  reactions: FloatingEmoji[];
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({
  reactions,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {reactions.map((r) => (
        <div
          key={r.id}
          style={{
            left: `${r.leftPercent}%`,
            bottom: '20px',
            animation: 'floatUp 2.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
          }}
          className="absolute flex flex-col items-center select-none"
        >
          <span className="text-4xl sm:text-5xl drop-shadow-lg">
            {r.emoji}
          </span>

          <span className="text-xs font-bold text-white bg-slate-900/90 px-3 py-1 rounded-full border border-slate-700 mt-2 whitespace-nowrap shadow-lg">
            {r.senderName}
          </span>
        </div>
      ))}

      <style>{`
        @keyframes floatUp {
          0% {
            opacity: 0;
            transform: translateY(0) scale(0.6) rotate(0deg);
          }
          15% {
            opacity: 1;
            transform: translateY(-40px) scale(1.2) rotate(-5deg);
          }
          50% {
            opacity: 1;
            transform: translateY(-160px) scale(1.05) rotate(8deg);
          }
          100% {
            opacity: 0;
            transform: translateY(-340px) scale(0.9) rotate(-10deg);
          }
        }
      `}</style>
    </div>
  );
};

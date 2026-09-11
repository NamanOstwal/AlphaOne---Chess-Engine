import React from 'react';

interface EvaluationBarProps {
  score: number; // in centipawns (positive = White, negative = Black)
  isWhiteBottom?: boolean;
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({ score, isWhiteBottom = true }) => {
  // Clamp score between -1000 and +1000 for display percentage
  const isMate = Math.abs(score) >= 9000;
  let formattedScore = '0.0';

  if (isMate) {
    formattedScore = score > 0 ? '+M' : '-M';
  } else {
    const pawns = (score / 100).toFixed(1);
    formattedScore = score > 0 ? `+${pawns}` : pawns;
  }

  // Calculate percentage of White's height (0% = all Black, 100% = all White)
  // Logistic function or linear clamp
  let whitePercent = 50;
  if (isMate) {
    whitePercent = score > 0 ? 100 : 0;
  } else {
    // Clamped between 5% and 95%
    const clamped = Math.max(-800, Math.min(800, score));
    whitePercent = 50 + (clamped / 800) * 45;
  }

  const whiteHeight = isWhiteBottom ? `${whitePercent}%` : `${100 - whitePercent}%`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '32px',
        height: 'min(80vw, 560px)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid var(--border-glass)',
        boxShadow: 'var(--shadow-glass)',
        backgroundColor: '#1e293b',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      {/* Black's section */}
      <div
        style={{
          width: '100%',
          flex: 1,
          backgroundColor: '#0f172a',
          position: 'relative',
        }}
      />

      {/* White's section */}
      <div
        style={{
          width: '100%',
          height: whiteHeight,
          backgroundColor: '#f8fafc',
          boxShadow: '0 0 12px rgba(248, 250, 252, 0.4)',
          transition: 'height 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'absolute',
          bottom: 0,
          left: 0,
        }}
      />

      {/* Score label overlay */}
      <div
        style={{
          position: 'absolute',
          top: whitePercent > 50 ? 'auto' : 8,
          bottom: whitePercent > 50 ? 8 : 'auto',
          fontSize: '10px',
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          color: whitePercent > 50 ? '#0f172a' : '#f8fafc',
          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
          zIndex: 3,
        }}
      >
        {formattedScore}
      </div>
    </div>
  );
};

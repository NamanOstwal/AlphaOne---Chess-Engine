import React from 'react';

interface EvaluationBarProps {
  score: number;
  isWhiteBottom?: boolean;
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({
  score,
  isWhiteBottom = true,
}) => {
  const isMate = Math.abs(score) >= 9000;

  let formattedScore: string;
  if (isMate) {
    formattedScore = score > 0 ? '+M' : '−M';
  } else {
    const p = (score / 100).toFixed(1);
    formattedScore = score > 0 ? `+${p}` : p;
  }

  // White's percentage of bar height (0 to 100)
  let whitePercent = 50;
  if (isMate) {
    whitePercent = score > 0 ? 100 : 0;
  } else {
    const clamped = Math.max(-600, Math.min(600, score));
    whitePercent = 50 + (clamped / 600) * 44;
  }

  const whiteHeight = isWhiteBottom
    ? `${whitePercent}%`
    : `${100 - whitePercent}%`;

  const scoreLabelOnWhite = isWhiteBottom ? whitePercent > 50 : whitePercent < 50;

  return (
    <div
      style={{
        position: 'relative',
        width: 22,
        height: '100%',
        minHeight: 480,
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        backgroundColor: '#16181d',
        flexShrink: 0,
        userSelect: 'none',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Black Section */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(to bottom, #111215, #1f2127)',
        }}
      />

      {/* White Section (Grows from bottom) */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: whiteHeight,
          background: 'linear-gradient(to top, #ffffff, #dcdfe6)',
          transition: 'height 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: '0 -2px 10px rgba(255,255,255,0.2)',
        }}
      />

      {/* Center 0.0 Equilibrium Tick Mark */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: '50%',
          height: 1,
          background: 'rgba(255, 255, 255, 0.25)',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      />

      {/* Score Label Badge */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: scoreLabelOnWhite ? 'auto' : 8,
          bottom: scoreLabelOnWhite ? 8 : 'auto',
          textAlign: 'center',
          fontSize: 10,
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          color: scoreLabelOnWhite ? '#111215' : '#ffffff',
          zIndex: 4,
          letterSpacing: '-0.02em',
          transition: 'all 0.35s ease',
          lineHeight: 1,
        }}
      >
        {formattedScore}
      </div>
    </div>
  );
};

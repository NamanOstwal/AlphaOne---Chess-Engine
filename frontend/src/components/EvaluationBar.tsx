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
    formattedScore = score > 0 ? 'M' : 'M';
  } else {
    const p = (score / 100).toFixed(1);
    formattedScore = score > 0 ? `+${p}` : p;
  }

  // White's percentage of bar height
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

  const scoreLabelOnWhite = whitePercent > 50;

  return (
    <div
      style={{
        position: 'relative',
        width: 26,
        height: 'min(90vw, 540px)',
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Black section */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: '#1a1a1a',
        }}
      />

      {/* White section — grows from bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: whiteHeight,
          background: '#f0f0f0',
          transition: 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: '0 -2px 8px rgba(255,255,255,0.15)',
        }}
      />

      {/* Divider line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: whiteHeight,
          height: 1.5,
          background: 'rgba(0,0,0,0.3)',
          zIndex: 3,
          transition: 'bottom 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />

      {/* Score label */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: scoreLabelOnWhite ? 'auto' : 6,
          bottom: scoreLabelOnWhite ? 6 : 'auto',
          textAlign: 'center',
          fontSize: 9,
          fontWeight: 800,
          fontFamily: 'var(--font-mono)',
          color: scoreLabelOnWhite ? '#1a1a1a' : '#f0f0f0',
          zIndex: 4,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          transition: 'all 0.4s ease',
          padding: '0 1px',
          whiteSpace: 'pre',
        }}
      >
        {isMate ? (score > 0 ? '+M' : '−M') : formattedScore}
      </div>
    </div>
  );
};

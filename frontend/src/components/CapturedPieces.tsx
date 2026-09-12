import React from 'react';

interface CapturedPiecesProps {
  fen: string;
  playerColor?: 'white' | 'black';
}

// Unicode chess piece symbols
const PIECE_UNICODE: Record<string, string> = {
  P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕',
  p: '♟', n: '♞', b: '♝', r: '♜', q: '♛',
};

const PIECE_VALUES: Record<string, number> = {
  P: 1, N: 3, B: 3, R: 5, Q: 9,
  p: 1, n: 3, b: 3, r: 5, q: 9,
};

const INITIAL_COUNTS: Record<string, number> = {
  P: 8, N: 2, B: 2, R: 2, Q: 1,
  p: 8, n: 2, b: 2, r: 2, q: 1,
};

interface CapturedRowProps {
  capturedByOpponent: { type: string; count: number }[];
  materialAdvantage: number;
  isWhite: boolean;
}

const CapturedRow: React.FC<CapturedRowProps> = ({
  capturedByOpponent,
  materialAdvantage,
  isWhite,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      minHeight: 22,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
      {capturedByOpponent.map(({ type, count }) =>
        Array.from({ length: count }).map((_, i) => (
          <span
            key={`${type}-${i}`}
            style={{
              fontSize: 16,
              lineHeight: 1,
              color: isWhite ? '#eeeed2' : '#1a1a1a',
              textShadow: isWhite
                ? '0 1px 3px rgba(0,0,0,0.6)'
                : '0 1px 2px rgba(255,255,255,0.15)',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
            }}
          >
            {PIECE_UNICODE[isWhite ? type : type.toLowerCase()]}
          </span>
        ))
      )}
    </div>
    {materialAdvantage > 0 && (
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--accent-emerald)',
          marginLeft: 4,
        }}
      >
        +{materialAdvantage}
      </span>
    )}
  </div>
);

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ fen }) => {
  const piecePlacement = fen.split(' ')[0];

  const currentCounts: Record<string, number> = {
    P: 0, N: 0, B: 0, R: 0, Q: 0,
    p: 0, n: 0, b: 0, r: 0, q: 0,
  };

  for (const ch of piecePlacement) {
    if (currentCounts[ch] !== undefined) currentCounts[ch]++;
  }

  const whiteCaptured: { type: string; count: number }[] = [];
  let whiteLoss = 0;
  for (const t of ['P', 'N', 'B', 'R', 'Q']) {
    const diff = Math.max(0, INITIAL_COUNTS[t] - currentCounts[t]);
    if (diff > 0) { whiteCaptured.push({ type: t, count: diff }); whiteLoss += diff * PIECE_VALUES[t]; }
  }

  const blackCaptured: { type: string; count: number }[] = [];
  let blackLoss = 0;
  for (const t of ['p', 'n', 'b', 'r', 'q']) {
    const diff = Math.max(0, INITIAL_COUNTS[t] - currentCounts[t]);
    if (diff > 0) { blackCaptured.push({ type: t, count: diff }); blackLoss += diff * PIECE_VALUES[t]; }
  }

  const whiteLead = blackLoss - whiteLoss;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      {/* Captured by black (white pieces taken) */}
      <CapturedRow
        capturedByOpponent={whiteCaptured}
        materialAdvantage={whiteLead < 0 ? Math.abs(whiteLead) : 0}
        isWhite
      />
      {/* Captured by white (black pieces taken) */}
      <CapturedRow
        capturedByOpponent={blackCaptured}
        materialAdvantage={whiteLead > 0 ? whiteLead : 0}
        isWhite={false}
      />
    </div>
  );
};

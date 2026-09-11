import React from 'react';

interface CapturedPiecesProps {
  fen: string;
}

export const CapturedPieces: React.FC<CapturedPiecesProps> = ({ fen }) => {
  const initialCounts: Record<string, number> = {
    P: 8, N: 2, B: 2, R: 2, Q: 1,
    p: 8, n: 2, b: 2, r: 2, q: 1,
  };

  const pieceValues: Record<string, number> = {
    P: 1, N: 3, B: 3, R: 5, Q: 9,
    p: 1, n: 3, b: 3, r: 5, q: 9,
  };

  // Count current pieces on board
  const currentCounts: Record<string, number> = {
    P: 0, N: 0, B: 0, R: 0, Q: 0,
    p: 0, n: 0, b: 0, r: 0, q: 0,
  };

  const piecePlacement = fen.split(' ')[0];
  for (const ch of piecePlacement) {
    if (currentCounts[ch] !== undefined) {
      currentCounts[ch]++;
    }
  }

  // Captured by Black (White pieces missing)
  const whiteCaptured: { type: string; count: number }[] = [];
  let whiteMaterialLoss = 0;
  for (const type of ['P', 'N', 'B', 'R', 'Q']) {
    const diff = Math.max(0, initialCounts[type] - currentCounts[type]);
    if (diff > 0) {
      whiteCaptured.push({ type, count: diff });
      whiteMaterialLoss += diff * pieceValues[type];
    }
  }

  // Captured by White (Black pieces missing)
  const blackCaptured: { type: string; count: number }[] = [];
  let blackMaterialLoss = 0;
  for (const type of ['p', 'n', 'b', 'r', 'q']) {
    const diff = Math.max(0, initialCounts[type] - currentCounts[type]);
    if (diff > 0) {
      blackCaptured.push({ type, count: diff });
      blackMaterialLoss += diff * pieceValues[type];
    }
  }

  const whiteLead = blackMaterialLoss - whiteMaterialLoss;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', padding: '4px 0' }}>
      {/* Captured by Black */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minHeight: '26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1 }}>
          {whiteCaptured.map(({ type, count }) =>
            Array.from({ length: count }).map((_, i) => (
              <img
                key={`w-${type}-${i}`}
                src={`/pieces/w${type}.png`}
                alt={`w${type}`}
                style={{ width: '20px', height: '20px', objectFit: 'contain', opacity: 0.85 }}
              />
            ))
          )}
        </div>
        {whiteLead < 0 && (
          <span style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            +{Math.abs(whiteLead)}
          </span>
        )}
      </div>

      {/* Captured by White */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minHeight: '26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flex: 1 }}>
          {blackCaptured.map(({ type, count }) =>
            Array.from({ length: count }).map((_, i) => (
              <img
                key={`b-${type}-${i}`}
                src={`/pieces/b${type.toUpperCase()}.png`}
                alt={`b${type}`}
                style={{ width: '20px', height: '20px', objectFit: 'contain', opacity: 0.85 }}
              />
            ))
          )}
        </div>
        {whiteLead > 0 && (
          <span style={{ fontSize: '11px', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
            +{whiteLead}
          </span>
        )}
      </div>
    </div>
  );
};

import React, { useState, useCallback, useEffect } from 'react';
import { PieceCode } from '../types/chess';

/* ====================================================================
   Inline Unicode Chess Pieces
   ==================================================================== */
const PIECE_UNICODE: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wp: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bp: '♟',
};

const LIGHT          = '#eeeed2';
const DARK           = '#769656';
const SELECTED_LIGHT = '#f6f669';
const SELECTED_DARK  = '#baca2b';
const LAST_LIGHT     = '#cdd16e';
const LAST_DARK      = '#aaa23a';
const CHECK_BG       = 'radial-gradient(ellipse at center, rgba(255,0,0,0.85) 0%, rgba(231,0,0,0.7) 25%, rgba(169,0,0,0) 89%)';

interface ChessboardProps {
  fen: string;
  isFlipped: boolean;
  legalMoves: string[];
  lastMove: string | null;
  inCheck: boolean;
  isWhiteToMove: boolean;
  onMakeMove: (uci: string) => void;
  disabled?: boolean;
}

/* Parse FEN placement string → 8×8 matrix (row 0 = rank 8) */
function parseFen(fen: string): PieceCode[][] {
  const placement = fen.split(' ')[0];
  const rows = placement.split('/');
  return rows.map((r) => {
    const row: PieceCode[] = [];
    for (const ch of r) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < parseInt(ch, 10); i++) row.push('--');
      } else {
        const isUpper = ch === ch.toUpperCase();
        const color   = isUpper ? 'w' : 'b';
        const type    = ch.toLowerCase() === 'p' ? 'p' : ch.toUpperCase();
        row.push(`${color}${type}` as PieceCode);
      }
    }
    return row;
  });
}

/* Convert matrix [row][col] → algebraic square name */
function toSquare(matRow: number, matCol: number): string {
  // matRow 0 = rank 8, matRow 7 = rank 1
  return String.fromCharCode(97 + matCol) + String(8 - matRow);
}

/* Convert algebraic → matrix indices */
function fromSquare(sq: string): [number, number] {
  const col = sq.charCodeAt(0) - 97;
  const row = 8 - parseInt(sq[1], 10);
  return [row, col];
}

export const Chessboard: React.FC<ChessboardProps> = ({
  fen,
  isFlipped,
  legalMoves,
  lastMove,
  inCheck,
  isWhiteToMove,
  onMakeMove,
  disabled = false,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [hoveredSquare,  setHoveredSquare]  = useState<string | null>(null);

  // Clear selection on turn change or disable
  useEffect(() => {
    setSelectedSquare(null);
  }, [isWhiteToMove, disabled]);

  const boardMatrix = React.useMemo(() => parseFen(fen), [fen]);

  /* King in check square */
  const kingCheckSq = React.useMemo((): string | null => {
    if (!inCheck) return null;
    const king = isWhiteToMove ? 'wK' : 'bK';
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (boardMatrix[r][c] === king) return toSquare(r, c);
    return null;
  }, [boardMatrix, inCheck, isWhiteToMove]);

  /* Valid destination squares from the selected square */
  const validDests = React.useMemo((): Set<string> => {
    if (!selectedSquare) return new Set();
    return new Set(
      legalMoves
        .filter((m) => m.slice(0, 2) === selectedSquare)
        .map((m) => m.slice(2, 4))
    );
  }, [selectedSquare, legalMoves]);

  const handleSquareClick = useCallback(
    (sq: string) => {
      if (disabled) return;

      // ── If clicking the already-selected square, deselect it ──
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        return;
      }

      // ── If a square is already selected, try to move ──
      if (selectedSquare) {
        if (validDests.has(sq)) {
          // Build the base UCI
          const base = selectedSquare + sq;
          // Pick the matching legal move (handles promotions by taking first match)
          const move = legalMoves.find((m) => m.startsWith(base)) ?? base;
          onMakeMove(move);
          setSelectedSquare(null);
          return;
        }
      }

      // ── Try to select the clicked piece ──
      const [r, c] = fromSquare(sq);
      const piece = boardMatrix[r]?.[c] ?? '--';
      const myColor = isWhiteToMove ? 'w' : 'b';
      if (piece !== '--' && piece.startsWith(myColor)) {
        setSelectedSquare(sq);
      } else {
        setSelectedSquare(null);
      }
    },
    [disabled, selectedSquare, validDests, legalMoves, boardMatrix, isWhiteToMove, onMakeMove]
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, sq: string) => {
      if (disabled) {
        e.preventDefault();
        return;
      }
      const [r, c] = fromSquare(sq);
      const piece = boardMatrix[r]?.[c] ?? '--';
      const myColor = isWhiteToMove ? 'w' : 'b';
      if (piece !== '--' && piece.startsWith(myColor)) {
        setSelectedSquare(sq);
        e.dataTransfer.setData('text/plain', sq);
        e.dataTransfer.effectAllowed = 'move';
      } else {
        e.preventDefault();
      }
    },
    [disabled, boardMatrix, isWhiteToMove]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetSq: string) => {
      e.preventDefault();
      if (disabled) return;
      const sourceSq = e.dataTransfer.getData('text/plain') || selectedSquare;
      if (sourceSq && sourceSq !== targetSq) {
        const validDestsFromSource = legalMoves
          .filter((m) => m.slice(0, 2) === sourceSq)
          .map((m) => m.slice(2, 4));
        if (validDestsFromSource.includes(targetSq)) {
          const base = sourceSq + targetSq;
          const move = legalMoves.find((m) => m.startsWith(base)) ?? base;
          onMakeMove(move);
          setSelectedSquare(null);
        }
      }
    },
    [disabled, selectedSquare, legalMoves, onMakeMove]
  );

  /* Build flat list of 64 squares in display order */
  // Ranks: top of screen = rank 8 (white view) or rank 1 (black view)
  const displayRanks = isFlipped
    ? [1, 2, 3, 4, 5, 6, 7, 8]       // rank 1 at top
    : [8, 7, 6, 5, 4, 3, 2, 1];      // rank 8 at top
  const displayFiles = isFlipped
    ? [7, 6, 5, 4, 3, 2, 1, 0]       // h file leftmost
    : [0, 1, 2, 3, 4, 5, 6, 7];      // a file leftmost

  const squares: { sq: string; rank: number; file: number; rowIdx: number; colIdx: number }[] = [];
  displayRanks.forEach((rank, rowIdx) => {
    displayFiles.forEach((file, colIdx) => {
      const sq = String.fromCharCode(97 + file) + rank;
      squares.push({ sq, rank, file, rowIdx, colIdx });
    });
  });

  const BOARD_SIZE = 'min(88vw, 528px)';

  return (
    <div style={{ display: 'inline-block', userSelect: 'none' }}>
      <div
        style={{
          width: BOARD_SIZE,
          height: BOARD_SIZE,
          borderRadius: 4,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1.5px rgba(255,255,255,0.07)',
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gridTemplateRows:    'repeat(8, 1fr)',
        }}
      >
        {squares.map(({ sq, rank, file, rowIdx, colIdx }) => {
          // boardMatrix row 0 = rank 8
          const matRow = 8 - rank;
          const piece  = boardMatrix[matRow]?.[file] ?? '--';

          const isLight    = (rank + file) % 2 !== 0; // a1 is dark (rank1+file0 even)
          const isSelected = selectedSquare === sq;
          const isValid    = validDests.has(sq);
          const isLastFrom = lastMove ? lastMove.slice(0, 2) === sq : false;
          const isLastTo   = lastMove ? lastMove.slice(2, 4) === sq : false;
          const isCheck    = kingCheckSq === sq;
          const isHovered  = hoveredSquare === sq && !disabled;

          let bg = isLight ? LIGHT : DARK;
          if (isSelected)                 bg = isLight ? SELECTED_LIGHT : SELECTED_DARK;
          else if (isLastFrom || isLastTo) bg = isLight ? LAST_LIGHT : LAST_DARK;

          const showRankLabel = colIdx === 0;
          const showFileLabel = rowIdx === 7;
          const isFriendlyPiece = piece !== '--' && piece.startsWith(isWhiteToMove ? 'w' : 'b');

          return (
            <div
              key={sq}
              id={`sq-${sq}`}
              onClick={() => handleSquareClick(sq)}
              onMouseEnter={() => setHoveredSquare(sq)}
              onMouseLeave={() => setHoveredSquare(null)}
              draggable={!disabled && isFriendlyPiece}
              onDragStart={(e) => handleDragStart(e, sq)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, sq)}
              style={{
                position: 'relative',
                backgroundColor: bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled
                  ? 'default'
                  : isFriendlyPiece
                  ? 'grab'
                  : isValid
                  ? 'pointer'
                  : 'default',
                transition: 'background-color 0.08s ease',
              }}
            >
              {/* ── Coordinate labels ── */}
              {showRankLabel && (
                <span style={{
                  position: 'absolute', top: 2, left: 3,
                  fontSize: 11, fontWeight: 700,
                  fontFamily: 'var(--font-sans)',
                  color: isLight ? DARK : LIGHT,
                  lineHeight: 1, pointerEvents: 'none', zIndex: 6,
                }}>
                  {rank}
                </span>
              )}
              {showFileLabel && (
                <span style={{
                  position: 'absolute', bottom: 2, right: 3,
                  fontSize: 11, fontWeight: 700,
                  fontFamily: 'var(--font-sans)',
                  color: isLight ? DARK : LIGHT,
                  lineHeight: 1, pointerEvents: 'none', zIndex: 6,
                }}>
                  {String.fromCharCode(97 + file)}
                </span>
              )}

              {/* ── Check highlight ── */}
              {isCheck && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: CHECK_BG, zIndex: 2, pointerEvents: 'none',
                }} />
              )}

              {/* ── Hover tint ── */}
              {isHovered && !isSelected && (
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  zIndex: 2, pointerEvents: 'none',
                }} />
              )}

              {/* ── Valid-move dot / ring ── */}
              {isValid && (
                <div style={{
                  position: 'absolute',
                  width:        piece !== '--' ? '92%' : '35%',
                  height:       piece !== '--' ? '92%' : '35%',
                  borderRadius: piece !== '--' ? '50%' : '50%',
                  border:       piece !== '--' ? '5px solid rgba(0,0,0,0.28)' : 'none',
                  backgroundColor: piece !== '--' ? 'transparent' : 'rgba(0,0,0,0.2)',
                  zIndex: 3, pointerEvents: 'none',
                }} />
              )}

              {/* ── Piece ── */}
              {piece !== '--' && (
                <span
                  style={{
                    fontSize: `calc(${BOARD_SIZE} / 8 * 0.78)`,
                    lineHeight: 1,
                    position: 'relative',
                    zIndex: 5,
                    color:     piece.startsWith('w') ? '#fff' : '#1a1a1a',
                    textShadow: piece.startsWith('w')
                      ? '0 1px 4px rgba(0,0,0,0.65), 0 0 1px rgba(0,0,0,0.9)'
                      : '0 1px 3px rgba(255,255,255,0.2)',
                    filter: isSelected
                      ? 'drop-shadow(0 4px 10px rgba(0,0,0,0.7))'
                      : 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
                    transform: isSelected ? 'scale(1.1) translateY(-2px)' : 'scale(1)',
                    transition: 'transform 0.1s ease, filter 0.1s ease',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                >
                  {PIECE_UNICODE[piece] ?? ''}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

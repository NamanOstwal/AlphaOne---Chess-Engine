import React, { useState, useCallback, useEffect } from 'react';
import { PieceCode } from '../types/chess';
import { playMoveSound } from '../utils/audio';

/* ====================================================================
   Luxury Grey - Black - White Color Palette
   ==================================================================== */
const LIGHT          = '#ebeef2'; // Elegant ivory-platinum
const DARK           = '#434752'; // Deep slate-graphite
const SELECTED_LIGHT = '#c4ccd8';
const SELECTED_DARK  = '#2f333c';
const LAST_LIGHT     = '#dbe2ec';
const LAST_DARK      = '#545966';
const CHECK_BG       = 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.45) 45%, rgba(0,0,0,0) 85%)';

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

function fromSquare(sq: string): [number, number] {
  const file = sq.charCodeAt(0) - 97; // a=0 … h=7
  const rank = parseInt(sq[1], 10);   // 1 … 8
  const row  = 8 - rank;              // rank 8 -> row 0
  return [row, file];
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
  const [boardMatrix,    setBoardMatrix]    = useState<PieceCode[][]>(() => parseFen(fen));

  useEffect(() => {
    setBoardMatrix(parseFen(fen));
    setSelectedSquare(null);
  }, [fen]);

  // Find King square if currently in check
  const kingCheckSq = React.useMemo(() => {
    if (!inCheck) return null;
    const targetKing: PieceCode = isWhiteToMove ? 'wK' : 'bK';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (boardMatrix[r]?.[c] === targetKing) {
          const file = String.fromCharCode(97 + c);
          const rank = 8 - r;
          return `${file}${rank}`;
        }
      }
    }
    return null;
  }, [inCheck, isWhiteToMove, boardMatrix]);

  // Set of valid destination squares for the currently selected piece
  const validDests = React.useMemo(() => {
    if (!selectedSquare) return new Set<string>();
    return new Set(
      legalMoves
        .filter((m) => m.startsWith(selectedSquare))
        .map((m) => m.slice(2, 4))
    );
  }, [selectedSquare, legalMoves]);

  const executeMove = useCallback(
    (uci: string) => {
      const targetSq = uci.slice(2, 4);
      const [tr, tc] = fromSquare(targetSq);
      const isCapture = (boardMatrix[tr]?.[tc] ?? '--') !== '--';
      playMoveSound(isCapture, inCheck);
      onMakeMove(uci);
    },
    [boardMatrix, inCheck, onMakeMove]
  );

  const handleSquareClick = useCallback(
    (sq: string) => {
      if (disabled) return;

      // Deselect if clicking same square
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        return;
      }

      // If already selected and clicking valid destination, make move
      if (selectedSquare && validDests.has(sq)) {
        const base = selectedSquare + sq;
        const move = legalMoves.find((m) => m.startsWith(base)) ?? base;
        executeMove(move);
        setSelectedSquare(null);
        return;
      }

      // Try selecting piece on clicked square
      const [r, c] = fromSquare(sq);
      const piece = boardMatrix[r]?.[c] ?? '--';
      const myColor = isWhiteToMove ? 'w' : 'b';
      if (piece !== '--' && piece.startsWith(myColor)) {
        setSelectedSquare(sq);
      } else {
        setSelectedSquare(null);
      }
    },
    [disabled, selectedSquare, validDests, legalMoves, boardMatrix, isWhiteToMove, executeMove]
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
      const fromSq = e.dataTransfer.getData('text/plain');
      if (!fromSq || fromSq === targetSq) return;

      const base = fromSq + targetSq;
      const move = legalMoves.find((m) => m.startsWith(base));
      if (move) {
        executeMove(move);
        setSelectedSquare(null);
      }
    },
    [legalMoves, executeMove]
  );

  // Display ordering based on flip
  const displayRanks = isFlipped
    ? [1, 2, 3, 4, 5, 6, 7, 8]
    : [8, 7, 6, 5, 4, 3, 2, 1];
  const displayFiles = isFlipped
    ? [7, 6, 5, 4, 3, 2, 1, 0]
    : [0, 1, 2, 3, 4, 5, 6, 7];

  const squares: { sq: string; rank: number; file: number; rowIdx: number; colIdx: number }[] = [];
  displayRanks.forEach((rank, rowIdx) => {
    displayFiles.forEach((file, colIdx) => {
      const sq = String.fromCharCode(97 + file) + rank;
      squares.push({ sq, rank, file, rowIdx, colIdx });
    });
  });

  const BOARD_SIZE = 'min(92vw, 560px)';

  return (
    <div style={{ display: 'inline-block', userSelect: 'none' }}>
      <div
        style={{
          width: BOARD_SIZE,
          height: BOARD_SIZE,
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 28px 70px -15px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.09), inset 0 0 0 1px rgba(0,0,0,0.5)',
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gridTemplateRows:    'repeat(8, 1fr)',
          border: '6px solid #1e2025',
        }}
      >
        {squares.map(({ sq, rank, file, rowIdx, colIdx }) => {
          const matRow = 8 - rank;
          const piece  = boardMatrix[matRow]?.[file] ?? '--';

          // Standard Chess:
          // a1 is DARK, h1 is LIGHT, e1 (White King) is DARK, d1 (White Queen) is LIGHT
          // Formula: (rank + file) % 2 === 0 is LIGHT, !== 0 is DARK
          const isLight    = (rank + file) % 2 === 0;
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
                transition: 'background-color 0.12s ease',
              }}
            >
              {/* Coordinate labels */}
              {showRankLabel && (
                <span style={{
                  position: 'absolute', top: 3, left: 4,
                  fontSize: 11, fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: isLight ? '#666a75' : '#c2c6cf',
                  lineHeight: 1, pointerEvents: 'none', zIndex: 6,
                }}>
                  {rank}
                </span>
              )}
              {showFileLabel && (
                <span style={{
                  position: 'absolute', bottom: 3, right: 4,
                  fontSize: 11, fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  color: isLight ? '#666a75' : '#c2c6cf',
                  lineHeight: 1, pointerEvents: 'none', zIndex: 6,
                }}>
                  {String.fromCharCode(97 + file)}
                </span>
              )}

              {/* Check highlight */}
              {isCheck && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: CHECK_BG, zIndex: 2, pointerEvents: 'none',
                }} />
              )}

              {/* Hover highlight */}
              {isHovered && !isSelected && (
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundColor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                  zIndex: 2, pointerEvents: 'none',
                }} />
              )}

              {/* Legal move indicator (dot or target ring) */}
              {isValid && (
                <div style={{
                  position: 'absolute',
                  width:        piece !== '--' ? '88%' : '32%',
                  height:       piece !== '--' ? '88%' : '32%',
                  borderRadius: '50%',
                  border:       piece !== '--' ? '4px solid rgba(255, 255, 255, 0.75)' : 'none',
                  backgroundColor: piece !== '--' ? 'transparent' : 'rgba(255, 255, 255, 0.65)',
                  boxShadow:    piece !== '--' ? '0 0 10px rgba(0,0,0,0.5)' : '0 2px 6px rgba(0,0,0,0.4)',
                  zIndex: 3, pointerEvents: 'none',
                }} />
              )}

              {/* Realistic High-Res Piece Graphic */}
              {piece !== '--' && (
                <img
                  src={`/pieces/${piece}.png`}
                  alt={piece}
                  draggable={false}
                  style={{
                    width: '82%',
                    height: '82%',
                    objectFit: 'contain',
                    position: 'relative',
                    zIndex: 5,
                    filter: isSelected
                      ? 'drop-shadow(0 8px 16px rgba(0,0,0,0.75)) scale(1.08)'
                      : 'drop-shadow(0 3px 6px rgba(0,0,0,0.45))',
                    transform: isSelected ? 'scale(1.08) translateY(-3px)' : 'scale(1)',
                    transition: 'transform 0.12s cubic-bezier(0.2, 0, 0, 1), filter 0.12s ease',
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

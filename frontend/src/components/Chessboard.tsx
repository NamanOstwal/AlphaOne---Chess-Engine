import React, { useState } from 'react';
import { PieceCode } from '../types/chess';

interface ChessboardProps {
  fen: string;
  isFlipped: boolean;
  legalMoves: string[];
  lastMove: string | null;
  inCheck: boolean;
  isWhiteToMove: boolean;
  onMakeMove: (move: string) => void;
  disabled?: boolean;
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

  // Parse FEN board matrix
  const boardMatrix: (PieceCode)[][] = React.useMemo(() => {
    const rows = fen.split(' ')[0].split('/');
    const matrix: PieceCode[][] = [];

    for (const r of rows) {
      const rowPieces: PieceCode[] = [];
      for (const ch of r) {
        if (ch >= '1' && ch <= '8') {
          const emptyCount = parseInt(ch, 10);
          for (let i = 0; i < emptyCount; i++) rowPieces.push('--');
        } else {
          const color = ch === ch.toUpperCase() ? 'w' : 'b';
          const type = ch.toLowerCase() === 'p' ? 'p' : ch.toUpperCase();
          rowPieces.push(`${color}${type}` as PieceCode);
        }
      }
      matrix.push(rowPieces);
    }
    return matrix;
  }, [fen]);

  // Find King square if in check
  const kingSquareInCheck = React.useMemo(() => {
    if (!inCheck) return null;
    const targetKing = isWhiteToMove ? 'wK' : 'bK';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (boardMatrix[r][c] === targetKing) {
          const file = String.fromCharCode('a'.charCodeAt(0) + c);
          const rank = (8 - r).toString();
          return file + rank;
        }
      }
    }
    return null;
  }, [boardMatrix, inCheck, isWhiteToMove]);

  // Destinations available from selected square
  const validDestinations = React.useMemo(() => {
    if (!selectedSquare) return [];
    return legalMoves
      .filter((m) => m.startsWith(selectedSquare))
      .map((m) => m.slice(2, 4));
  }, [selectedSquare, legalMoves]);

  const handleSquareClick = (square: string, piece: PieceCode) => {
    if (disabled) return;

    // If square is an allowed move destination
    if (selectedSquare && validDestinations.includes(square)) {
      // Find matching legal move (accounting for auto-queen promotion if 8th rank)
      let uci = selectedSquare + square;
      const promoMatch = legalMoves.find((m) => m.startsWith(uci));
      if (promoMatch) {
        uci = promoMatch;
      }
      onMakeMove(uci);
      setSelectedSquare(null);
      return;
    }

    // Selecting a piece
    const isPlayerPiece =
      piece !== '--' &&
      ((isWhiteToMove && piece.startsWith('w')) || (!isWhiteToMove && piece.startsWith('b')));

    if (isPlayerPiece) {
      if (selectedSquare === square) {
        setSelectedSquare(null); // toggle deselect
      } else {
        setSelectedSquare(square);
      }
    } else {
      setSelectedSquare(null);
    }
  };

  const rows = isFlipped ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const actualRows = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gridTemplateRows: 'repeat(8, 1fr)',
        width: 'min(80vw, 560px)',
        height: 'min(80vw, 560px)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 25px rgba(0, 242, 254, 0.15)',
        border: '3px solid rgba(255,255,255,0.12)',
        userSelect: 'none',
        position: 'relative'
      }}
    >
      {actualRows.map((r, rowIdx) =>
        cols.map((c, colIdx) => {
          const file = String.fromCharCode('a'.charCodeAt(0) + c);
          const rank = (8 - r).toString();
          const square = file + rank;
          const piece = boardMatrix[r][c];
          const isLight = (r + c) % 2 !== 0;

          const isSelected = selectedSquare === square;
          const isValidDest = validDestinations.includes(square);
          const isLastMoveSq =
            lastMove && (lastMove.slice(0, 2) === square || lastMove.slice(2, 4) === square);
          const isCheckSq = kingSquareInCheck === square;

          // Background color computation
          let bg = isLight ? '#d8e2ec' : '#3e526c';
          if (isSelected) bg = '#38bdf8';
          else if (isCheckSq) bg = '#ef4444';
          else if (isLastMoveSq) bg = isLight ? '#fde047' : '#ca8a04';

          return (
            <div
              key={square}
              id={`sq-${square}`}
              onClick={() => handleSquareClick(square, piece)}
              style={{
                backgroundColor: bg,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'default' : 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              {/* Rank / File Coordinate Labels */}
              {colIdx === 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    left: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    color: isLight ? '#475569' : '#94a3b8',
                    pointerEvents: 'none'
                  }}
                >
                  {rank}
                </span>
              )}
              {rowIdx === 7 && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 2,
                    right: 4,
                    fontSize: 10,
                    fontWeight: 700,
                    color: isLight ? '#475569' : '#94a3b8',
                    pointerEvents: 'none'
                  }}
                >
                  {file}
                </span>
              )}

              {/* Move Indicator Dot */}
              {isValidDest && (
                <div
                  style={{
                    position: 'absolute',
                    width: piece !== '--' ? '100%' : '32%',
                    height: piece !== '--' ? '100%' : '32%',
                    borderRadius: piece !== '--' ? '0' : '50%',
                    border: piece !== '--' ? '4px solid rgba(14, 165, 233, 0.8)' : 'none',
                    backgroundColor: piece !== '--' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(14, 165, 233, 0.75)',
                    boxShadow: '0 0 10px rgba(14, 165, 233, 0.5)',
                    zIndex: 2,
                    pointerEvents: 'none'
                  }}
                />
              )}

              {/* Piece Image */}
              {piece !== '--' && (
                <img
                  src={`/pieces/${piece}.png`}
                  alt={piece}
                  draggable={false}
                  style={{
                    width: '85%',
                    height: '85%',
                    objectFit: 'contain',
                    zIndex: 1,
                    filter: isSelected ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.5)) scale(1.06)' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
                    transition: 'transform 0.12s ease'
                  }}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

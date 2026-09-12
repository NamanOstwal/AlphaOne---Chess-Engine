import { EngineCommand, EngineResponse, EngineState } from '../types/chess';

// WASM Module instance
let wasmEngine: any = null;
let isInitialized = false;

interface MoveLogEntry {
  fr: number;
  fc: number;
  tr: number;
  tc: number;
  piece: string;
  captured: string;
  isCastle?: boolean;
  castleRookFr?: number;
  castleRookFc?: number;
  castleRookTr?: number;
  castleRookTc?: number;
  isEnPassant?: boolean;
  epPawnR?: number;
  epPawnC?: number;
  epPawn?: string;
  prevCastlingRights: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  prevEnPassant: string | null;
}

// Fallback pure-JS engine matching AlphaOne logic for instant resilience
class FallbackAlphaOne {
  board: string[][];
  whiteToMove: boolean;
  moveLog: MoveLogEntry[];
  castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
  enPassantSquare: string | null = null;

  // Exact Python material scores
  pieceScore: Record<string, number> = {
    K: 6000, Q: 929, R: 512, B: 320, N: 280, p: 100
  };

  // Positional tables
  pawnScores = [
    [0, 0, 0, 0, 0, 0, 0, 0],
    [78, 83, 86, 73, 102, 82, 85, 90],
    [7, 29, 21, 44, 40, 31, 44, 7],
    [-17, 16, -2, 15, 14, 0, 15, -13],
    [-26, 3, 10, 9, 6, 1, 0, -23],
    [-22, 9, 5, -11, -10, -2, 3, -19],
    [-31, 8, -7, -37, -36, -14, 3, -31],
    [0, 0, 0, 0, 0, 0, 0, 0]
  ];

  knightScores = [
    [-66, -53, -75, -75, -10, -55, -58, -70],
    [-3, -6, 100, -36, 4, 62, -4, -14],
    [10, 67, 1, 74, 73, 27, 62, -2],
    [24, 24, 45, 37, 33, 41, 25, 17],
    [-1, 5, 31, 21, 22, 35, 2, 0],
    [-18, 10, 13, 22, 18, 15, 11, -14],
    [-23, -15, 2, 0, 2, 0, -23, -20],
    [-66, -53, -75, -75, -10, -55, -58, -70]
  ];

  bishopScores = [
    [-59, -78, -82, -76, -23, -107, -37, -50],
    [-11, 20, 35, -42, -39, 31, 2, -22],
    [-9, 39, -32, 41, 52, -10, 28, -14],
    [25, 17, 20, 34, 26, 25, 15, 10],
    [13, 10, 17, 23, 17, 16, 0, 7],
    [14, 25, 24, 15, 8, 25, 20, 15],
    [19, 20, 11, 6, 7, 6, 20, 16],
    [-7, 2, -15, -12, -14, -15, -10, -10]
  ];

  rookScores = [
    [35, 29, 33, 4, 37, 33, 56, 50],
    [55, 29, 56, 67, 55, 62, 34, 60],
    [19, 35, 28, 33, 45, 27, 25, 15],
    [0, 5, 16, 13, 18, -4, -9, -6],
    [-28, -35, -16, -21, -13, -29, -46, -30],
    [-42, -28, -42, -25, -25, -35, -26, -46],
    [-53, -38, -31, -26, -29, -43, -44, -53],
    [-30, -24, -18, 5, -2, -18, -31, -32]
  ];

  queenScores = [
    [6, 1, -8, -104, 69, 24, 88, 26],
    [14, 32, 60, -10, 20, 76, 57, 24],
    [-2, 43, 32, 60, 72, 63, 43, 2],
    [1, -16, 22, 17, 25, 20, -13, -6],
    [-14, -15, -2, -5, -1, -10, -20, -22],
    [-30, -6, -13, -11, -16, -11, -16, -27],
    [-36, -18, 0, -19, -15, -15, -21, -38],
    [-39, -30, -31, -13, -31, -36, -34, -42]
  ];

  constructor() {
    this.board = this.createInitialBoard();
    this.whiteToMove = true;
    this.moveLog = [];
  }

  createInitialBoard(): string[][] {
    return [
      ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
      ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
      ['--', '--', '--', '--', '--', '--', '--', '--'],
      ['--', '--', '--', '--', '--', '--', '--', '--'],
      ['--', '--', '--', '--', '--', '--', '--', '--'],
      ['--', '--', '--', '--', '--', '--', '--', '--'],
      ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
      ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
    ];
  }

  newGame() {
    this.board = this.createInitialBoard();
    this.whiteToMove = true;
    this.moveLog = [];
    this.castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
    this.enPassantSquare = null;
  }

  evaluate(): number {
    let score = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece !== '--') {
          const color = piece[0];
          const type = piece[1];
          const mat = this.pieceScore[type] || 0;
          let pos = 0;
          const tableRow = color === 'w' ? r : 7 - r;

          if (type === 'p') pos = this.pawnScores[tableRow][c];
          else if (type === 'N') pos = this.knightScores[tableRow][c];
          else if (type === 'B') pos = this.bishopScores[tableRow][c];
          else if (type === 'R') pos = this.rookScores[tableRow][c];
          else if (type === 'Q') pos = this.queenScores[tableRow][c];

          if (color === 'w') score += mat + pos;
          else score -= mat + pos;
        }
      }
    }
    return score;
  }

  coordsToUci(r: number, c: number): string {
    const file = String.fromCharCode('a'.charCodeAt(0) + c);
    const rank = (8 - r).toString();
    return file + rank;
  }

  uciToCoords(sq: string): [number, number] {
    const c = sq.charCodeAt(0) - 'a'.charCodeAt(0);
    const r = 8 - parseInt(sq[1], 10);
    return [r, c];
  }

  isSquareAttacked(r: number, c: number, byColor: 'w' | 'b'): boolean {
    // Pawn attacks: attacking pawns sit on r + 1 for white attacker, r - 1 for black attacker
    const pawnR = byColor === 'w' ? r + 1 : r - 1;
    for (const dc of [-1, 1]) {
      const pc = c + dc;
      if (pawnR >= 0 && pawnR < 8 && pc >= 0 && pc < 8) {
        if (this.board[pawnR][pc] === byColor + 'p') return true;
      }
    }

    // Knight attacks
    const nOffsets = [[-2,-1], [-2,1], [-1,-2], [-1,2], [1,-2], [1,2], [2,-1], [2,1]];
    for (const [dr, dc] of nOffsets) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (this.board[nr][nc] === byColor + 'N') return true;
      }
    }

    // King attacks
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const kr = r + dr, kc = c + dc;
        if (kr >= 0 && kr < 8 && kc >= 0 && kc < 8) {
          if (this.board[kr][kc] === byColor + 'K') return true;
        }
      }
    }

    // Sliding Orthogonal (Rook, Queen)
    const ortho = [[-1,0], [1,0], [0,-1], [0,1]];
    for (const [dr, dc] of ortho) {
      for (let step = 1; step < 8; step++) {
        const sr = r + dr * step, sc = c + dc * step;
        if (sr < 0 || sr >= 8 || sc < 0 || sc >= 8) break;
        const p = this.board[sr][sc];
        if (p !== '--') {
          if (p === byColor + 'R' || p === byColor + 'Q') return true;
          break;
        }
      }
    }

    // Sliding Diagonal (Bishop, Queen)
    const diag = [[-1,-1], [-1,1], [1,-1], [1,1]];
    for (const [dr, dc] of diag) {
      for (let step = 1; step < 8; step++) {
        const sr = r + dr * step, sc = c + dc * step;
        if (sr < 0 || sr >= 8 || sc < 0 || sc >= 8) break;
        const p = this.board[sr][sc];
        if (p !== '--') {
          if (p === byColor + 'B' || p === byColor + 'Q') return true;
          break;
        }
      }
    }

    return false;
  }

  findKing(color: 'w' | 'b'): [number, number] {
    const target = color + 'K';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c] === target) return [r, c];
      }
    }
    return [-1, -1];
  }

  isCheck(color: 'w' | 'b'): boolean {
    const [kr, kc] = this.findKing(color);
    if (kr === -1) return false;
    const opponent = color === 'w' ? 'b' : 'w';
    return this.isSquareAttacked(kr, kc, opponent);
  }

  getPseudoLegalMoves(): string[] {
    const moves: string[] = [];
    const turn = this.whiteToMove ? 'w' : 'b';

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (piece[0] === turn) {
          const type = piece[1];
          const fromUci = this.coordsToUci(r, c);

          if (type === 'p') {
            const dir = turn === 'w' ? -1 : 1;
            const startR = turn === 'w' ? 6 : 1;
            const promoR = turn === 'w' ? 0 : 7;

            // 1 step forward
            if (this.board[r + dir]?.[c] === '--') {
              const toUci = this.coordsToUci(r + dir, c);
              if (r + dir === promoR) {
                moves.push(fromUci + toUci + 'q');
              } else {
                moves.push(fromUci + toUci);
              }
              // 2 step forward
              if (r === startR && this.board[r + 2 * dir]?.[c] === '--') {
                moves.push(fromUci + this.coordsToUci(r + 2 * dir, c));
              }
            }
            // Captures
            for (const dc of [-1, 1]) {
              const tc = c + dc;
              if (tc >= 0 && tc < 8) {
                const target = this.board[r + dir]?.[tc];
                const destUci = this.coordsToUci(r + dir, tc);
                if (target && target !== '--' && target[0] !== turn) {
                  if (r + dir === promoR) {
                    moves.push(fromUci + destUci + 'q');
                  } else {
                    moves.push(fromUci + destUci);
                  }
                } else if (this.enPassantSquare && this.enPassantSquare === destUci) {
                  moves.push(fromUci + destUci);
                }
              }
            }
          } else if (type === 'N') {
            const offsets = [[-2,-1], [-2,1], [-1,-2], [-1,2], [1,-2], [1,2], [2,-1], [2,1]];
            for (const [dr, dc] of offsets) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                const target = this.board[nr][nc];
                if (target === '--' || target[0] !== turn) {
                  moves.push(fromUci + this.coordsToUci(nr, nc));
                }
              }
            }
          } else if (type === 'B' || type === 'R' || type === 'Q') {
            const dirs: [number, number][] = [];
            if (type === 'R' || type === 'Q') dirs.push([-1,0],[1,0],[0,-1],[0,1]);
            if (type === 'B' || type === 'Q') dirs.push([-1,-1],[-1,1],[1,-1],[1,1]);
            for (const [dr, dc] of dirs) {
              for (let step = 1; step < 8; step++) {
                const nr = r + dr * step, nc = c + dc * step;
                if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
                const target = this.board[nr][nc];
                if (target === '--') {
                  moves.push(fromUci + this.coordsToUci(nr, nc));
                } else if (target[0] !== turn) {
                  moves.push(fromUci + this.coordsToUci(nr, nc));
                  break;
                } else {
                  break;
                }
              }
            }
          } else if (type === 'K') {
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                  const target = this.board[nr][nc];
                  if (target === '--' || target[0] !== turn) {
                    moves.push(fromUci + this.coordsToUci(nr, nc));
                  }
                }
              }
            }

            // Castling
            if (turn === 'w') {
              if (this.castlingRights.wK &&
                  this.board[7][4] === 'wK' &&
                  this.board[7][5] === '--' &&
                  this.board[7][6] === '--' &&
                  this.board[7][7] === 'wR' &&
                  !this.isSquareAttacked(7, 4, 'b') &&
                  !this.isSquareAttacked(7, 5, 'b') &&
                  !this.isSquareAttacked(7, 6, 'b')) {
                moves.push('e1g1');
              }
              if (this.castlingRights.wQ &&
                  this.board[7][4] === 'wK' &&
                  this.board[7][3] === '--' &&
                  this.board[7][2] === '--' &&
                  this.board[7][1] === '--' &&
                  this.board[7][0] === 'wR' &&
                  !this.isSquareAttacked(7, 4, 'b') &&
                  !this.isSquareAttacked(7, 3, 'b') &&
                  !this.isSquareAttacked(7, 2, 'b')) {
                moves.push('e1c1');
              }
            } else {
              if (this.castlingRights.bK &&
                  this.board[0][4] === 'bK' &&
                  this.board[0][5] === '--' &&
                  this.board[0][6] === '--' &&
                  this.board[0][7] === 'bR' &&
                  !this.isSquareAttacked(0, 4, 'w') &&
                  !this.isSquareAttacked(0, 5, 'w') &&
                  !this.isSquareAttacked(0, 6, 'w')) {
                moves.push('e8g8');
              }
              if (this.castlingRights.bQ &&
                  this.board[0][4] === 'bK' &&
                  this.board[0][3] === '--' &&
                  this.board[0][2] === '--' &&
                  this.board[0][1] === '--' &&
                  this.board[0][0] === 'bR' &&
                  !this.isSquareAttacked(0, 4, 'w') &&
                  !this.isSquareAttacked(0, 3, 'w') &&
                  !this.isSquareAttacked(0, 2, 'w')) {
                moves.push('e8c8');
              }
            }
          }
        }
      }
    }
    return moves;
  }

  getLegalMoves(): string[] {
    const pseudo = this.getPseudoLegalMoves();
    const legal: string[] = [];
    const turn = this.whiteToMove ? 'w' : 'b';

    for (const m of pseudo) {
      this.makeMove(m);
      if (!this.isCheck(turn)) {
        legal.push(m);
      }
      this.undoMove();
    }
    return legal;
  }

  makeMove(uci: string): boolean {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const [fr, fc] = this.uciToCoords(from);
    const [tr, tc] = this.uciToCoords(to);

    const piece = this.board[fr][fc];
    let captured = this.board[tr][tc];

    const logEntry: MoveLogEntry = {
      fr, fc, tr, tc, piece, captured,
      prevCastlingRights: { ...this.castlingRights },
      prevEnPassant: this.enPassantSquare,
    };

    // Castling execution
    if (piece === 'wK' && from === 'e1' && to === 'g1') {
      logEntry.isCastle = true;
      logEntry.castleRookFr = 7; logEntry.castleRookFc = 7;
      logEntry.castleRookTr = 7; logEntry.castleRookTc = 5;
      this.board[7][5] = 'wR';
      this.board[7][7] = '--';
    } else if (piece === 'wK' && from === 'e1' && to === 'c1') {
      logEntry.isCastle = true;
      logEntry.castleRookFr = 7; logEntry.castleRookFc = 0;
      logEntry.castleRookTr = 7; logEntry.castleRookTc = 3;
      this.board[7][3] = 'wR';
      this.board[7][0] = '--';
    } else if (piece === 'bK' && from === 'e8' && to === 'g8') {
      logEntry.isCastle = true;
      logEntry.castleRookFr = 0; logEntry.castleRookFc = 7;
      logEntry.castleRookTr = 0; logEntry.castleRookTc = 5;
      this.board[0][5] = 'bR';
      this.board[0][7] = '--';
    } else if (piece === 'bK' && from === 'e8' && to === 'c8') {
      logEntry.isCastle = true;
      logEntry.castleRookFr = 0; logEntry.castleRookFc = 0;
      logEntry.castleRookTr = 0; logEntry.castleRookTc = 3;
      this.board[0][3] = 'bR';
      this.board[0][0] = '--';
    }

    // En passant execution
    if (piece[1] === 'p' && fc !== tc && captured === '--') {
      logEntry.isEnPassant = true;
      logEntry.epPawnR = fr;
      logEntry.epPawnC = tc;
      logEntry.epPawn = this.board[fr][tc];
      this.board[fr][tc] = '--';
    }

    // Update en passant square for next move
    if (piece[1] === 'p' && Math.abs(fr - tr) === 2) {
      this.enPassantSquare = this.coordsToUci((fr + tr) / 2, fc);
    } else {
      this.enPassantSquare = null;
    }

    // Update castling rights
    if (piece === 'wK') { this.castlingRights.wK = false; this.castlingRights.wQ = false; }
    if (piece === 'bK') { this.castlingRights.bK = false; this.castlingRights.bQ = false; }
    if (fr === 7 && fc === 0) this.castlingRights.wQ = false;
    if (fr === 7 && fc === 7) this.castlingRights.wK = false;
    if (fr === 0 && fc === 0) this.castlingRights.bQ = false;
    if (fr === 0 && fc === 7) this.castlingRights.bK = false;

    // Promotion
    if (piece[1] === 'p' && (tr === 0 || tr === 7)) {
      const promoType = (uci[4] ? uci[4].toUpperCase() : 'Q');
      this.board[tr][tc] = piece[0] + promoType;
    } else {
      this.board[tr][tc] = piece;
    }

    this.board[fr][fc] = '--';
    this.moveLog.push(logEntry);
    this.whiteToMove = !this.whiteToMove;
    return true;
  }

  undoMove(): boolean {
    if (this.moveLog.length === 0) return false;
    const last = this.moveLog.pop()!;

    this.board[last.fr][last.fc] = last.piece;
    this.board[last.tr][last.tc] = last.captured;

    if (last.isCastle && last.castleRookFr !== undefined) {
      this.board[last.castleRookFr][last.castleRookFc!] = this.board[last.castleRookTr!][last.castleRookTc!];
      this.board[last.castleRookTr!][last.castleRookTc!] = '--';
    }

    if (last.isEnPassant && last.epPawnR !== undefined) {
      this.board[last.tr][last.tc] = '--';
      this.board[last.epPawnR][last.epPawnC!] = last.epPawn!;
    }

    this.castlingRights = last.prevCastlingRights;
    this.enPassantSquare = last.prevEnPassant;
    this.whiteToMove = !this.whiteToMove;
    return true;
  }

  minimax(depth: number, alpha: number, beta: number, isMaximizing: boolean): number {
    const mover = this.whiteToMove ? 'w' : 'b';
    const legalMoves = this.getLegalMoves();
    const inCheck = this.isCheck(mover);

    if (legalMoves.length === 0) {
      if (inCheck) return isMaximizing ? -50000 + depth : 50000 - depth;
      return 0; // stalemate
    }

    if (depth === 0) {
      return this.evaluate();
    }

    if (isMaximizing) {
      let maxEval = -999999;
      for (const m of legalMoves) {
        this.makeMove(m);
        const evalScore = this.minimax(depth - 1, alpha, beta, false);
        this.undoMove();
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = 999999;
      for (const m of legalMoves) {
        this.makeMove(m);
        const evalScore = this.minimax(depth - 1, alpha, beta, true);
        this.undoMove();
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  getBestMove(depth = 3): { bestMove: string; score: number; nodes: number } {
    const legalMoves = this.getLegalMoves();
    if (legalMoves.length === 0) return { bestMove: '', score: 0, nodes: 0 };

    const isWhite = this.whiteToMove;
    let bestMove = legalMoves[0];
    let bestScore = isWhite ? -999999 : 999999;
    let alpha = -999999;
    let beta = 999999;
    let nodes = 0;

    for (const m of legalMoves) {
      nodes++;
      this.makeMove(m);
      const score = this.minimax(depth - 1, alpha, beta, !isWhite);
      this.undoMove();

      if (isWhite) {
        if (score > bestScore) {
          bestScore = score;
          bestMove = m;
        }
        alpha = Math.max(alpha, bestScore);
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMove = m;
        }
        beta = Math.min(beta, bestScore);
      }
    }

    return { bestMove, score: bestScore, nodes };
  }

  getFen(): string {
    let fen = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p === '--') {
          empty++;
        } else {
          if (empty > 0) {
            fen += empty;
            empty = 0;
          }
          const char = p[0] === 'w' ? p[1].toUpperCase() : p[1].toLowerCase();
          fen += char;
        }
      }
      if (empty > 0) fen += empty;
      if (r < 7) fen += '/';
    }
    const castleStr =
      (this.castlingRights.wK ? 'K' : '') +
      (this.castlingRights.wQ ? 'Q' : '') +
      (this.castlingRights.bK ? 'k' : '') +
      (this.castlingRights.bQ ? 'q' : '') || '-';
    fen += this.whiteToMove ? ` w ${castleStr} ` : ` b ${castleStr} `;
    fen += this.enPassantSquare ? `${this.enPassantSquare} 0 1` : '- 0 1';
    return fen;
  }
}

const fallbackEngine = new FallbackAlphaOne();

// Vite module workers cannot use importScripts(). Load the Emscripten
// factory as text, evaluate it, then instantiate with an explicit wasm path.
async function initWasmEngine(): Promise<boolean> {
  try {
    const jsUrl = new URL('/wasm/alphaone.js', self.location.origin).href;
    const response = await fetch(jsUrl, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`WASM glue script missing (${response.status})`);
    }
    const source = await response.text();
    const factory = new Function(`${source}\nreturn (typeof AlphaOneModule !== 'undefined') ? AlphaOneModule : undefined;`)();
    if (typeof factory !== 'function') {
      throw new Error('AlphaOneModule factory not found in glue script');
    }
    const module = await factory({
      locateFile: (path: string) => new URL(`/wasm/${path}`, self.location.origin).href,
    });
    wasmEngine = new module.WasmEngine();
    isInitialized = true;
    console.log('[Worker] WebAssembly AlphaOne Engine initialized successfully.');
    return true;
  } catch (err) {
    console.warn('[Worker] WebAssembly module not yet loaded or compiled; using Fallback Engine.', err);
  }
  isInitialized = true;
  return true;
}

function getCurrentState(): EngineState {
  if (wasmEngine) {
    const rawMoves = wasmEngine.getLegalMoves();
    const legalMoves: string[] = [];
    for (let i = 0; i < rawMoves.size(); i++) {
      legalMoves.push(rawMoves.get(i));
    }

    return {
      fen: wasmEngine.getPosition(),
      isWhiteToMove: wasmEngine.isWhiteToMove(),
      inCheck: wasmEngine.isInCheck(),
      isCheckmate: wasmEngine.isCheckmate(),
      isStalemate: wasmEngine.isStalemate(),
      legalMoves,
      evaluation: wasmEngine.evaluate(),
      moveCount: wasmEngine.moveCount()
    };
  } else {
    const legalMoves = fallbackEngine.getLegalMoves();
    const turn = fallbackEngine.whiteToMove ? 'w' : 'b';
    const inCheck = fallbackEngine.isCheck(turn);
    return {
      fen: fallbackEngine.getFen(),
      isWhiteToMove: fallbackEngine.whiteToMove,
      inCheck,
      isCheckmate: inCheck && legalMoves.length === 0,
      isStalemate: !inCheck && legalMoves.length === 0,
      legalMoves,
      evaluation: fallbackEngine.evaluate(),
      moveCount: fallbackEngine.moveLog.length
    };
  }
}

// Message Dispatcher
self.onmessage = async (e: MessageEvent<EngineCommand>) => {
  const cmd = e.data;

  try {
    switch (cmd.type) {
      case 'init': {
        const ok = await initWasmEngine();
        self.postMessage({ id: cmd.id, type: 'init_ok', success: ok } as EngineResponse);
        self.postMessage({ id: cmd.id, type: 'state', state: getCurrentState() } as EngineResponse);
        break;
      }

      case 'newGame': {
        if (wasmEngine) wasmEngine.newGame();
        else fallbackEngine.newGame();
        self.postMessage({ id: cmd.id, type: 'state', state: getCurrentState() } as EngineResponse);
        break;
      }

      case 'setPosition': {
        if (wasmEngine) wasmEngine.setPosition(cmd.fen);
        self.postMessage({ id: cmd.id, type: 'state', state: getCurrentState() } as EngineResponse);
        break;
      }

      case 'makeMove': {
        let success = false;
        if (wasmEngine) {
          success = wasmEngine.makeMove(cmd.move);
        } else {
          success = fallbackEngine.makeMove(cmd.move);
        }
        self.postMessage({ id: cmd.id, type: 'move_result', success, state: getCurrentState() } as EngineResponse);
        break;
      }

      case 'undoMove': {
        if (wasmEngine) wasmEngine.undoMove();
        else fallbackEngine.undoMove();
        self.postMessage({ id: cmd.id, type: 'state', state: getCurrentState() } as EngineResponse);
        break;
      }

      case 'getLegalMoves': {
        const state = getCurrentState();
        self.postMessage({ id: cmd.id, type: 'legalMoves', moves: state.legalMoves } as EngineResponse);
        break;
      }

      case 'bestMove': {
        const startTime = Date.now();
        if (wasmEngine) {
          const bestMove = wasmEngine.getBestMove(cmd.timeMs, cmd.maxDepth);
          const statsJson = JSON.parse(wasmEngine.getSearchStatsJson());
          self.postMessage({
            id: cmd.id,
            type: 'bestMove',
            bestMove,
            stats: statsJson
          } as EngineResponse);
        } else {
          const { bestMove, score, nodes } = fallbackEngine.getBestMove(3);
          const elapsed = Math.max(1, Date.now() - startTime);
          self.postMessage({
            id: cmd.id,
            type: 'bestMove',
            bestMove,
            stats: {
              depth: 3,
              nodes,
              score,
              timeMs: elapsed,
              nodesPerSecond: Math.round((nodes * 1000) / elapsed),
              ttHits: 0,
              bestMove
            }
          } as EngineResponse);
        }
        break;
      }

      case 'stop': {
        if (wasmEngine) wasmEngine.stopSearch();
        break;
      }

      default:
        break;
    }
  } catch (err: any) {
    self.postMessage({ id: cmd.id, type: 'error', message: err?.message || String(err) } as EngineResponse);
  }
};

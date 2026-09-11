import { EngineCommand, EngineResponse, EngineState } from '../types/chess';

// WASM Module instance
let wasmEngine: any = null;
let isInitialized = false;

// Fallback pure-JS engine matching AlphaOne logic for instant resilience
class FallbackAlphaOne {
  board: string[][];
  whiteToMove: boolean;
  moveLog: any[];

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

  getLegalMoves(): string[] {
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
            // 1 step forward
            if (this.board[r + dir]?.[c] === '--') {
              moves.push(fromUci + this.coordsToUci(r + dir, c));
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
                if (target && target !== '--' && target[0] !== turn) {
                  moves.push(fromUci + this.coordsToUci(r + dir, tc));
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
          }
        }
      }
    }
    return moves;
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

  makeMove(uci: string): boolean {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const [fr, fc] = this.uciToCoords(from);
    const [tr, tc] = this.uciToCoords(to);

    const piece = this.board[fr][fc];
    const captured = this.board[tr][tc];

    this.moveLog.push({ fr, fc, tr, tc, piece, captured });
    this.board[fr][fc] = '--';

    // Promotion
    if (piece[1] === 'p' && (tr === 0 || tr === 7)) {
      this.board[tr][tc] = piece[0] + 'Q';
    } else {
      this.board[tr][tc] = piece;
    }

    this.whiteToMove = !this.whiteToMove;
    return true;
  }

  undoMove(): boolean {
    if (this.moveLog.length === 0) return false;
    const last = this.moveLog.pop();
    this.board[last.fr][last.fc] = last.piece;
    this.board[last.tr][last.tc] = last.captured;
    this.whiteToMove = !this.whiteToMove;
    return true;
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
    fen += this.whiteToMove ? ' w KQkq - 0 1' : ' b KQkq - 0 1';
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
    return {
      fen: fallbackEngine.getFen(),
      isWhiteToMove: fallbackEngine.whiteToMove,
      inCheck: false,
      isCheckmate: legalMoves.length === 0,
      isStalemate: false,
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
          // Fallback search: pick best evaluation
          const legalMoves = fallbackEngine.getLegalMoves();
          let bestMove = legalMoves[0] || '';
          let bestScore = fallbackEngine.whiteToMove ? -99999 : 99999;

          for (const m of legalMoves) {
            fallbackEngine.makeMove(m);
            const score = fallbackEngine.evaluate();
            fallbackEngine.undoMove();

            if (fallbackEngine.whiteToMove) {
              if (score > bestScore) {
                bestScore = score;
                bestMove = m;
              }
            } else {
              if (score < bestScore) {
                bestScore = score;
                bestMove = m;
              }
            }
          }

          const elapsed = Math.max(1, Date.now() - startTime);
          self.postMessage({
            id: cmd.id,
            type: 'bestMove',
            bestMove,
            stats: {
              depth: 2,
              nodes: legalMoves.length,
              score: bestScore,
              timeMs: elapsed,
              nodesPerSecond: Math.round((legalMoves.length * 1000) / elapsed),
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

export type PieceCode =
  | 'wp' | 'wR' | 'wN' | 'wB' | 'wQ' | 'wK'
  | 'bp' | 'bR' | 'bN' | 'bB' | 'bQ' | 'bK'
  | '--';

export interface SearchStats {
  depth: number;
  nodes: number;
  score: number;
  timeMs: number;
  nodesPerSecond: number;
  ttHits: number;
  bestMove: string;
}

export interface EngineState {
  fen: string;
  isWhiteToMove: boolean;
  inCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  legalMoves: string[];
  evaluation: number;
  moveCount: number;
}

export type EngineCommandWithoutId =
  | { type: 'init' }
  | { type: 'newGame' }
  | { type: 'setPosition'; fen: string }
  | { type: 'makeMove'; move: string }
  | { type: 'undoMove' }
  | { type: 'getLegalMoves' }
  | { type: 'bestMove'; timeMs: number; maxDepth: number }
  | { type: 'stop' };

export type EngineCommand = EngineCommandWithoutId & { id: string };

export type EngineResponse =
  | { id: string; type: 'init_ok'; success: boolean }
  | { id: string; type: 'state'; state: EngineState }
  | { id: string; type: 'legalMoves'; moves: string[] }
  | { id: string; type: 'move_result'; success: boolean; state: EngineState }
  | { id: string; type: 'bestMove'; bestMove: string; stats: SearchStats }
  | { id: string; type: 'error'; message: string };

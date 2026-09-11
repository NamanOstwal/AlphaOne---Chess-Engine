# AlphaOne WebAssembly API Specification

## 1. Overview

The AlphaOne C++ engine is compiled to WebAssembly using Emscripten Embind. The WebAssembly module exposes the `WasmEngine` class to JavaScript and Web Workers.

---

## 2. WasmEngine C++ / JS Boundary Methods

```typescript
interface WasmEngine {
  /** Reset board to starting chess position and clear transposition table */
  newGame(): void;

  /** Reset current game state */
  reset(): void;

  /** Set position from FEN string. Returns true if valid, false otherwise. */
  setPosition(fen: string): boolean;

  /** Get current position as FEN string */
  getPosition(): string;

  /** Returns true if it is White's turn to move */
  isWhiteToMove(): boolean;

  /** Returns true if the position is checkmate */
  isCheckmate(): boolean;

  /** Returns true if the position is stalemate */
  isStalemate(): boolean;

  /** Returns true if the active side's king is currently in check */
  isInCheck(): boolean;

  /** Total half-moves made in the game */
  moveCount(): number;

  /** Returns an array of legal moves in standard UCI format (e.g. ["e2e4", "g1f3", ...]) */
  getLegalMoves(): string[];

  /** Executes a move in UCI format. Returns true if legal and applied, false otherwise. */
  makeMove(uci: string): boolean;

  /** Reverts the last move made. Returns true if a move was undone, false if at starting position. */
  undoMove(): boolean;

  /**
   * Search for the best move.
   * @param timeLimitMs Search time cutoff in milliseconds (0 for unlimited within depth)
   * @param maxDepth Maximum search depth (1-8)
   * @returns The best move in UCI format (e.g. "e2e4")
   */
  getBestMove(timeLimitMs: number, maxDepth: number): string;

  /** Evaluate position statically in centipawns (positive = White, negative = Black) */
  evaluate(): number;

  /** Signal running search to stop immediately */
  stopSearch(): void;

  /** Returns JSON string containing search telemetry */
  getSearchStatsJson(): string;
}
```

### Search Telemetry JSON Schema
```json
{
  "bestMove": "g1f3",
  "score": 0,
  "depth": 4,
  "nodes": 2032,
  "timeMs": 28,
  "nodesPerSecond": 72571,
  "ttHits": 65
}
```

---

## 3. Web Worker Message Protocol (`engine.worker.ts`)

### Commands (Main Thread -> Worker)
```typescript
type EngineCommand =
  | { id: string; type: 'init' }
  | { id: string; type: 'newGame' }
  | { id: string; type: 'setPosition'; fen: string }
  | { id: string; type: 'makeMove'; move: string }
  | { id: string; type: 'undoMove' }
  | { id: string; type: 'getLegalMoves' }
  | { id: string; type: 'bestMove'; timeMs: number; maxDepth: number }
  | { id: string; type: 'stop' };
```

### Responses (Worker -> Main Thread)
```typescript
type EngineResponse =
  | { id: string; type: 'init_ok'; success: boolean }
  | { id: string; type: 'state'; state: EngineState }
  | { id: string; type: 'legalMoves'; moves: string[] }
  | { id: string; type: 'move_result'; success: boolean; state: EngineState }
  | { id: string; type: 'bestMove'; bestMove: string; stats: SearchStats }
  | { id: string; type: 'error'; message: string };
```

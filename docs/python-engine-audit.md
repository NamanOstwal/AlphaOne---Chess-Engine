# AlphaOne Chess Engine — Python Repository Audit & Migration Inventory

**Document Version:** 1.0  
**Audit Date:** 2026-09-11  
**Source Repository:** `https://github.com/NamanOstwal/AlphaOne---Chess-Engine`  
**Migration Branch:** `feature/cpp-wasm-migration`  

---

## 1. Executive Summary

This document provides a comprehensive technical audit of the original Python implementation of the AlphaOne Chess Engine. The original codebase contains a functional chess game logic, an alpha-beta minimax search AI with positional tables and a simple transposition cache, and a Pygame-based graphical user interface with multiprocessing for search offloading.

The primary objective of the migration is:
1. Port the complete chess rules, move generator, evaluation function, move ordering, and search algorithms to modern, high-performance C++ (C++17).
2. Completely decouple and eliminate Pygame and presentation concerns from the engine layer.
3. Introduce Zobrist hashing and an optimized Transposition Table.
4. Compile the engine to WebAssembly using Emscripten.
5. Create a modern browser frontend using React, TypeScript, and Vite, delegating engine searches to a Web Worker so the browser UI thread remains responsive at all times.

---

## 2. Inventory of Python Modules

The original repository contains the following files in `src/`:

| File | Size (Bytes) | Lines | Core Responsibility | Disposition in C++ / Web Migration |
| :--- | :--- | :--- | :--- | :--- |
| `chessengine.py` | 33,083 | 646 | Game state representation (`GameState`), board matrix, move execution (`makeMove`, `undoMove`), legal move generation, pin/check raycasting, castling, en passant, pawn promotion, and move notation (`Move`, `CastleRights`). | **Port to C++ Engine Core** (`src/engine/Board.*`, `Move.*`, `MoveGenerator.*`, `Types.*`). |
| `ChessAI.py` | 11,203 | 274 | AI move selection, material scores, piece-square positional tables, move ordering (`orderMoves`), Negamax search with alpha-beta pruning (`findMoveNegaMaxAlphaBeta`), transposition table cache (`findMoveNegaMaxAlphaBetaTT`), and board scoring (`scoreBoard`). | **Port to C++ Engine Core** (`src/engine/Evaluation.*`, `Search.*`, `TranspositionTable.*`). |
| `chessmain.py` | 8,779 | 210 | Main interactive loop, Pygame window initialization, square coordinate mapping, piece sprite loading, move animation (`animateMove`), event dispatch, and multiprocessing process dispatch. | **Remove completely from engine.** Replace presentation with React/TypeScript frontend and concurrency with Web Worker. |
| `HighlightArea.py`| 1,317 | 31 | Pygame alpha-surface rendering for highlighting selected squares and destination squares for legal moves. | **Remove completely from engine.** Replaced by CSS/SVG highlights in React frontend. |
| `MoveLog.py` | 1,679 | 46 | Pygame font rendering for move history panel and endgame announcements. | **Remove completely from engine.** Replaced by React `MoveLogPanel` component. |
| `test.py` | 10,356 | 266 | Commented-out experimental threading and search prototype code. | **Retain for reference.** Superseded by automated C++ unit tests. |

---

## 3. Detailed Subsystem Audit

### 3.1 Board Representation
- **Python Structure:** An 8x8 list of strings:
  ```python
  board = [
      ["bR", "bN", "bB", "bQ", "bK", "bB", "bN", "bR"],
      ["bp", "bp", "bp", "bp", "bp", "bp", "bp", "bp"],
      ["--", "--", "--", "--", "--", "--", "--", "--"],
      ["--", "--", "--", "--", "--", "--", "--", "--"],
      ["--", "--", "--", "--", "--", "--", "--", "--"],
      ["--", "--", "--", "--", "--", "--", "--", "--"],
      ["wp", "wp", "wp", "wp", "wp", "wp", "wp", "wp"],
      ["wR", "wN", "wB", "wQ", "wK", "wB", "wN", "wR"]
  ]
  ```
- **Coordinate Conventions:**
  - `row = 0` corresponds to rank 8 (Black back rank).
  - `row = 7` corresponds to rank 1 (White back rank).
  - `col = 0` corresponds to file `a`.
  - `col = 7` corresponds to file `h`.
  - Empty squares are represented by `"--"`.
- **C++ Mapping:**
  - Model as `std::array<Piece, 64>` with index `square = row * 8 + col`.
  - Provide helpers: `row = square / 8`, `col = square % 8`, `Square::fromRowCol(r, c)`.
  - Support conversions between FEN, Python 8x8 matrix format, and C++ array.

### 3.2 Piece Representation
- **Python Structure:** 2-character strings where the first character is color (`'w'` or `'b'`) and the second character is piece type (`'p'`, `'R'`, `'N'`, `'B'`, `'Q'`, `'K'`).
- **C++ Mapping:**
  - `enum class PieceType : uint8_t { None = 0, Pawn = 1, Knight = 2, Bishop = 3, Rook = 4, Queen = 5, King = 6 };`
  - `enum class Color : uint8_t { White = 0, Black = 1, None = 2 };`
  - `enum class Piece : uint8_t { Empty = 0, WhitePawn = 1, ... BlackKing = 14 };`

### 3.3 Move Representation
- **Python Structure:** Class `Move`:
  - `start_row, start_col, end_row, end_col`
  - `piece_moved`, `piece_captured`
  - `is_pawn_promotion`: `(piece_moved == 'wp' and end_row == 0) or (piece_moved == 'bp' and end_row == 7)`
  - `is_enpassant_move`: boolean
  - `is_castle_move`: boolean
  - `moveID`: integer `start_row * 1000 + start_col * 100 + end_row * 10 + end_col`
- **C++ Mapping:**
  - Compact `struct Move` occupying 16 or 32 bits:
    - 6 bits `from_square` (0..63)
    - 6 bits `to_square` (0..63)
    - 3 bits `promotion_piece` (None, Queen, Rook, Bishop, Knight)
    - 4 bits `flags` (Quiet, Capture, EnPassant, Castle, Promotion)
  - Zero heap allocation per move; fast bitwise comparison and UCI formatting (`e2e4`, `e7e8q`).

### 3.4 Legal Move Generation & Self-Check Prevention
- **Python Structure:**
  - `getValidMoves()`:
    1. Calls `checkForPinsAndChecks()` to determine `in_check`, `pins`, and `checks`.
    2. If `in_check`:
       - If `len(checks) == 1`: generates all moves, then restricts non-king moves to squares along the check line between checking piece and king (or capturing the piece).
       - If `len(checks) > 1` (double check): only king moves are permitted.
    3. If not `in_check`: generates all piece moves, and appends valid castling moves.
    4. Sets `checkmate = True` if `len(moves) == 0 and inCheck()`, or `stalemate = True` if `len(moves) == 0 and not inCheck()`.
- **C++ Mapping:**
  - Direct translation of pin & check ray-casting in `MoveGenerator.cpp`.
  - Ensures 100% identical legal move lists in every test position.

### 3.5 Special Moves: Castling, En Passant, Promotion
- **Castling:**
  - Managed via `CastleRights` (`wks`, `bks`, `wqs`, `bqs`).
  - King and rook movement or captures revoke corresponding castling rights in `updateCastleRights()`.
  - Kingside: checks transit squares `col + 1` and `col + 2` are empty and not attacked.
  - Queenside: checks `col - 1`, `col - 2`, `col - 3` empty and `col - 1`, `col - 2` not attacked.
- **En Passant:**
  - `enpassant_possible`: stores coordinates `((start_row + end_row)//2, start_col)` after 2-square pawn advance.
  - Reset to empty after any other move.
  - Captures opponent pawn on `(start_row, end_col)`.
  - Includes horizontal king exposure check when king is on the same rank as the capturing pawn.
- **Promotion:**
  - Triggers when pawn reaches row 0 (White) or row 7 (Black).
  - Existing Python AI automatically promotes to Queen (`move.piece_moved[0] + "Q"`).
  - C++ engine preserves Queen auto-promotion for Python behavioral parity while supporting full promotion choices (Rook, Bishop, Knight).

### 3.6 Make / Undo Move
- **Python Structure:**
  - Mutates `self.board`.
  - Logs state history in `move_log`, `enpassant_possible_log`, and `castle_rights_log`.
  - `undoMove()` pops the logs and restores board, king locations, rights, and en-passant square.
- **C++ Mapping:**
  - High-efficiency `Board::makeMove(const Move&)` and `Board::undoMove()` using an `UndoState` struct stack.
  - Avoids cloning board objects on recursion; modifies in-place and reverts.

### 3.7 Board Evaluation
- **Python Structure (`scoreBoard` in `ChessAI.py`):**
  - Material weights:
    ```python
    piece_score = {"K": 6000, "Q": 929, "R": 512, "B": 320, "N": 280, "p": 100}
    ```
  - Positional tables:
    - 8x8 tables for Pawn, Bishop, Rook, Queen, Knight.
    - White tables use matrix directly (`row 0` = rank 8, `row 7` = rank 1).
    - Black tables use vertically mirrored rows: `scores[::-1]`.
    - King positional score is 0.
  - Checkmate score: `+10000` (White win) or `-10000` (Black win).
  - Stalemate score: `0`.
- **C++ Mapping:**
  - Exact duplication of integer tables and mirroring logic in `Evaluation.hpp` and `Evaluation.cpp`.

### 3.8 Move Ordering
- **Python Strategy (`orderMoves` in `ChessAI.py`):**
  1. Capture moves: sorted descending by victim piece score (`piece_score[captured_piece]`).
  2. Quiet moves: sorted descending by positional value of destination square from `piece_position_scores`.
  3. Returns `capture_moves + quiet_moves`.
- **C++ Mapping:**
  - Preserved exactly in `MoveGenerator::orderMoves()` for behavioral parity.

### 3.9 Search Algorithm & Alpha-Beta Pruning
- **Python Implementation:**
  - Negamax with alpha-beta pruning (`findMoveNegaMaxAlphaBeta`).
  - Score multiplied by `turn_multiplier` (1 for White, -1 for Black).
  - Pruning triggered when `alpha >= beta`.
  - Fixed search depth: default `DEPTH = 4`.
- **C++ Mapping:**
  - Faithful Negamax alpha-beta implementation in `Search.cpp`.
  - Extended with iterative deepening (`depth = 1..maxDepth`) and time limit enforcement for WebAssembly execution.

### 3.10 Transposition Table & Hashing
- **Python Implementation:**
  - Simple dictionary `transposition_table = {}`.
  - Key: `str(board)`.
  - In `findMove()`: transposition table is cleared after each depth iteration.
- **C++ Mapping:**
  - Upgraded to 64-bit Zobrist Hashing (piece-square, side-to-move, castling rights, en-passant file).
  - Configurable `TranspositionTable` with depth, score, node bounds (`Exact`, `LowerBound`, `UpperBound`), and best move.

### 3.11 Concurrency & Multiprocessing
- **Python Implementation:**
  - Uses `multiprocessing.Process` with a `Queue` in `chessmain.py` so the Pygame frame loop does not freeze while `findBestMove()` executes.
- **C++ / Web Mapping:**
  - Python multiprocessing is not applicable to WebAssembly.
  - WebAssembly engine runs in a browser **Web Worker** (`engine.worker.ts`).
  - Search runs asynchronously off the main UI thread with search cancellation support (`stopSearch()`).

### 3.12 Pygame Presentation Layer (To Be Removed)
- `chessmain.py` handles Pygame event polling (`MOUSEBUTTONDOWN`, `KEYDOWN`), frame ticks (`clock.tick(MAX_FPS)`), image scaling (`p.transform.scale`), and piece animation (`animateMove`).
- `HighlightArea.py` draws square overlays with 100 alpha transparency.
- `MoveLog.py` renders text surfaces for chess notation.
- **Disposition:** Replaced completely by modern React components with SVG piece rendering, dynamic CSS animations, and instant responsive controls.

---

## 4. Migration Parity Checklist

| Verification Item | Acceptance Criteria |
| :--- | :--- |
| **Initial Board Score** | `evaluate(initialBoard) == 0` (Exact match with Python `scoreBoard`) |
| **Initial Legal Moves** | Exactly 20 valid moves matching Python `getValidMoves()` |
| **Perft Node Counts** | Perft Depth 1: 20, Depth 2: 400, Depth 3: 8902, Depth 4: 197281, Depth 5: 4865609 |
| **Special Move Rules** | Kingside/queenside castling, en passant, promotion verified across test positions |
| **Evaluation Parity** | `evaluate(pos) == scoreBoard(pos)` across 25+ test positions |
| **Search Decision Parity** | `searchBestMove(depth=4)` selects identical move as Python `findBestMove()` |
| **WASM Build** | `alphaone.js` and `alphaone.wasm` load cleanly in Node.js and browser |
| **UI Non-blocking** | UI maintains 60 FPS while engine calculates at depth 5+ in Web Worker |

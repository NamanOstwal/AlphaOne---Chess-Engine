# AlphaOne Chess Engine — Architecture & Design

## 1. System Overview

The AlphaOne Chess Engine migration replaces an interpreted Python desktop application with a high-performance modern C++ engine compiled to WebAssembly, paired with an interactive, responsive React/TypeScript browser frontend.

```
+-------------------------------------------------------------+
|                      Browser Frontend                       |
|               (React + TypeScript + Vite)                   |
|                                                             |
|  [ Interactive Board ]  [ Evaluation Gauge ]  [ Move Log ]  |
|                 \              |             /              |
|                  v             v            v               |
|                       EngineService.ts                      |
+------------------------------+------------------------------+
                               |
                   postMessage / onmessage
                               |
                               v
+-------------------------------------------------------------+
|                    Web Worker Thread                        |
|                  (engine.worker.ts)                         |
|                                                             |
|  - Manages asynchronous search execution                    |
|  - Guarantees zero UI thread blocking                       |
|  - Listens for immediate cancellation signals               |
+------------------------------+------------------------------+
                               |
                        Emscripten Bridge
                     (WasmBindings.cpp / embind)
                               |
                               v
+-------------------------------------------------------------+
|                C++17 Engine Core (WASM / Native)            |
|                                                             |
|  +---------------+    +----------------+    +------------+  |
|  |     Board     |--->| Move Generator |--->| Evaluation |  |
|  +---------------+    +----------------+    +------------+  |
|          ^                     |                  ^         |
|          |                     v                  |         |
|          |            +----------------+          |         |
|          +------------|     Search     |----------+         |
|                       | (Alpha-Beta)   |                    |
|                       +----------------+                    |
|                                ^                            |
|                                v                            |
|                       +----------------+                    |
|                       | Transposition  |                    |
|                       |  Table (Zobrist|                    |
|                       +----------------+                    |
+-------------------------------------------------------------+
```

---

## 2. State-Transition Graph Interpretation

AlphaOne conceptualizes chess as a directed state-transition graph:
- **State (Node):** A unique board position consisting of piece placements, side to move, castling rights, and en-passant square.
- **Transition (Edge):** A legal move transitioning from position $S$ to position $S'$.

### Implicit Traversal
Rather than allocating and materializing the game tree physically in memory (which would rapidly exhaust RAM), the engine implicitly traverses the graph:
1. `Board::makeMove(move)` executes state transition $S \to S'$.
2. `Search::negamax(...)` evaluates children recursively.
3. `Board::undoMove()` rolls back $S' \to S$ using an in-place reversible `UndoState` stack.

### Transposition Table as a State Graph Cache
Because different move sequences can arrive at the identical board state (e.g. `1. e4 e5 2. Nf3 Nc6` vs `1. Nf3 Nc6 2. e4 e5`), the **Transposition Table** caches graph states using 64-bit deterministic **Zobrist Hashing**. Revisiting an equivalent position at equal or deeper search depth reuses the evaluated score without re-exploring the subtree.

---

## 3. Core Engine Components

### 3.1 Board & Piece Representation (`src/engine/Board.*`, `Types.*`)
- 64-element array: `std::array<Piece, 64>`
- Square coordinates: `row * 8 + col`
- Reversible `makeMove()` / `undoMove()` updates board state, king positions, castling rights, and incremental Zobrist hashes with zero heap allocations during search.

### 3.2 Move Representation (`src/engine/Move.*`)
- Compact struct containing `from` (6 bits), `to` (6 bits), `flags` (Capture, EnPassant, Castle, Promotion), `piece_moved`, and `piece_captured`.
- UCI conversion (`e2e4`, `e7e8q`) and Python notation compatibility.

### 3.3 Legal Move Generator (`src/engine/MoveGenerator.*`)
- Pin and check detection via 8-ray king casting and knight jumps.
- Strict self-check prevention:
  - Single check: filters candidate moves to those that capture the attacker or block along the check ray.
  - Double check: forces king evasions.
- Move Ordering:
  - Transposition table best move
  - High-value victim captures (`piece_score`)
  - Positional quiet moves (`piece_position_scores`)

### 3.4 Evaluation Function (`src/engine/Evaluation.*`)
- Exact preservation of original Python weights:
  - `King`: 6000, `Queen`: 929, `Rook`: 512, `Bishop`: 320, `Knight`: 280, `Pawn`: 100
  - Positional tables for Pawn, Knight, Bishop, Rook, Queen with vertical reflection for Black.
  - Checkmate: `+10000` / `-10000`, Stalemate: `0`.

### 3.5 Search Algorithm (`src/engine/Search.*`)
- Negamax search with alpha-beta pruning.
- Iterative deepening from depth 1 up to target depth / time limit.
- Atomic stop flag checked periodically for instantaneous search cancellation.

---

## 4. WebAssembly & Web Worker Architecture

1. **Emscripten Export (`WasmBindings.cpp`):**
   Compiled with `-O3`, `-s MODULARIZE=1`, `-s ALLOW_MEMORY_GROWTH=1`, `--bind`. Exposes a clean, minimal API (`WasmEngine`).
2. **Worker Concurrency (`engine.worker.ts`):**
   Heavy engine search occurs entirely inside the Web Worker. The browser UI thread remains completely unblocked, allowing smooth 60 FPS rendering, drag-and-drop piece movement, and immediate response to user input.

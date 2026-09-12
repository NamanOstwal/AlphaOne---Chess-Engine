import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chessboard } from './components/Chessboard';
import { EvaluationBar } from './components/EvaluationBar';
import { EngineStats } from './components/EngineStats';
import { MoveLogPanel } from './components/MoveLogPanel';
import { GameControls } from './components/GameControls';
import { CapturedPieces } from './components/CapturedPieces';
import { engineService } from './services/EngineService';
import { EngineState, SearchStats } from './types/chess';

/* ====================================================================
   Player Panel
   ==================================================================== */
interface PlayerPanelProps {
  name: string;
  isWhite: boolean;
  isActiveTurn: boolean;
  isThinkingTurn: boolean;
  fen: string;
}

const PlayerPanel: React.FC<PlayerPanelProps> = ({
  name, isWhite, isActiveTurn, isThinkingTurn, fen,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '9px 14px',
      borderRadius: 10,
      background: 'var(--bg-elevated)',
      border: `1.5px solid ${isActiveTurn ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
      boxShadow: isActiveTurn ? '0 0 16px rgba(88,101,242,0.12)' : 'none',
      transition: 'all 0.2s ease',
      width: '100%',
    }}
  >
    <div
      style={{
        width: 36, height: 36, borderRadius: 9, flexShrink: 0,
        background: isWhite ? '#f5f5f5' : '#1c1c1c',
        border: '2px solid #769656',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}
    >
      {isWhite ? '♔' : '♚'}
    </div>

    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
          {name}
        </span>
        {isActiveTurn && (
          <span style={{
            fontSize: 10, fontWeight: 700,
            padding: '2px 8px', borderRadius: 99,
            background: 'rgba(88,101,242,0.15)',
            border: '1px solid rgba(88,101,242,0.3)',
            color: 'var(--accent-primary)',
            letterSpacing: '0.04em',
          }}>
            {isThinkingTurn ? '🤖 Thinking…' : 'YOUR TURN'}
          </span>
        )}
      </div>
      <CapturedPieces fen={fen} />
    </div>

    {isActiveTurn && (
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: 'var(--accent-primary)', flexShrink: 0,
        animation: 'pulse-ring 1.6s ease-out infinite',
      }} />
    )}
  </div>
);

/* ====================================================================
   Main App
   ==================================================================== */
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const INITIAL_LEGAL_MOVES = [
  'a2a3', 'a2a4', 'b2b3', 'b2b4', 'c2c3', 'c2c4', 'd2d3', 'd2d4',
  'e2e3', 'e2e4', 'f2f3', 'f2f4', 'g2g3', 'g2g4', 'h2h3', 'h2h4',
  'b1a3', 'b1c3', 'g1f3', 'g1h3',
];

export const App: React.FC = () => {
  const [engineState, setEngineState] = useState<EngineState>({
    fen: INITIAL_FEN,
    isWhiteToMove: true,
    inCheck: false,
    isCheckmate: false,
    isStalemate: false,
    legalMoves: INITIAL_LEGAL_MOVES,
    evaluation: 0,
    moveCount: 0,
  });

  const [movesHistory, setMovesHistory] = useState<string[]>([]);
  const [lastMove,     setLastMove]     = useState<string | null>(null);
  const [isThinking,   setIsThinking]   = useState(false);
  const [stats,        setStats]        = useState<SearchStats | null>(null);
  const [isFlipped,    setIsFlipped]    = useState(false);
  const [playerColor,  setPlayerColor]  = useState<'white' | 'black' | 'both' | 'ai'>('white');
  const [searchDepth,  setSearchDepth]  = useState(4);
  const [engineReady,  setEngineReady]  = useState(true);

  const stateRef    = useRef(engineState);
  stateRef.current  = engineState;
  const thinkingRef = useRef(isThinking);
  thinkingRef.current = isThinking;

  /* ── Engine initialisation ── */
  useEffect(() => {
    engineService.onStateChange((newState) => {
      setEngineState(newState);
      setEngineReady(true);
    });

    engineService.getLegalMoves().then((moves) => {
      if (moves && moves.length > 0) {
        setEngineState((prev) => ({ ...prev, legalMoves: moves }));
      }
      setEngineReady(true);
    }).catch(() => {});
  }, []);

  /* ── AI move trigger ── */
  const triggerAiMove = useCallback(async () => {
    if (thinkingRef.current) return;
    const s = stateRef.current;
    if (s.isCheckmate || s.isStalemate) return;

    setIsThinking(true);
    try {
      const res = await engineService.getBestMove(2000, searchDepth);
      if (res.bestMove) {
        setStats(res.stats);
        setLastMove(res.bestMove);
        setMovesHistory((prev) => [...prev, res.bestMove]);
        await engineService.makeMove(res.bestMove);
      }
    } catch (err) {
      console.error('AI move failed:', err);
    } finally {
      setIsThinking(false);
    }
  }, [searchDepth]);

  /* ── Turn management ── */
  useEffect(() => {
    if (isThinking) return;
    if (engineState.isCheckmate || engineState.isStalemate) return;
    if (engineState.legalMoves.length === 0) return; // not ready yet

    const isAiTurn =
      (playerColor === 'white' && !engineState.isWhiteToMove) ||
      (playerColor === 'black' &&  engineState.isWhiteToMove) ||
      playerColor === 'ai';

    if (!isAiTurn) return;

    const delay = playerColor === 'ai' ? 500 : 200;
    const t = setTimeout(triggerAiMove, delay);
    return () => clearTimeout(t);
  }, [
    engineState.isWhiteToMove, engineState.legalMoves.length,
    engineState.isCheckmate, engineState.isStalemate,
    playerColor, isThinking, triggerAiMove,
  ]);

  /* ── Human move ── */
  const handleMakeMove = async (uci: string) => {
    if (isThinking) return;
    setLastMove(uci);
    setMovesHistory((prev) => [...prev, uci]);
    const res = await engineService.makeMove(uci);
    if (!res.success) {
      // Illegal move — revert
      setMovesHistory((prev) => prev.slice(0, -1));
      setLastMove(movesHistory[movesHistory.length - 1] ?? null);
    }
  };

  /* ── New Game ── */
  const handleNewGame = async () => {
    engineService.stopSearch();
    setIsThinking(false);
    setLastMove(null);
    setMovesHistory([]);
    setStats(null);
    try {
      const s = await engineService.newGame();
      setEngineState(s);
    } catch (_) {}
  };

  /* ── Undo ── */
  const handleUndo = async () => {
    if (movesHistory.length === 0 || isThinking) return;
    engineService.stopSearch();
    setIsThinking(false);

    const undoCount = (playerColor === 'white' || playerColor === 'black') ? 2 : 1;
    const actualUndo = Math.min(undoCount, movesHistory.length);

    for (let i = 0; i < actualUndo; i++) {
      await engineService.undoMove();
    }
    setMovesHistory((prev) => prev.slice(0, -actualUndo));
    setLastMove(null);
  };

  /* ── Player colour change ── */
  const handlePlayerColorChange = (mode: 'white' | 'black' | 'both' | 'ai') => {
    setPlayerColor(mode);
    setIsFlipped(mode === 'black');
  };

  /* ── Derived values ── */
  const bottomIsWhite = !isFlipped;

  const isHumanDisabled =
    isThinking ||
    !engineReady ||
    (playerColor === 'white' && !engineState.isWhiteToMove) ||
    (playerColor === 'black' &&  engineState.isWhiteToMove) ||
    playerColor === 'ai';

  const bottomPlayerName =
    playerColor === 'white' ? 'You (White)' :
    playerColor === 'black' ? 'You (Black)' :
    playerColor === 'ai'    ? 'AlphaOne AI' :
    bottomIsWhite ? 'White' : 'Black';

  const topPlayerName =
    playerColor === 'white' ? 'AlphaOne AI' :
    playerColor === 'black' ? 'AlphaOne AI' :
    playerColor === 'ai'    ? 'AlphaOne AI' :
    bottomIsWhite ? 'Black' : 'White';

  const bottomActive = engineState.isWhiteToMove === bottomIsWhite;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', height: 60,
        background: 'rgba(13,15,20,0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-subtle)',
        position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg, #5865f2, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, boxShadow: '0 4px 14px rgba(88,101,242,0.4)',
          }}>
            ♛
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{
                fontSize: 17, fontWeight: 800, letterSpacing: '-0.03em',
                background: 'linear-gradient(90deg, #fff 0%, #94a3b8 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>AlphaOne</span>
              <span style={{
                fontSize: 10, fontWeight: 700, color: 'var(--accent-primary)',
                background: 'rgba(88,101,242,0.12)',
                border: '1px solid rgba(88,101,242,0.25)',
                padding: '1px 7px', borderRadius: 99, letterSpacing: '0.04em',
              }}>WASM</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              C++17 Chess Engine
            </div>
          </div>
        </div>

        {/* Move counter */}
        {movesHistory.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>Move</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
              {Math.ceil(movesHistory.length / 2)}
            </span>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: engineState.isWhiteToMove ? '#f0f0f0' : '#222',
              border: '1.5px solid rgba(255,255,255,0.25)',
            }} />
          </div>
        )}

        {/* Engine status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isThinking && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, fontSize: 12,
              color: 'var(--accent-cyan)',
              background: 'rgba(34,211,238,0.08)',
              border: '1px solid rgba(34,211,238,0.2)',
              padding: '5px 12px', borderRadius: 99,
            }}>
              <div className="spinner" style={{ borderTopColor: 'var(--accent-cyan)' }} />
              AI thinking…
            </div>
          )}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
            color: engineReady ? 'var(--accent-emerald)' : 'var(--text-dim)',
            background: engineReady ? 'rgba(16,185,129,0.08)' : 'transparent',
            border: `1px solid ${engineReady ? 'rgba(16,185,129,0.2)' : 'var(--border-subtle)'}`,
            padding: '5px 12px', borderRadius: 99, transition: 'all 0.3s',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: engineReady ? 'var(--accent-emerald)' : 'var(--text-dim)',
            }} />
            {engineReady ? 'Engine Ready' : 'Loading…'}
          </div>
        </div>
      </header>

      {/* ═══════════════════════ MAIN ═══════════════════════ */}
      <main style={{
        flex: 1, display: 'flex', justifyContent: 'center',
        padding: '24px 20px 32px', gap: 20, alignItems: 'flex-start',
      }}>
        {/* ── Board column ── */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexShrink: 0 }}>
          {/* Eval bar */}
          <EvaluationBar score={engineState.evaluation} isWhiteBottom={!isFlipped} />

          {/* Player panels + board */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <PlayerPanel
              name={topPlayerName}
              isWhite={isFlipped}
              isActiveTurn={engineState.isWhiteToMove === isFlipped}
              isThinkingTurn={isThinking && engineState.isWhiteToMove === isFlipped}
              fen={engineState.fen}
            />

            <Chessboard
              fen={engineState.fen}
              isFlipped={isFlipped}
              legalMoves={engineState.legalMoves}
              lastMove={lastMove}
              inCheck={engineState.inCheck}
              isWhiteToMove={engineState.isWhiteToMove}
              onMakeMove={handleMakeMove}
              disabled={isHumanDisabled}
            />

            <PlayerPanel
              name={bottomPlayerName}
              isWhite={bottomIsWhite}
              isActiveTurn={bottomActive}
              isThinkingTurn={isThinking && bottomActive}
              fen={engineState.fen}
            />

            {/* Game result banners */}
            {engineState.isCheckmate && (
              <div className="game-result-banner banner-checkmate animate-scale-in">
                ♚ Checkmate! {engineState.isWhiteToMove ? 'Black' : 'White'} wins.
              </div>
            )}
            {engineState.isStalemate && (
              <div className="game-result-banner banner-stalemate animate-scale-in">
                ½ Stalemate — Draw.
              </div>
            )}
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 14,
          width: 285, flexShrink: 0, minHeight: 0,
        }}>
          <EngineStats stats={stats} isThinking={isThinking} />

          <GameControls
            onNewGame={handleNewGame}
            onUndo={handleUndo}
            onFlipBoard={() => setIsFlipped((p) => !p)}
            isThinking={isThinking}
            onStopSearch={() => {
              engineService.stopSearch();
              setIsThinking(false);
            }}
            depth={searchDepth}
            onDepthChange={setSearchDepth}
            playerColor={playerColor}
            onPlayerColorChange={handlePlayerColorChange}
            moveCount={movesHistory.length}
          />

          <div style={{ flex: 1, minHeight: 220, display: 'flex', flexDirection: 'column' }}>
            <MoveLogPanel moves={movesHistory} />
          </div>
        </div>
      </main>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer style={{
        padding: '12px 28px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: 11, color: 'var(--text-dim)',
        background: 'rgba(13,15,20,0.5)', flexShrink: 0,
      }}>
        <span>AlphaOne — C++17 compiled to WebAssembly</span>
        <div style={{ display: 'flex', gap: 12 }}>
          {['Alpha-Beta', 'Zobrist Hashing', 'Transposition Table', 'Move Ordering'].map((f, i, arr) => (
            <React.Fragment key={f}>
              <span>{f}</span>
              {i < arr.length - 1 && <span style={{ opacity: 0.3 }}>·</span>}
            </React.Fragment>
          ))}
        </div>
      </footer>
    </div>
  );
};

export default App;

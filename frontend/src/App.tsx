import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chessboard } from './components/Chessboard';
import { EvaluationBar } from './components/EvaluationBar';
import { EngineStats } from './components/EngineStats';
import { MoveLogPanel } from './components/MoveLogPanel';
import { GameControls } from './components/GameControls';
import { CapturedPieces } from './components/CapturedPieces';
import { engineService } from './services/EngineService';
import { EngineState, SearchStats } from './types/chess';
import { Bot, ShieldCheck } from 'lucide-react';

export const App: React.FC = () => {
  const [engineState, setEngineState] = useState<EngineState>({
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    isWhiteToMove: true,
    inCheck: false,
    isCheckmate: false,
    isStalemate: false,
    legalMoves: [],
    evaluation: 0,
    moveCount: 0,
  });

  const [movesHistory, setMovesHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<string | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [stats, setStats] = useState<SearchStats | null>(null);

  const [isFlipped, setIsFlipped] = useState(false);
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | 'both' | 'ai'>('white');
  const [searchDepth, setSearchDepth] = useState<number>(4);

  // Keep ref to avoid stale state in AI loops
  const stateRef = useRef(engineState);
  stateRef.current = engineState;

  const thinkingRef = useRef(isThinking);
  thinkingRef.current = isThinking;

  // Initialize and register state change listener
  useEffect(() => {
    engineService.onStateChange((newState) => {
      setEngineState(newState);
    });

    engineService.getLegalMoves().then((moves) => {
      setEngineState((prev) => ({ ...prev, legalMoves: moves }));
    });

    return () => {
      engineService.terminate();
    };
  }, []);

  // Trigger AI Move
  const triggerAiMove = useCallback(async () => {
    if (thinkingRef.current) return;
    const currentState = stateRef.current;
    if (currentState.isCheckmate || currentState.isStalemate) return;

    setIsThinking(true);
    try {
      // 1000ms maximum time limit, user configured search depth
      const res = await engineService.getBestMove(1200, searchDepth);
      if (res.bestMove) {
        setStats(res.stats);
        setLastMove(res.bestMove);
        setMovesHistory((prev) => [...prev, res.bestMove]);
        await engineService.makeMove(res.bestMove);
      }
    } catch (err) {
      console.error('Failed to get best move from engine:', err);
    } finally {
      setIsThinking(false);
    }
  }, [searchDepth]);

  // Turn management: Check if AI should move
  useEffect(() => {
    if (isThinking) return;
    if (engineState.isCheckmate || engineState.isStalemate) return;

    const isAiTurn =
      (playerColor === 'white' && !engineState.isWhiteToMove) ||
      (playerColor === 'black' && engineState.isWhiteToMove) ||
      playerColor === 'ai';

    if (isAiTurn) {
      const timer = setTimeout(() => {
        triggerAiMove();
      }, playerColor === 'ai' ? 400 : 150);
      return () => clearTimeout(timer);
    }
  }, [engineState.isWhiteToMove, playerColor, engineState.isCheckmate, engineState.isStalemate, isThinking, triggerAiMove]);

  // Handle human move on the chessboard
  const handleMakeMove = async (uci: string) => {
    if (isThinking) return;

    setLastMove(uci);
    setMovesHistory((prev) => [...prev, uci]);

    const res = await engineService.makeMove(uci);
    if (!res.success) {
      // Revert if invalid
      setMovesHistory((prev) => prev.slice(0, -1));
    }
  };

  const handleNewGame = async () => {
    engineService.stopSearch();
    setIsThinking(false);
    setLastMove(null);
    setMovesHistory([]);
    setStats(null);
    const newState = await engineService.newGame();
    setEngineState(newState);
  };

  const handleUndo = async () => {
    if (movesHistory.length === 0 || isThinking) return;
    engineService.stopSearch();
    setIsThinking(false);

    // If playing against AI, undo both the AI move and player's move
    if (playerColor === 'white' || playerColor === 'black') {
      await engineService.undoMove();
      if (movesHistory.length >= 2) {
        await engineService.undoMove();
        setMovesHistory((prev) => prev.slice(0, -2));
      } else {
        setMovesHistory((prev) => prev.slice(0, -1));
      }
    } else {
      await engineService.undoMove();
      setMovesHistory((prev) => prev.slice(0, -1));
    }
    setLastMove(null);
  };

  const handlePlayerColorChange = (mode: 'white' | 'black' | 'both' | 'ai') => {
    setPlayerColor(mode);
    if (mode === 'black') {
      setIsFlipped(true);
    } else if (mode === 'white') {
      setIsFlipped(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          width: 'min(1200px, 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          padding: '16px 24px',
          borderRadius: '16px',
          background: 'rgba(18, 23, 34, 0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-glass)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(0, 242, 254, 0.35)',
            }}
          >
            <Bot size={24} color="#040914" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.5px' }}>AlphaOne</h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--accent-cyan)',
                  backgroundColor: 'rgba(0, 242, 254, 0.12)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 242, 254, 0.25)',
                }}
              >
                v1.0 WASM
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>C++17 Engine Compiled to WebAssembly</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              background: 'rgba(255,255,255,0.04)',
              padding: '6px 12px',
              borderRadius: '20px',
              border: '1px solid var(--border-glass)',
            }}
          >
            <ShieldCheck size={14} color="#10b981" />
            <span>Web Worker Thread</span>
          </div>
        </div>
      </header>

      {/* Main Chess Arena Grid */}
      <main
        style={{
          width: 'min(1200px, 100%)',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left Arena: Evaluation Bar + Chessboard */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <EvaluationBar score={engineState.evaluation} isWhiteBottom={!isFlipped} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <CapturedPieces fen={engineState.fen} />

            <Chessboard
              fen={engineState.fen}
              isFlipped={isFlipped}
              legalMoves={engineState.legalMoves}
              lastMove={lastMove}
              inCheck={engineState.inCheck}
              isWhiteToMove={engineState.isWhiteToMove}
              onMakeMove={handleMakeMove}
              disabled={isThinking || (playerColor === 'white' && !engineState.isWhiteToMove) || (playerColor === 'black' && engineState.isWhiteToMove) || playerColor === 'ai'}
            />

            {/* Game Status Banner */}
            {engineState.isCheckmate && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(255, 65, 108, 0.2)',
                  border: '1px solid var(--accent-red)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '14px',
                  textAlign: 'center',
                }}
              >
                Checkmate! {engineState.isWhiteToMove ? 'Black' : 'White'} wins the game!
              </div>
            )}
            {engineState.isStalemate && (
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(245, 166, 35, 0.2)',
                  border: '1px solid var(--accent-gold)',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '14px',
                  textAlign: 'center',
                }}
              >
                Stalemate! The game ends in a draw.
              </div>
            )}
          </div>
        </div>

        {/* Right Dashboard: Engine Stats + Controls + Move Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <EngineStats stats={stats} isThinking={isThinking} />

          <GameControls
            onNewGame={handleNewGame}
            onUndo={handleUndo}
            onFlipBoard={() => setIsFlipped((prev) => !prev)}
            isThinking={isThinking}
            onStopSearch={() => engineService.stopSearch()}
            depth={searchDepth}
            onDepthChange={setSearchDepth}
            playerColor={playerColor}
            onPlayerColorChange={handlePlayerColorChange}
            moveCount={movesHistory.length}
          />

          <MoveLogPanel moves={movesHistory} />
        </div>
      </main>
    </div>
  );
};

export default App;

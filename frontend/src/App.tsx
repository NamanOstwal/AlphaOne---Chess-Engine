import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chessboard } from './components/Chessboard';
import { EvaluationBar } from './components/EvaluationBar';
import { EngineStats } from './components/EngineStats';
import { MoveLogPanel } from './components/MoveLogPanel';
import { GameControls } from './components/GameControls';
import { CapturedPieces } from './components/CapturedPieces';
import { RobotHero } from './components/RobotHero';
import { engineService } from './services/EngineService';
import { EngineState, SearchStats } from './types/chess';
import { toggleSound, playMoveSound } from './utils/audio';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Cpu,
  Zap,
  Shield,
  Layers,
  Sparkles,
  Terminal,
  Activity,
  Award,
  ChevronDown,
  ArrowRight,
} from 'lucide-react';

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
  const [soundActive,  setSoundActive]  = useState(true);

  const stateRef    = useRef(engineState);
  stateRef.current  = engineState;
  const thinkingRef = useRef(isThinking);
  thinkingRef.current = isThinking;

  useEffect(() => {
    engineService.onStateChange((s) => {
      setEngineState(s);
    });

    engineService.getLegalMoves().then((moves) => {
      setEngineState((prev) => ({
        ...prev,
        legalMoves: moves && moves.length > 0 ? moves : prev.legalMoves,
      }));
    });

    return () => {
      engineService.terminate();
    };
  }, []);

  // AI Move Execution with sound feedback
  const triggerAiMove = useCallback(async () => {
    if (thinkingRef.current) return;
    const cur = stateRef.current;
    if (cur.isCheckmate || cur.isStalemate) return;

    setIsThinking(true);
    try {
      const res = await engineService.getBestMove(2500, searchDepth);
      if (res.bestMove) {
        setStats(res.stats);
        setLastMove(res.bestMove);
        setMovesHistory((prev) => [...prev, res.bestMove]);

        // Play audio for AI move
        playMoveSound(false, cur.inCheck);

        await engineService.makeMove(res.bestMove);
      }
    } catch (err) {
      console.error('[AI] Search failed:', err);
    } finally {
      setIsThinking(false);
    }
  }, [searchDepth]);

  // Turn management
  useEffect(() => {
    if (isThinking) return;
    if (engineState.isCheckmate || engineState.isStalemate) return;

    const isAiTurn =
      (playerColor === 'white' && !engineState.isWhiteToMove) ||
      (playerColor === 'black' &&  engineState.isWhiteToMove) ||
      playerColor === 'ai';

    if (isAiTurn) {
      const delay = playerColor === 'ai' ? 450 : 250;
      const t = setTimeout(() => triggerAiMove(), delay);
      return () => clearTimeout(t);
    }
  }, [
    engineState.isWhiteToMove,
    playerColor,
    engineState.isCheckmate,
    engineState.isStalemate,
    isThinking,
    triggerAiMove,
  ]);

  // Human Move Execution
  const handleMakeMove = useCallback(async (uci: string) => {
    if (isThinking) return;

    setLastMove(uci);
    setMovesHistory((prev) => [...prev, uci]);

    const res = await engineService.makeMove(uci);
    if (!res.success) {
      setMovesHistory((prev) => prev.slice(0, -1));
    }
  }, [isThinking]);

  const handleNewGame = useCallback(async () => {
    engineService.stopSearch();
    setIsThinking(false);
    setLastMove(null);
    setMovesHistory([]);
    setStats(null);
    const newState = await engineService.newGame();
    setEngineState(newState);
  }, []);

  const handleUndo = useCallback(async () => {
    if (movesHistory.length === 0 || isThinking) return;
    engineService.stopSearch();
    setIsThinking(false);

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
  }, [movesHistory.length, isThinking, playerColor]);

  const handleSoundToggle = () => {
    const updated = toggleSound();
    setSoundActive(updated);
  };

  const scrollToArena = () => {
    const arena = document.getElementById('arena-section');
    arena?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToCapabilities = () => {
    const cap = document.getElementById('capabilities-section');
    cap?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-studio-dark)', color: '#fff' }}>
      {/* ====================================================================
          1. TOP NAVIGATION BAR (Locomotive Agency Minimalist)
          ==================================================================== */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '22px 36px',
          background: 'linear-gradient(to bottom, rgba(10,11,14,0.75) 0%, rgba(10,11,14,0) 100%)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: '-0.03em',
              color: '#0e0f13',
              mixBlendMode: 'difference',
            }}
          >
            AlphaOne®
          </span>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: '#888',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            C++17 / WASM
          </span>
        </div>

        {/* Center Minimal Geometric Brand Mark */}
        <div
          style={{
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0e0f13',
            mixBlendMode: 'difference',
            cursor: 'pointer',
          }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="AlphaOne"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 0 0 18v-18z" fill="currentColor" />
          </svg>
        </div>

        {/* Right Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <button
            onClick={scrollToCapabilities}
            style={{
              background: 'none',
              border: 'none',
              color: '#111',
              fontFamily: 'var(--font-sans)',
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              cursor: 'pointer',
              mixBlendMode: 'difference',
            }}
          >
            Capabilities
          </button>
          <button onClick={scrollToArena} className="loco-pill">
            <span>Play Engine</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* ====================================================================
          2. HERO SECTION (Locomotive Lisa Inspired 3D Studio)
          ==================================================================== */}
      <section
        id="hero-section"
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          minHeight: 700,
          display: 'flex',
          alignItems: 'center',
          background: 'radial-gradient(ellipse at 50% 36%, #eaebee 0%, #c8c9ce 45%, #97989f 100%)',
          overflow: 'hidden',
          padding: '0 48px',
        }}
      >
        {/* Studio Lighting Vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 90%, rgba(0,0,0,0.35) 0%, transparent 65%)',
            pointerEvents: 'none',
          }}
        />

        {/* Left Column: Typography & Interactive Badges */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: 620,
            display: 'flex',
            flexDirection: 'column',
            gap: 22,
            paddingBottom: 40,
          }}
        >
          {/* Greeting Eyebrow */}
          <div>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                color: '#50525b',
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              Hi there, I am AlphaOne,
              <br />
              Locomotive-inspired low latency chess intelligence.
            </p>
          </div>

          {/* Main Title (Corrected Spelling & Formatting) */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 3.4vw, 46px)',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.035em',
              color: '#0e0f13',
            }}
          >
            AlphaOne — Low Latency Chess Engine developed using C++ with ELO ~1500.
            <span className="blinking-cursor">▌</span>
          </h1>

          {/* Interactive Capability Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
            <button onClick={scrollToArena} className="loco-pill">
              <Sparkles size={13} />
              Launch Arena
            </button>
            <button onClick={scrollToCapabilities} className="loco-pill">
              <Zap size={13} />
              1,000,000+ NPS
            </button>
            <button onClick={scrollToCapabilities} className="loco-pill">
              <Cpu size={13} />
              WebAssembly Core
            </button>
            <button onClick={scrollToCapabilities} className="loco-pill">
              <Activity size={13} />
              Sub-5ms Latency
            </button>
            <button onClick={scrollToCapabilities} className="loco-pill">
              <Layers size={13} />
              Zobrist TT Cache
            </button>
          </div>
        </div>

        {/* Right Column / Center: 3D Robot Head with Human Body */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: 'clamp(550px, 60vw, 920px)',
            height: '100%',
            pointerEvents: 'auto',
          }}
        >
          <RobotHero />
        </div>

        {/* Bottom Left: Reset / Interactive Hint */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            left: 48,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            onClick={() => window.location.reload()}
            title="Reload Experience"
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              backgroundColor: '#0e0f13',
              color: '#fff',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'rotate(-90deg) scale(1.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'rotate(0deg) scale(1)')}
          >
            <RotateCcw size={15} />
          </button>

          <span
            style={{
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: '#383a42',
              fontWeight: 500,
            }}
          >
            Hover anywhere to tilt & observe head tracking
          </span>
        </div>

        {/* Bottom Right: Audio Toggle Pill */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            right: 48,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <button
            onClick={handleSoundToggle}
            title={soundActive ? 'Mute Audio Effects' : 'Enable Tactile Audio Effects'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 9999,
              backgroundColor: '#0e0f13',
              color: '#fff',
              border: 'none',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              transition: 'all 0.2s ease',
            }}
          >
            {soundActive ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{soundActive ? 'Audio: ON' : 'Audio: MUTE'}</span>
          </button>
        </div>

        {/* Scroll Cue Indicator */}
        <div
          onClick={scrollToCapabilities}
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            opacity: 0.8,
            transition: 'opacity 0.2s ease',
          }}
        >
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#25262c', fontWeight: 600 }}>
            SCROLL TO EXPLORE
          </span>
          <ChevronDown size={16} color="#25262c" className="pulse-soft" />
        </div>
      </section>

      {/* ====================================================================
          3. CAPABILITIES & ARCHITECTURE SECTION
          ==================================================================== */}
      <section
        id="capabilities-section"
        style={{
          padding: '120px 48px 100px',
          maxWidth: 1280,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 60,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span
            style={{
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
              color: '#8b8e99',
              letterSpacing: '0.12em',
            }}
          >
            01 / ARCHITECTURE & METRICS
          </span>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(26px, 3.2vw, 44px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: '#f4f4f7',
              maxWidth: 750,
            }}
          >
            High-Performance C++17 Core Compiled to WebAssembly
          </h2>
          <p style={{ fontSize: 15, color: '#888b96', maxWidth: 640, lineHeight: 1.6 }}>
            AlphaOne completely removes legacy Python and Pygame runtimes in favor of bitboard move generation,
            iterative deepening alpha-beta pruning, and Zobrist transposition memoization.
          </p>
        </div>

        {/* Bento Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 20,
          }}
        >
          <div className="studio-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Zap size={18} color="#fff" />
              </div>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#8b8e99' }}>THROUGHPUT</span>
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
              1,000,000+ NPS
            </h3>
            <p style={{ fontSize: 13, color: '#9da0aa', lineHeight: 1.6 }}>
              Inner search loops run with zero dynamic heap allocations. Bitboard state caching and raycasting enable
              sub-millisecond evaluation across millions of board transitions.
            </p>
          </div>

          <div className="studio-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Activity size={18} color="#fff" />
              </div>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#8b8e99' }}>LATENCY</span>
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
              Sub-5ms Tactical Replies
            </h3>
            <p style={{ fontSize: 13, color: '#9da0aa', lineHeight: 1.6 }}>
              Moves are calculated locally in your browser's dedicated Web Worker thread. Zero server hops or API roundtrips
              provide instantaneous tactical response.
            </p>
          </div>

          <div className="studio-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Award size={18} color="#fff" />
              </div>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#8b8e99' }}>RATING</span>
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
              ELO ~1500 Positional Search
            </h3>
            <p style={{ fontSize: 13, color: '#9da0aa', lineHeight: 1.6 }}>
              Utilizes piece-square positional tables, pin and check raycasting, center control heuristics, and iterative
              deepening Negamax search up to depth 6.
            </p>
          </div>

          <div className="studio-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Layers size={18} color="#fff" />
              </div>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#8b8e99' }}>CACHE</span>
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
              64-bit Zobrist Memoization
            </h3>
            <p style={{ fontSize: 13, color: '#9da0aa', lineHeight: 1.6 }}>
              Depth-aware transposition table with exact, lower-bound, and upper-bound pruning cutoffs prevents redundant
              branch recalculation in deep tactical lines.
            </p>
          </div>

          <div className="studio-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Shield size={18} color="#fff" />
              </div>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#8b8e99' }}>CLIENT-SIDE</span>
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
              100% Offline WebAssembly
            </h3>
            <p style={{ fontSize: 13, color: '#9da0aa', lineHeight: 1.6 }}>
              Compiled with Emscripten using -O3 optimization flags. No backend servers, no analytics beacons, and no telemetry
              overhead. Runs directly in any modern browser.
            </p>
          </div>

          <div className="studio-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Terminal size={18} color="#fff" />
              </div>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#8b8e99' }}>CROSS-PLATFORM</span>
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>
              Standalone Native CLI
            </h3>
            <p style={{ fontSize: 13, color: '#9da0aa', lineHeight: 1.6 }}>
              The C++ engine also compiles to a native standalone executable (`alphaone_cli.exe`) for terminal-based benchmarking,
              UCI interaction, and headless testing.
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================================
          4. THE ACTUAL PRODUCT / THE CHESS ARENA SECTION
          ==================================================================== */}
      <section
        id="arena-section"
        style={{
          padding: '80px 36px 140px',
          maxWidth: 1320,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 36,
        }}
      >
        {/* Section Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <span
              style={{
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: '#8b8e99',
                letterSpacing: '0.12em',
              }}
            >
              02 / THE ARENA
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(28px, 3.4vw, 42px)',
                fontWeight: 700,
                letterSpacing: '-0.03em',
                color: '#fff',
                marginTop: 6,
              }}
            >
              Play Against AlphaOne
            </h2>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleNewGame} className="loco-pill-dark">
              <RotateCcw size={14} />
              Reset Game
            </button>
            <button onClick={() => setIsFlipped((prev) => !prev)} className="loco-pill-dark">
              Flip Board
            </button>
          </div>
        </div>

        {/* Main Chess Arena Grid (Balanced 2-Column Boxing) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.15fr) minmax(360px, 0.85fr)',
            gap: 28,
            alignItems: 'start',
          }}
        >
          {/* Left Column: Board Container Box */}
          <div
            className="card"
            style={{
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              backgroundColor: 'var(--bg-card)',
            }}
          >
            {/* Top Opponent Player Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: '#1d1f26',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}
                >
                  🤖
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {playerColor === 'black' ? 'You (Black)' : 'AlphaOne AI'}
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {playerColor === 'black' ? 'Human Player' : `Depth ${searchDepth} (ELO ~1500)`}
                  </div>
                </div>
              </div>
              <CapturedPieces fen={engineState.fen} />
            </div>

            {/* Board + Integrated Evaluation Bar */}
            <div
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'stretch',
                justifyContent: 'center',
              }}
            >
              <EvaluationBar score={engineState.evaluation} isWhiteBottom={!isFlipped} />
              <Chessboard
                fen={engineState.fen}
                isFlipped={isFlipped}
                legalMoves={engineState.legalMoves}
                lastMove={lastMove}
                inCheck={engineState.inCheck}
                isWhiteToMove={engineState.isWhiteToMove}
                onMakeMove={handleMakeMove}
                disabled={
                  isThinking ||
                  (playerColor === 'white' && !engineState.isWhiteToMove) ||
                  (playerColor === 'black' &&  engineState.isWhiteToMove) ||
                  playerColor === 'ai'
                }
              />
            </div>

            {/* Bottom Player Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: '#f2f3f5',
                    color: '#111',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}
                >
                  👤
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    {playerColor === 'black' ? 'AlphaOne AI' : 'You (White)'}
                  </div>
                  <div style={{ fontSize: 11, color: '#888' }}>
                    {engineState.isWhiteToMove ? 'Active Turn' : 'Waiting'}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#888' }}>
                Move #{movesHistory.length}
              </div>
            </div>

            {/* Game Alerts */}
            {engineState.isCheckmate && (
              <div
                style={{
                  padding: '12px 18px',
                  borderRadius: 10,
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                Checkmate! {engineState.isWhiteToMove ? 'Black' : 'White'} wins the game!
              </div>
            )}
            {engineState.isStalemate && (
              <div
                style={{
                  padding: '12px 18px',
                  borderRadius: 10,
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                Stalemate! Draw by lack of legal moves.
              </div>
            )}
          </div>

          {/* Right Column: Engine Console Boxes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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
              onPlayerColorChange={setPlayerColor}
              moveCount={movesHistory.length}
            />

            <MoveLogPanel moves={movesHistory} />
          </div>
        </div>
      </section>

      {/* ====================================================================
          5. FOOTER
          ==================================================================== */}
      <footer
        style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '40px 48px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
          color: '#777a84',
          fontSize: 13,
        }}
      >
        <div>
          <span style={{ fontWeight: 700, color: '#d1d4dc' }}>AlphaOne Chess Engine</span>
          {' — '}
          Modern C++17 ported to WebAssembly
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <span>100% Client-Side Compute</span>
          <span>Zero Server Latency</span>
          <span>Zero Pygame Dependency</span>
        </div>
      </footer>
    </div>
  );
};

export default App;

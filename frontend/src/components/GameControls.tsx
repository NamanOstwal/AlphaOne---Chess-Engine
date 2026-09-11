import React from 'react';
import { RotateCcw, Undo2, ArrowLeftRight, Play, Square, Sliders } from 'lucide-react';

interface GameControlsProps {
  onNewGame: () => void;
  onUndo: () => void;
  onFlipBoard: () => void;
  isThinking: boolean;
  onStopSearch: () => void;
  depth: number;
  onDepthChange: (depth: number) => void;
  playerColor: 'white' | 'black' | 'both' | 'ai';
  onPlayerColorChange: (color: 'white' | 'black' | 'both' | 'ai') => void;
  moveCount: number;
}

export const GameControls: React.FC<GameControlsProps> = ({
  onNewGame,
  onUndo,
  onFlipBoard,
  isThinking,
  onStopSearch,
  depth,
  onDepthChange,
  playerColor,
  onPlayerColorChange,
  moveCount,
}) => {
  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, fontSize: '15px' }}>Game Controls</span>
        {isThinking && (
          <button onClick={onStopSearch} className="btn-secondary" style={{ color: 'var(--accent-red)', borderColor: 'var(--accent-red)', padding: '6px 12px' }}>
            <Square size={14} fill="currentColor" />
            <span>Stop AI</span>
          </button>
        )}
      </div>

      {/* Main action buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        <button onClick={onNewGame} className="btn-primary" style={{ justifyContent: 'center' }} disabled={isThinking}>
          <RotateCcw size={16} />
          <span>New Game</span>
        </button>

        <button onClick={onUndo} className="btn-secondary" style={{ justifyContent: 'center' }} disabled={moveCount === 0 || isThinking}>
          <Undo2 size={16} />
          <span>Undo</span>
        </button>

        <button onClick={onFlipBoard} className="btn-secondary" style={{ justifyContent: 'center' }}>
          <ArrowLeftRight size={16} />
          <span>Flip</span>
        </button>
      </div>

      {/* Game Mode / Player Color Selector */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>PLAY AS</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
          {(['white', 'black', 'both', 'ai'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onPlayerColorChange(mode)}
              disabled={isThinking}
              style={{
                padding: '8px 4px',
                borderRadius: '8px',
                border: playerColor === mode ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                backgroundColor: playerColor === mode ? 'rgba(0, 242, 254, 0.15)' : 'var(--bg-tertiary)',
                color: playerColor === mode ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '12px',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease'
              }}
            >
              {mode === 'ai' ? 'AI vs AI' : mode === 'both' ? 'Pass & Play' : mode}
            </button>
          ))}
        </div>
      </div>

      {/* Engine Depth Slider */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
            <Sliders size={13} />
            <span>AI SEARCH DEPTH</span>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
            Depth {depth}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="6"
          step="1"
          value={depth}
          onChange={(e) => onDepthChange(parseInt(e.target.value, 10))}
          disabled={isThinking}
          style={{
            width: '100%',
            accentColor: 'var(--accent-cyan)',
            cursor: isThinking ? 'not-allowed' : 'pointer',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
          <span>Fast (Depth 1)</span>
          <span>Standard (Depth 4)</span>
          <span>Master (Depth 6)</span>
        </div>
      </div>
    </div>
  );
};

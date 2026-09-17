import React from 'react';
import {
  RotateCcw, Undo2, ArrowLeftRight, StopCircle, Sliders, User, Bot, Users, Swords,
  LucideIcon,
} from 'lucide-react';

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

const MODES: {
  id: 'white' | 'black' | 'both' | 'ai';
  label: string;
  sublabel: string;
  Icon: LucideIcon;
}[] = [
  { id: 'white', label: 'White', sublabel: 'vs AI',    Icon: User  },
  { id: 'black', label: 'Black', sublabel: 'vs AI',    Icon: User  },
  { id: 'both',  label: 'Local', sublabel: '2 Players', Icon: Users },
  { id: 'ai',    label: 'AI',    sublabel: 'vs AI',    Icon: Swords },
];

const DEPTH_LABELS: Record<number, string> = {
  1: 'Novice',
  2: 'Easy',
  3: 'Medium',
  4: 'Strong',
  5: 'Expert',
  6: 'Master',
};

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
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="card-header">
        <div className="card-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="3" /><path d="M3 12h1m16 0h1M12 3v1m0 16v1M5.6 5.6l.7.7m11.4-.7-.7.7M5.6 18.4l.7-.7m11.4.7-.7-.7"/>
          </svg>
          Game Controls
        </div>
        {isThinking && (
          <button className="btn btn-danger btn-sm" onClick={onStopSearch}>
            <StopCircle size={13} />
            Stop AI
          </button>
        )}
      </div>

      <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Action row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <button className="btn btn-primary" onClick={onNewGame} disabled={isThinking}>
            <RotateCcw size={14} />
            New Game
          </button>
          <button
            className="btn btn-ghost"
            onClick={onUndo}
            disabled={moveCount === 0 || isThinking}
          >
            <Undo2 size={14} />
            Undo
          </button>
          <button className="btn btn-ghost" onClick={onFlipBoard}>
            <ArrowLeftRight size={14} />
            Flip
          </button>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-subtle)' }} />

        {/* Play mode */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--text-dim)',
          }}>
            Play As
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {MODES.map(({ id, label, sublabel, Icon }) => (
              <button
                key={id}
                className={`mode-btn${playerColor === id ? ' active' : ''}`}
                onClick={() => onPlayerColorChange(id)}
                disabled={isThinking}
              >
                <Icon size={16} strokeWidth={2} />
                <span style={{ fontSize: 11, fontWeight: 700 }}>{label}</span>
                <span style={{ fontSize: 9.5, color: 'inherit', opacity: 0.7 }}>{sublabel}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-subtle)' }} />

        {/* Depth slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.1em', color: 'var(--text-dim)' }}>
              <Sliders size={12} />
              AI Strength
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 11,
                color: 'var(--text-muted)', fontWeight: 600,
              }}>
                D{depth}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: 'var(--accent-primary)',
                background: 'rgba(88,101,242,0.12)',
                padding: '2px 8px', borderRadius: 99,
                border: '1px solid rgba(88,101,242,0.2)',
              }}>
                {DEPTH_LABELS[depth]}
              </span>
            </div>
          </div>

          <input
            type="range"
            min={1}
            max={6}
            step={1}
            value={depth}
            onChange={(e) => onDepthChange(parseInt(e.target.value, 10))}
            disabled={isThinking}
            style={{
              background: `linear-gradient(to right, var(--accent-primary) ${((depth - 1) / 5) * 100}%, var(--bg-hover) ${((depth - 1) / 5) * 100}%)`,
            }}
          />

          {/* Depth markers */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {[1, 2, 3, 4, 5, 6].map((d) => (
              <span
                key={d}
                onClick={() => !isThinking && onDepthChange(d)}
                style={{
                  fontSize: 10,
                  color: depth === d ? 'var(--accent-primary)' : 'var(--text-dim)',
                  fontWeight: depth === d ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

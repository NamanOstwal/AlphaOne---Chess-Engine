import React, { useEffect, useRef } from 'react';
import { Copy, Check, ScrollText } from 'lucide-react';

interface MoveLogPanelProps {
  moves: string[];
}

export const MoveLogPanel: React.FC<MoveLogPanelProps> = ({ moves }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves]);

  const movePairs = React.useMemo(() => {
    const pairs: { turn: number; white: string; black?: string }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({ turn: Math.floor(i / 2) + 1, white: moves[i], black: moves[i + 1] });
    }
    return pairs;
  }, [moves]);

  const handleCopy = () => {
    const text = movePairs.map((p) => `${p.turn}. ${p.white} ${p.black || ''}`.trim()).join(' ');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isLatestPair = (idx: number) => idx === movePairs.length - 1;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* Header */}
      <div className="card-header">
        <div className="card-title">
          <ScrollText size={13} />
          Move History
          {moves.length > 0 && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 99,
              padding: '1px 7px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              {moves.length}
            </span>
          )}
        </div>
        <button
          onClick={handleCopy}
          disabled={moves.length === 0}
          style={{
            background: 'none',
            border: 'none',
            color: copied ? 'var(--accent-emerald)' : 'var(--text-dim)',
            cursor: moves.length === 0 ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            fontWeight: 600,
            transition: 'color 0.15s',
            padding: '4px 8px',
            borderRadius: 6,
          }}
          title="Copy UCI moves"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Column headers */}
      {movePairs.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '28px 1fr 1fr',
          padding: '5px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-dim)',
        }}>
          <span>#</span>
          <span>White</span>
          <span>Black</span>
        </div>
      )}

      {/* Move list */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {movePairs.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            height: '100%',
            minHeight: 80,
            color: 'var(--text-dim)',
            fontSize: 13,
          }}>
            <span style={{ fontSize: 28 }}>♟</span>
            <span>No moves yet</span>
          </div>
        ) : (
          movePairs.map((pair, idx) => (
            <div
              key={pair.turn}
              className={`move-row${isLatestPair(idx) ? ' latest' : ''}`}
            >
              <span className="move-num">{pair.turn}.</span>
              <span className="move-white">{pair.white}</span>
              <span className="move-black">{pair.black ?? ''}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

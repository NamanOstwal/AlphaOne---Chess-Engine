import React, { useEffect, useRef } from 'react';
import { ScrollText, Copy, Check } from 'lucide-react';

interface MoveLogPanelProps {
  moves: string[]; // list of UCI moves made so far
}

export const MoveLogPanel: React.FC<MoveLogPanelProps> = ({ moves }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves]);

  // Group moves into pairs (White, Black)
  const movePairs = React.useMemo(() => {
    const pairs: { turn: number; white: string; black?: string }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      pairs.push({
        turn: Math.floor(i / 2) + 1,
        white: moves[i],
        black: moves[i + 1],
      });
    }
    return pairs;
  }, [moves]);

  const handleCopy = () => {
    const text = movePairs
      .map((p) => `${p.turn}. ${p.white} ${p.black || ''}`.trim())
      .join(' ');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '240px', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ScrollText size={16} color="var(--accent-cyan)" />
          <span style={{ fontWeight: 700, fontSize: '14px' }}>Move History</span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({moves.length})</span>
        </div>
        <button
          onClick={handleCopy}
          disabled={moves.length === 0}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: moves.length === 0 ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
          }}
          title="Copy Move Log"
        >
          {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          paddingRight: '4px',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
        }}
      >
        {movePairs.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px', fontStyle: 'italic' }}>
            No moves played yet.
          </div>
        ) : (
          movePairs.map((pair) => (
            <div
              key={pair.turn}
              style={{
                display: 'grid',
                gridTemplateColumns: '40px 1fr 1fr',
                padding: '4px 8px',
                borderRadius: '6px',
                backgroundColor: pair.turn % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>{pair.turn}.</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pair.white}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{pair.black || ''}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
